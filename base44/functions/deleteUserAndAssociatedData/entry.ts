import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, userEmail, deleteAssociatedData } = await req.json();

    if (!userId || !userEmail) {
      return Response.json({ error: 'userId and userEmail are required' }, { status: 400 });
    }

    if (deleteAssociatedData) {
      // Fetch and delete all associated records
      const [assessments, customers, vehicles, userSettings] = await Promise.all([
        base44.asServiceRole.entities.Assessment.filter({ created_by: userEmail }),
        base44.asServiceRole.entities.Customer.filter({ created_by: userEmail }),
        base44.asServiceRole.entities.Vehicle.filter({ created_by: userEmail }),
        base44.asServiceRole.entities.UserSetting.filter({ user_email: userEmail }),
      ]);

      await Promise.all([
        ...assessments.map(r => base44.asServiceRole.entities.Assessment.delete(r.id)),
        ...customers.map(r => base44.asServiceRole.entities.Customer.delete(r.id)),
        ...vehicles.map(r => base44.asServiceRole.entities.Vehicle.delete(r.id)),
        ...userSettings.map(r => base44.asServiceRole.entities.UserSetting.delete(r.id)),
      ]);
    }

    // Delete the user account
    await base44.asServiceRole.entities.User.delete(userId);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});