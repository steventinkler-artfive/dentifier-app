import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { secrets } from 'base44:runtime';

// MIRRORED CONSTANT — READ THIS BEFORE EDITING.
// The Set A default pricing matrix below is DUPLICATED in the frontend module
// src/utils/defaultPricingMatrix.js. Backend functions cannot import from
// src/, so the two copies must be maintained by hand. Changing one requires
// changing the other — four diverging copies of this matrix are what caused
// the pricing inconsistencies this function exists to fix. Any price, size
// range or damage type changed here must be changed there in the same edit.
const DEFAULT_PRICING_MATRIX = [
    { damage_type: "Standard Dent", size_range: "up to 10mm", base_price: 60 },
    { damage_type: "Standard Dent", size_range: "11mm - 25mm", base_price: 90 },
    { damage_type: "Standard Dent", size_range: "26mm - 50mm", base_price: 120 },
    { damage_type: "Standard Dent", size_range: "51mm - 80mm", base_price: 180 },
    { damage_type: "Standard Dent", size_range: "81mm - 120mm", base_price: 240 },
    { damage_type: "Standard Dent", size_range: "121mm - 200mm", base_price: 300 },
    { damage_type: "Standard Dent", size_range: "201mm - 300mm", base_price: 360 },
    { damage_type: "Standard Dent", size_range: "301mm - 500mm", base_price: 450 },
    { damage_type: "Standard Dent", size_range: "501mm - 750mm", base_price: 550 },
    { damage_type: "Standard Dent", size_range: "751mm - 1000mm (or larger)", base_price: 650 },
    { damage_type: "Crease", size_range: "11mm - 25mm", base_price: 130 },
    { damage_type: "Crease", size_range: "26mm - 50mm", base_price: 170 },
    { damage_type: "Crease", size_range: "51mm - 80mm", base_price: 250 },
    { damage_type: "Crease", size_range: "81mm - 120mm", base_price: 330 },
    { damage_type: "Crease", size_range: "121mm - 200mm", base_price: 415 },
    { damage_type: "Crease", size_range: "201mm - 300mm", base_price: 500 },
    { damage_type: "Crease", size_range: "301mm - 500mm", base_price: 620 }
];

export default async function(req) {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json().catch(() => ({}));

        // Shared secret presented by the auth workflow's invoke args.
        // Header-based markers were tested and REJECTED as a gate:
        // x-workflow-run and arbitrary custom headers pass verbatim
        // through the platform dispatcher to this function, so any
        // external caller can forge them. The secret travels in the
        // body between server-side components only — it exists nowhere
        // in browser-shipped code. The value lives in Base44 Secrets
        // (WORKFLOW_SHARED_SECRET) and is read here, inside the handler, on
        // each invocation — never hardcoded in the repo, and never read at
        // module top level, so a missing secret fails this request only.
        const WORKFLOW_SHARED_SECRET = secrets.get("WORKFLOW_SHARED_SECRET");

        // Two callers:
        // 1. The auth workflow (service context, no user token) — passes the
        //    trigger's email; we verify it belongs to a real app user.
        // 2. An authenticated app user (self-heal path from a save screen) —
        //    the email is forced to their own; body email is ignored so a
        //    logged-in user can never create records for someone else.
        let email = null;
        let authenticated = false;
        try {
            const me = await base44.auth.me();
            if (me && me.email) {
                email = me.email;
                authenticated = true;
            }
        } catch (e) {
            // No user token — service/workflow path continues below.
        }

        if (!email) {
            // SECURITY GATE: unauthenticated seeding is reserved for the
            // auth workflow alone — it must present the shared secret.
            if (body?.workflow_secret !== WORKFLOW_SHARED_SECRET) {
                return Response.json({ error: 'Forbidden' }, { status: 403 });
            }
            email = (body?.email || '').toString().trim();
            if (!email) {
                return Response.json({ error: 'Email required' }, { status: 400 });
            }
            const users = await base44.asServiceRole.entities.User.filter({ email });
            if (!users || users.length === 0) {
                return Response.json({ error: 'Forbidden: no such app user' }, { status: 403 });
            }
        }

        const seed = {
            user_email: email,
            quote_prefix: 'Q-',
            next_quote_number: 1,
            invoice_prefix: 'INV-',
            next_invoice_number: 1,
            invoice_footer: 'Please pay within 7 days of receipt of invoice.',
            hourly_rate: 60,
            base_cost: 40,
            default_panel_price: 60,
            currency: 'GBP',
            is_vat_registered: false,
            tax_rate: 20,
            pricing_matrix: DEFAULT_PRICING_MATRIX,
            custom_damage_types: [],
            custom_size_ranges: [],
            onboarding_completed: false
        };

        const findExisting = async () => {
            const records = await base44.asServiceRole.entities.UserSetting.filter({ user_email: email }, 'created_date');
            // Oldest-first ordering: if a duplicate ever survives, the
            // original record always wins.
            return [...records].sort((a, b) =>
                new Date(a.created_date) - new Date(b.created_date)
            );
        };

        const existing = await findExisting();
        if (existing.length > 0) {
            // SECURITY: no record body is ever returned — the caller gets the
            // record id only. Authenticated callers read their own record
            // through the SDK, which enforces ownership.
            return Response.json({
                status: 'exists',
                created: false,
                setting_id: existing[0].id,
                duplicate_count: existing.length
            });
        }

        const created = await base44.asServiceRole.entities.UserSetting.create(seed);

        // Duplicate guard. This should be near-impossible: the create above
        // only ran when no record existed. If a concurrent caller created one
        // too, clean up ONLY the record this function itself just created,
        // and only if it is byte-identical to the seed we wrote (nothing a
        // user could have modified) and an older record is confirmed to
        // exist. Any failed check: leave both records and log — never guess.
        const after = await findExisting();
        if (after.length > 1) {
            const older = after.filter(r => r.id !== created.id);
            const isUnmodifiedSeed = (rec) => {
                if (!rec) return false;
                return Object.keys(seed).every(
                    (key) => JSON.stringify(rec[key] ?? null) === JSON.stringify(seed[key] ?? null)
                );
            };
            if (older.length > 0 && isUnmodifiedSeed(created)) {
                try {
                    await base44.asServiceRole.entities.UserSetting.delete(created.id);
                    await base44.asServiceRole.entities.DeletionAudit.create({
                        trigger_path: 'settings_duplicate_cleanup',
                        record_type: 'UserSetting',
                        record_id: created.id,
                        target_user_id: (body?.user_id || older[0].created_by_id || email),
                        performed_by_email: email,
                        results: [{ url: null, key: created.id, status: 'deleted', error: null }],
                        deleted_count: 0,
                        failed_count: 0,
                        skipped_count: 0,
                        overall_status: 'success',
                        context: 'Duplicate UserSetting created concurrently; the self-created, unmodified seed record was removed and the older record kept.'
                    });
                } catch (cleanupError) {
                    console.error('Duplicate cleanup failed — leaving both records in place:', cleanupError);
                }
            } else {
                console.error('Duplicate UserSetting detected but cleanup preconditions not met — leaving both records in place:', {
                    email,
                    olderCount: older.length,
                    selfCreatedIsUnmodifiedSeed: older.length > 0 && isUnmodifiedSeed(created)
                });
            }
        }

        const finalRecords = await findExisting();
        const primary = finalRecords.length > 0 ? finalRecords[0] : created;
        return Response.json({
            status: 'created',
            created: true,
            setting_id: primary.id,
            duplicate_count: finalRecords.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}