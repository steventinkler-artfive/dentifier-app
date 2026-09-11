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

    // Owner settings lookup by email
    const settingsList = await svc.entities.UserSetting.list('-created_date', 1000);
    const settingsByEmail = new Map();
    for (const s of settingsList) settingsByEmail.set(s.user_email, s);

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

      toStamp.push({ id: a.id, snapshot, record: a });
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

    // Real run: batched bulk updates first; per-record fallback for legacy
    // records holding non-string vehicles[].estimated_time_hours values that
    // fail schema validation on write — coerce them (null omitted, numbers
    // stringified; semantic no-op) and retry individually.
    const sanitizeVehicles = (a) => (a.vehicles || []).map(v => {
      if (v.estimated_time_hours == null) {
        const c = { ...v };
        delete c.estimated_time_hours;
        return c;
      }
      return { ...v, estimated_time_hours: String(v.estimated_time_hours) };
    });

    const stampRecord = async (r) => {
      try {
        await svc.entities.Assessment.update(r.id, { vat_snapshot: r.snapshot });
        return { ok: true, coerced: false };
      } catch (e) {
        try {
          const retry = { vat_snapshot: r.snapshot };
          if (r.record.vehicles) retry.vehicles = sanitizeVehicles(r.record);
          await svc.entities.Assessment.update(r.id, retry);
          return { ok: true, coerced: true };
        } catch (e2) {
          return { ok: false, error: e2.message };
        }
      }
    };

    let stamped = 0;
    let coercedRecords = 0;
    const failures = [];
    for (let i = 0; i < toStamp.length; i += 500) {
      const chunk = toStamp.slice(i, i + 500);
      try {
        await svc.entities.Assessment.bulkUpdate(chunk.map(r => ({ id: r.id, vat_snapshot: r.snapshot })));
        stamped += chunk.length;
      } catch (e) {
        for (const r of chunk) {
          const outcome = await stampRecord(r);
          if (outcome.ok) {
            stamped++;
            if (outcome.coerced) coercedRecords++;
          } else {
            failures.push({ id: r.id, error: outcome.error });
          }
        }
      }
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
      by_owner: byOwner
    });
  } catch (error) {
    return Response.json({ error: error.message || 'Backfill failed' }, { status: 500 });
  }
}