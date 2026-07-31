import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    // Fetch all assessments using service role so we can read every record regardless of RLS.
    const assessments = await base44.asServiceRole.entities.Assessment.list('-created_date', 1000);

    // Group record ids by their created_by email.
    const byEmail = {};
    let noCreator = 0;
    for (const a of assessments) {
      const email = a.created_by;
      if (!email) {
        noCreator++;
        continue;
      }
      if (!byEmail[email]) byEmail[email] = [];
      byEmail[email].push(a.id);
    }

    const emails = Object.keys(byEmail);
    console.log(`Backfill: ${assessments.length} total, ${emails.length} unique creators, ${noCreator} without created_by`);

    // updateMany skips schema validation, so legacy records with invalid fields won't break it.
    // We set creator_email = email for every record whose created_by matches that email.
    // Only the creator_email field is written — created_by, RLS, and all other fields are untouched.
    const results = [];
    for (const email of emails) {
      const res = await base44.asServiceRole.entities.Assessment.updateMany(
        { created_by: email },
        { $set: { creator_email: email } }
      );
      results.push({ email, count: byEmail[email].length, result: res });
    }

    const updated = results.reduce((sum, r) => sum + r.count, 0);

    return Response.json({
      message: 'Backfill complete',
      total: assessments.length,
      updated,
      uniqueCreators: emails.length,
      withoutCreator: noCreator,
      results
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}