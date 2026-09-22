import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth gate — fail closed with a clean 401 when no authenticated user is present.
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (error) {
      console.error('Authentication failed:', error.message);
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Admin only
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all user settings as service role (bypasses per-user RLS),
    // then return only the fields the admin user-management page displays.
    const allSettings = await base44.asServiceRole.entities.UserSetting.list();
    const filtered = allSettings.map((s) => ({
      user_email: s.user_email,
      technician_name: s.technician_name,
      business_name: s.business_name,
      pwa_status: s.pwa_status,
    }));

    return Response.json(filtered);
  } catch (error) {
    console.error('Error fetching user settings:', error.message);
    return Response.json({ error: 'Failed to fetch user settings' }, { status: 500 });
  }
});