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

    const writeAudit = async (results, overallStatus, context) => {
      try {
        await base44.asServiceRole.entities.DeletionAudit.create({
          trigger_path: 'account_delete',
          record_type: 'User',
          record_id: String(userId),
          target_user_id: String(userId),
          performed_by_email: user.email,
          results: results || [],
          deleted_count: 0,
          failed_count: 0,
          skipped_count: 0,
          overall_status: overallStatus,
          context
        });
      } catch (auditError) {
        console.error('Failed to write DeletionAudit record:', auditError);
      }
    };

    if (deleteAssociatedData) {
      const [assessments, customers, vehicles, userSettings] = await Promise.all([
        base44.asServiceRole.entities.Assessment.filter({ created_by: userEmail }),
        base44.asServiceRole.entities.Customer.filter({ created_by: userEmail }),
        base44.asServiceRole.entities.Vehicle.filter({ created_by: userEmail }),
        base44.asServiceRole.entities.UserSetting.filter({ user_email: userEmail }),
      ]);

      // Collect every S3-hosted URL this user owns BEFORE deleting any records.
      const urls = [];
      assessments.forEach(a => {
        (a.damage_photos || []).forEach(u => urls.push(u));
        (a.damage_items || []).forEach(item => ((item && item.associated_photos_urls) || []).forEach(u => urls.push(u)));
        (a.vehicles || []).forEach(v => {
          (v.damage_photos || []).forEach(u => urls.push(u));
          ((v && v.damage_items) || []).forEach(item => ((item && item.associated_photos_urls) || []).forEach(u => urls.push(u)));
        });
      });
      userSettings.forEach(s => { if (s.business_logo_url) urls.push(s.business_logo_url); });
      const uniqueUrls = [...new Set(urls.filter(u => typeof u === 'string' && u.trim()))];

      if (uniqueUrls.length > 0) {
        // Delegate the sweep to deleteS3Objects — it performs the signed
        // deletes, enforces the per-user key prefix, and writes the audit
        // entry. Any failure marks the attempt 'blocked' and we stop before
        // deleting any database records.
        let sweep;
        try {
          sweep = await base44.functions.invoke('deleteS3Objects', {
            urls: uniqueUrls,
            trigger_path: 'account_delete',
            record_type: 'User',
            record_id: String(userId),
            target_user_id: String(userId),
            context: 'account closure',
            block_on_failure: true
          });
        } catch (invokeError) {
          await writeAudit([], 'blocked', `deleteAssociatedData=true; S3 cleanup call failed: ${invokeError.message}`);
          return Response.json({ error: 'S3 cleanup could not run — no records were deleted. Please retry.' }, { status: 502 });
        }

        const data = sweep && sweep.data ? sweep.data : sweep;
        if (!data || !Array.isArray(data.results)) {
          await writeAudit([], 'blocked', 'deleteAssociatedData=true; S3 cleanup returned an unexpected response');
          return Response.json({ error: 'S3 cleanup returned an unexpected response — no records were deleted. Please retry.' }, { status: 502 });
        }

        const failures = data.results.filter(r => r.status === 'failed' || r.status === 'rejected_cross_user');
        if (failures.length > 0) {
          // Audit entry (status 'blocked') was written by deleteS3Objects.
          return Response.json({
            error: `S3 cleanup failed for ${failures.length} object(s) — no records were deleted. Please retry.`
          }, { status: 502 });
        }
      } else {
        // No S3 objects to remove — write the audit entry for this attempt here.
        await writeAudit([], 'success', 'deleteAssociatedData=true; no S3-hosted objects found');
      }

      await Promise.all([
        ...assessments.map(r => base44.asServiceRole.entities.Assessment.delete(r.id)),
        ...customers.map(r => base44.asServiceRole.entities.Customer.delete(r.id)),
        ...vehicles.map(r => base44.asServiceRole.entities.Vehicle.delete(r.id)),
        ...userSettings.map(r => base44.asServiceRole.entities.UserSetting.delete(r.id)),
      ]);
    } else {
      await writeAudit([], 'success', 'deleteAssociatedData=false');
    }

    // Delete the user account
    await base44.asServiceRole.entities.User.delete(userId);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});