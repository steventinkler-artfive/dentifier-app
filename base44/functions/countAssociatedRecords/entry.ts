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

    // DIAGNOSTIC: fetch ALL assessments without any filter
    const allAssessments = await base44.asServiceRole.entities.Assessment.list();
    console.log('[DIAGNOSTIC] Total Assessment records returned by list():', allAssessments.length);

    const matchingAssessments = allAssessments.filter(r => r.created_by === userEmail);
    console.log('[DIAGNOSTIC] Assessments with created_by ===', userEmail, ':', matchingAssessments.length);

    if (allAssessments.length > 0) {
      console.log('[DIAGNOSTIC] Sample created_by values:', allAssessments.slice(0, 5).map(r => JSON.stringify(r.created_by)));
    }

    return Response.json({
      diagnostic: true,
      totalAssessmentsInDB: allAssessments.length,
      matchingAssessments: matchingAssessments.length,
      userEmail,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});