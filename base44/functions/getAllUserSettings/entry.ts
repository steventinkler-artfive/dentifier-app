import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all user settings as service role (bypasses per-user RLS)
    const allSettings = await base44.asServiceRole.entities.UserSetting.list();

    return Response.json(allSettings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});