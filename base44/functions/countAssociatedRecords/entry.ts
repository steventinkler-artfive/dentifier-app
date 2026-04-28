import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userEmail } = await req.json();
    console.log('[countAssociatedRecords] received userEmail:', userEmail);

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    const [assessments, customers, vehicles, userSettings] = await Promise.all([
      base44.asServiceRole.entities.Assessment.filter({ created_by: userEmail }),
      base44.asServiceRole.entities.Customer.filter({ created_by: userEmail }),
      base44.asServiceRole.entities.Vehicle.filter({ created_by: userEmail }),
      base44.asServiceRole.entities.UserSetting.filter({ user_email: userEmail }),
    ]);

    console.log('[countAssociatedRecords] assessments.length:', assessments.length);
    console.log('[countAssociatedRecords] customers.length:', customers.length);
    console.log('[countAssociatedRecords] vehicles.length:', vehicles.length);
    console.log('[countAssociatedRecords] userSettings.length:', userSettings.length);

    return Response.json({
      assessments: assessments.length,
      customers: customers.length,
      vehicles: vehicles.length,
      userSettings: userSettings.length,
      total: assessments.length + customers.length + vehicles.length + userSettings.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});