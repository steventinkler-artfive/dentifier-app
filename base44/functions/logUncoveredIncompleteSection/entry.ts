import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// The only onboarding sections the wizard tracks. 'branding' is intentionally
// excluded — the wizard never sets it as a real step.
const KNOWN_SECTIONS = new Set(['business', 'banking', 'pricing', 'skills']);

// Surfaces (server-side, via Logs Explorer) the case where an established user
// has an incomplete onboarding section that no Dashboard banner covers, so they
// are left with neither the wizard modal nor a banner. No persistence, no UI.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try {
      body = await req.json() || {};
    } catch (e) {
      /* no body or invalid JSON -> nothing to log */
      return Response.json({ ok: true, logged: false });
    }

    const raw = body.uncovered_sections;
    if (!Array.isArray(raw) || raw.length === 0) {
      return Response.json({ ok: true, logged: false });
    }

    // Server-side validation: only known section names are ever logged.
    // Any unknown value means the client computed the set incorrectly; reject
    // rather than emit a misleading log entry.
    for (const s of raw) {
      if (typeof s !== 'string' || !KNOWN_SECTIONS.has(s)) {
        return Response.json({ error: 'Invalid uncovered_sections' }, { status: 400 });
      }
    }

    console.warn('[UNCOVERED_INCOMPLETE_SECTION]', {
      email: user.email,
      user_id: user.id,
      uncovered_sections: raw
    });

    return Response.json({ ok: true, logged: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}