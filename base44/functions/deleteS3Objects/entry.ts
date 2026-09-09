import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { secrets } from 'base44:runtime';
import { deleteUrlsForUser, getS3ConfigFromSecrets, summarizeDeletionResults } from './s3Delete.ts';

// Best-effort S3 deletion for client-triggered paths (assessment deletion,
// photo removal, logo removal) and for the account-deletion sweep invoked
// from deleteUserAndAssociatedData (with block_on_failure=true). Never blocks
// the caller unless asked: the record-level action proceeds regardless of the
// S3 outcome, and every attempt (success or failure) is written to
// DeletionAudit.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Invalid JSON body' }, { status: 400 });

    const {
      urls,
      trigger_path: triggerPath,
      record_type: recordType,
      record_id: recordId,
      target_user_id: targetUserId,
      context,
      block_on_failure: blockOnFailure
    } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return Response.json({ error: 'urls must be a non-empty array' }, { status: 400 });
    }

    // By default the caller deletes only their own objects; targeting another
    // user's prefix requires admin.
    const targetId = targetUserId || user.id;
    if (String(targetId) !== String(user.id) && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const s3Config = getS3ConfigFromSecrets(secrets);
    if (!s3Config) {
      return Response.json({ error: 'Storage is not configured' }, { status: 500 });
    }

    const results = await deleteUrlsForUser(urls, targetId, s3Config);
    const { deletedCount, failedCount, skippedCount } = summarizeDeletionResults(results);
    let overallStatus;
    if (failedCount > 0) {
      overallStatus = blockOnFailure ? 'blocked' : (deletedCount > 0 ? 'partial' : 'failed');
    } else {
      overallStatus = 'success';
    }

    try {
      await base44.asServiceRole.entities.DeletionAudit.create({
        trigger_path: triggerPath || null,
        record_type: recordType || null,
        record_id: recordId || null,
        target_user_id: String(targetId),
        performed_by_email: user.email,
        results,
        deleted_count: deletedCount,
        failed_count: failedCount,
        skipped_count: skippedCount,
        overall_status: overallStatus,
        context: context || null
      });
    } catch (auditError) {
      console.error('Failed to write DeletionAudit record:', auditError);
    }

    return Response.json({
      results,
      overall_status: overallStatus,
      deleted_count: deletedCount,
      failed_count: failedCount,
      skipped_count: skippedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}