import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Stamps the permanent VAT snapshot onto Assessment records that predate the
// snapshot feature. Records that already carry a snapshot are never touched.
// dry_run=true (default) reports what would happen without writing anything.
// target_email optionally restricts the run (dry or real) to a single owner.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { dry_run = true, target_email = null } = await req.json();
    const svc = base44.asServiceRole;

    // Owner settings lookup by email. List is sorted newest-first, so first
    // match wins — a duplicate settings record resolves to the newest, not
    // the oldest (newest-wins, not last-wins).
    const settingsList = await svc.entities.UserSetting.list('-created_date', 1000);
    const settingsByEmail = new Map();
    for (const s of settingsList) {
      if (!settingsByEmail.has(s.user_email)) settingsByEmail.set(s.user_email, s);
    }

    const all = await svc.entities.Assessment.list('-created_date', 1000);
    if (all.length === 1000) {
      return Response.json({
        error: 'More than 1000 assessments exist — pagination support is required before running the backfill.'
      }, { status: 500 });
    }

    const byStatus = {};
    const byOwner = {};
    const toStamp = [];
    let alreadySnapshotted = 0;
    let missingSettings = 0;

    for (const a of all) {
      const owner = a.creator_email || a.created_by || null;
      if (target_email && owner !== target_email) continue;

      if (a.vat_snapshot && typeof a.vat_snapshot.is_vat_registered === 'boolean') {
        alreadySnapshotted++;
        continue;
      }

      const s = owner ? settingsByEmail.get(owner) : null;
      if (!s) missingSettings++;
      const snapshot = {
        is_vat_registered: !!(s && s.is_vat_registered),
        tax_rate: s && s.tax_rate != null ? s.tax_rate : 20
      };

      toStamp.push({ id: a.id, snapshot, record: a, owner });
      const statusKey = a.status || 'unknown';
      byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;
      if (owner) {
        const o = byOwner[owner] || { records: 0, vat_registered_records: 0 };
        o.records++;
        if (snapshot.is_vat_registered) o.vat_registered_records++;
        byOwner[owner] = o;
      }
    }

    if (dry_run) {
      return Response.json({
        success: true,
        dry_run: true,
        target_email,
        total_assessments_scanned: all.length,
        would_stamp: toStamp.length,
        already_snapshotted: alreadySnapshotted,
        missing_settings_records: missingSettings,
        by_status: byStatus,
        by_owner: byOwner,
        sample: toStamp.slice(0, 5).map(r => ({ id: r.id, snapshot: r.snapshot }))
      });
    }

    // Real run. Records are grouped by owner so each owner's snapshot is
    // recomputed from a FRESH settings read taken immediately before that
    // owner's records are written (no start-of-run value is reused). Bulk
    // update first; per-record fallback for legacy records holding non-string
    // vehicles[].estimated_time_hours values that fail schema validation on
    // write — coerce them (null omitted, numbers stringified; semantic
    // no-op) and retry individually. After writing, a verification pass
    // independently re-reads the owner's setting and every written record and
    // reports any mismatch between stored and expected snapshot.
    const sanitizeVehicles = (a) => (a.vehicles || []).map(v => {
      if (v.estimated_time_hours == null) {
        const c = { ...v };
        delete c.estimated_time_hours;
        return c;
      }
      return { ...v, estimated_time_hours: String(v.estimated_time_hours) };
    });

    const sleep = (ms) => new Promise(res => setTimeout(res, ms));
    const isRateLimit = (msg) => /rate limit/i.test(msg || '');

    // Throttled write: retries rate limits with backoff, then falls back to a
    // schema-coerced payload (legacy vehicles[].estimated_time_hours types).
    const stampRecord = async (r) => {
      const payloads = [{ vat_snapshot: r.snapshot }];
      // Coerced fallback: legacy non-string vehicles[].estimated_time_hours AND
      // top-level estimated_time_hours values fail schema validation on write —
      // null omitted, numbers stringified (semantic no-op).
      const fallback = { vat_snapshot: r.snapshot };
      if (r.record.vehicles) fallback.vehicles = sanitizeVehicles(r.record);
      if (r.record.estimated_time_hours != null && typeof r.record.estimated_time_hours !== 'string') {
        fallback.estimated_time_hours = String(r.record.estimated_time_hours);
      }
      payloads.push(fallback);

      let lastError = null;
      for (const payload of payloads) {
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            await svc.entities.Assessment.update(r.id, payload);
            return { ok: true, coerced: payload.vehicles !== undefined };
          } catch (e) {
            lastError = e.message;
            if (isRateLimit(e.message)) {
              await sleep(3000);
              continue;
            }
            break; // non-rate-limit error → try next payload
          }
        }
      }
      return { ok: false, error: lastError };
    };

    // Fresh settings read for one owner, newest-wins on duplicates.
    const freshSettingFor = async (owner) => {
      if (!owner) return null;
      const res = await svc.entities.UserSetting.filter({ user_email: owner }, '-created_date', 10);
      return res && res.length ? res[0] : null;
    };
    const snapshotFromSetting = (s) => ({
      is_vat_registered: !!(s && s.is_vat_registered),
      tax_rate: s && s.tax_rate != null ? s.tax_rate : 20
    });

    const groups = {};
    for (const r of toStamp) (groups[r.owner] = groups[r.owner] || []).push(r);

    let stamped = 0;
    let coercedRecords = 0;
    const failures = [];
    const failedIds = new Set();
    const verification = [];
    const mismatches = [];

    for (const owner of Object.keys(groups)) {
      const recs = groups[owner];

      // Per-owner write-time confirmation: re-read this owner's setting fresh
      // and recompute the snapshot seconds before writing.
      const snapshot = snapshotFromSetting(await freshSettingFor(owner));
      for (const r of recs) r.snapshot = snapshot;

      try {
        await svc.entities.Assessment.bulkUpdate(recs.map(r => ({ id: r.id, vat_snapshot: snapshot })));
        stamped += recs.length;
      } catch (e) {
        for (const r of recs) {
          const outcome = await stampRecord(r);
          if (outcome.ok) {
            stamped++;
            if (outcome.coerced) coercedRecords++;
          } else {
            failedIds.add(r.id);
            failures.push({ id: r.id, error: outcome.error });
          }
          await sleep(300); // throttle per-record writes under rate limits
        }
      }

      // Verification pass: independent fresh settings read + re-read of every
      // written record; compare stored vs expected snapshot.
      const expected = snapshotFromSetting(await freshSettingFor(owner));
      for (const r of recs) {
        if (failedIds.has(r.id)) continue;
        try {
          const rec = await svc.entities.Assessment.get(r.id);
          const stored = rec.vat_snapshot;
          const match = !!stored &&
            stored.is_vat_registered === expected.is_vat_registered &&
            stored.tax_rate === expected.tax_rate;
          const entry = {
            id: r.id,
            owner,
            status: rec.status,
            stored_snapshot: stored,
            expected_snapshot: expected,
            match
          };
          verification.push(entry);
          if (!match) mismatches.push(entry);
        } catch (e) {
          const entry = { id: r.id, owner, error: e.message, match: false };
          verification.push(entry);
          mismatches.push(entry);
        }
        await sleep(200);
      }

      // Owner counts reflect the recomputed (write-time) snapshot.
      const o = byOwner[owner] || { records: 0, vat_registered_records: 0 };
      o.records = recs.length;
      o.vat_registered_records = snapshot.is_vat_registered ? recs.length : 0;
      byOwner[owner] = o;
    }

    return Response.json({
      success: true,
      dry_run: false,
      target_email,
      total_assessments_scanned: all.length,
      stamped,
      coerced_legacy_records: coercedRecords,
      failed: failures.length,
      failures,
      already_snapshotted: alreadySnapshotted,
      missing_settings_records: missingSettings,
      by_status: byStatus,
      by_owner: byOwner,
      verified: verification.length,
      mismatches: mismatches.length,
      verification
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Backfill failed' }, { status: 500 });
  }
}