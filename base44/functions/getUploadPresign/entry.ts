import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { secrets } from "base44:runtime";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

async function hmac(keyBytes, message) {
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)));
}

function hex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (_) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { kind, content_type: contentType, content_length: contentLength } = body || {};

    const folder = kind === 'photo' ? 'photos' : kind === 'logo' ? 'logos' : null;
    if (!folder) {
      return Response.json({ error: "kind must be 'photo' or 'logo'" }, { status: 400 });
    }
    const ext = EXTENSIONS[contentType];
    if (!ext) {
      return Response.json({ error: 'content_type must be image/jpeg, image/png or image/webp' }, { status: 400 });
    }
    if (typeof contentLength !== 'number' || contentLength < 1 || contentLength > MAX_FILE_BYTES) {
      return Response.json({ error: 'File exceeds the 10 MB upload limit' }, { status: 400 });
    }

    // Key: {user.id}/{photos|logos}/{uuid}.{ext} — the user prefix keeps every
    // object for GDPR erasure under a single listing. '?' and '#' are excluded.
    const userId = String(user.id).replace(/[?#]/g, '');
    const key = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;

    const bucket = secrets.get('S3_BUCKET');
    const region = secrets.get('AWS_REGION');
    const accessKey = secrets.get('AWS_ACCESS_KEY_ID');
    const secretKey = secrets.get('AWS_SECRET_ACCESS_KEY');
    let cdnBase = (secrets.get('S3_CDN_BASE') || '').replace(/\/+$/, '');
    if (!bucket || !region || !accessKey || !secretKey || !cdnBase) {
      return Response.json({ error: 'Upload storage is not configured' }, { status: 500 });
    }

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8);
    const credential = `${accessKey}/${dateStamp}/${region}/s3/aws4_request`;

    // Presigned POST policy: content type and size (max 10 MB) are enforced by S3 itself.
    const policy = {
      expiration: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      conditions: [
        { bucket },
        { key },
        ['eq', '$Content-Type', contentType],
        ['content-length-range', 1, MAX_FILE_BYTES],
        { 'x-amz-algorithm': 'AWS4-HMAC-SHA256' },
        { 'x-amz-credential': credential },
        { 'x-amz-date': amzDate }
      ]
    };
    const policyB64 = btoa(JSON.stringify(policy));

    const encoder = new TextEncoder();
    const kDate = await hmac(encoder.encode('AWS4' + secretKey), dateStamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, 's3');
    const kSigning = await hmac(kService, 'aws4_request');
    const signature = hex(await hmac(kSigning, policyB64));

    return Response.json({
      upload_url: `https://${bucket}.s3.${region}.amazonaws.com/`,
      fields: {
        key,
        'Content-Type': contentType,
        'x-amz-algorithm': 'AWS4-HMAC-SHA256',
        'x-amz-credential': credential,
        'x-amz-date': amzDate,
        Policy: policyB64,
        'x-amz-signature': signature
      },
      cdn_url: `${cdnBase}/${key}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}