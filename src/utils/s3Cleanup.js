import { base44 } from "@/api/base44Client";

// Every S3-hosted image URL an Assessment record can hold (deduplicated).
export function collectAssessmentImageUrls(assessment) {
  if (!assessment) return [];
  const urls = new Set();
  const push = (u) => { if (typeof u === "string" && u.trim()) urls.add(u); };
  (assessment.damage_photos || []).forEach(push);
  (assessment.damage_items || []).forEach(item => (item?.associated_photos_urls || []).forEach(push));
  (assessment.vehicles || []).forEach(v => {
    (v?.damage_photos || []).forEach(push);
    (v?.damage_items || []).forEach(item => (item?.associated_photos_urls || []).forEach(push));
  });
  return [...urls];
}

// Best-effort S3 cleanup — never throws, never blocks the caller's action.
// Skips silently when offline (the object remains until a future sweep).
export async function deleteS3ObjectsBestEffort(urls, { triggerPath, recordType, recordId, context } = {}) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  if (!navigator.onLine) return;
  try {
    await base44.functions.invoke("deleteS3Objects", {
      urls,
      trigger_path: triggerPath,
      record_type: recordType,
      record_id: recordId,
      context
    });
  } catch (error) {
    console.warn("S3 cleanup best-effort call failed (continuing):", error);
  }
}