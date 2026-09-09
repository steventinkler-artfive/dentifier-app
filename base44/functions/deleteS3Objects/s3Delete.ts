// S3 deletion helpers — hand-rolled SigV4 DELETE, mirroring the signing pattern
// in getUploadPresign. Bundled with the deleteS3Objects function only.

export async function hmac(keyBytes, message) {
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)));
}

export function hex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return hex(new Uint8Array(digest));
}

export function getS3ConfigFromSecrets(secrets) {
  const bucket = secrets.get('S3_BUCKET');
  const region = secrets.get('AWS_REGION');
  const accessKey = secrets.get('AWS_ACCESS_KEY_ID');
  const secretKey = secrets.get('AWS_SECRET_ACCESS_KEY');
  const cdnBase = (secrets.get('S3_CDN_BASE') || '').replace(/\/+$/, '');
  if (!bucket || !region || !accessKey || !secretKey || !cdnBase) return null;
  return { bucket, region, accessKey, secretKey, cdnBase };
}

// Derives the S3 key from a stored CDN URL. Returns null for anything that is
// not under S3_CDN_BASE (legacy Base44/Supabase/bunny URLs) — callers treat
// null as a silent skip, never an error.
export function extractS3KeyFromUrl(url, cdnBase) {
  if (typeof url !== 'string' || url.trim() === '') return null;
  const base = (cdnBase || '').replace(/\/+$/, '');
  if (!base) return null;
  let parsed, baseParsed;
  try {
    parsed = new URL(url.trim());
    baseParsed = new URL(base);
  } catch (_) {
    return null;
  }
  if (parsed.origin !== baseParsed.origin) return null;
  const basePath = baseParsed.pathname.replace(/\/+$/, '');
  if (!parsed.pathname.startsWith(basePath + '/')) return null;
  const key = decodeURIComponent(parsed.pathname.slice(basePath.length + 1));
  return key || null;
}

// Signed DeleteObject. 204 = deleted; 404 = key never existed (idempotent —
// treat as deleted so retries are always safe).
export async function deleteS3Object(key, config) {
  const { bucket, region, accessKey, secretKey } = config;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const canonicalUri = key.split('/').map(encodeURIComponent).join('/');
  const payloadHash = await sha256Hex('');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `DELETE\n/${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${await sha256Hex(canonicalRequest)}`;

  const encoder = new TextEncoder();
  const kDate = await hmac(encoder.encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, 's3');
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = hex(await hmac(kSigning, stringToSign));

  const res = await fetch(`https://${host}/${canonicalUri}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash
    }
  });

  if (res.status === 204 || res.status === 200 || res.status === 404) {
    return { status: 'deleted' };
  }
  const body = await res.text();
  return { status: 'failed', error: `S3 responded ${res.status}: ${body.slice(0, 300)}` };
}

// Deletes every URL in the list owned by targetUserId. Belt-and-braces: the
// key's first path segment must equal targetUserId, so a cross-user key is
// rejected rather than deleted. Non-S3 URLs are silently skipped.
export async function deleteUrlsForUser(urls, targetUserId, config) {
  const unique = [...new Set((urls || []).filter(u => typeof u === 'string' && u.trim()))];
  const results = [];
  const queue = [...unique];
  // Batches of 10 concurrent requests
  while (queue.length > 0) {
    const batch = queue.splice(0, 10);
    const batchResults = await Promise.all(batch.map(async (url) => {
      const key = extractS3KeyFromUrl(url, config.cdnBase);
      if (!key) return { url, status: 'skipped_not_s3' };
      if (!targetUserId || String(key.split('/')[0]) !== String(targetUserId)) {
        return { url, key, status: 'rejected_cross_user' };
      }
      try {
        return { url, key, ...await deleteS3Object(key, config) };
      } catch (e) {
        return { url, key, status: 'failed', error: String((e && e.message) || e) };
      }
    }));
    results.push(...batchResults);
  }
  return results;
}

export function summarizeDeletionResults(results) {
  const deletedCount = results.filter(r => r.status === 'deleted').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const skippedCount = results.filter(r => r.status === 'skipped_not_s3' || r.status === 'rejected_cross_user').length;
  return { deletedCount, failedCount, skippedCount };
}