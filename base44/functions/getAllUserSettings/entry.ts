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
    console.log(`[getAllUserSettings] Fetched ${allSettings.length} settings records.`);
    if (allSettings.length === 0) {
      try {
        const allUsers = await base44.asServiceRole.entities.User.list();
        console.log(`[getAllUserSettings] Verification: System contains ${allUsers.length} total users.`);
      } catch (verifyErr) {
        console.log(`[getAllUserSettings] Verification user count failed:`, verifyErr);
      }
    }

    return Response.json(allSettings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});