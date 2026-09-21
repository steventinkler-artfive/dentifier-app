import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { secrets } from 'base44:runtime';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 3000;

function toBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function sniffImageType(bytes) {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
}

// Fetches the authenticated caller's OWN business logo from the app CDN and
// returns it as a data URL, so PDF rendering never depends on a cross-origin
// browser fetch succeeding. No URL is accepted from the client — the logo URL
// is read from the caller's own UserSetting, so there is no SSRF surface.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await base44.entities.UserSetting.filter({ user_email: user.email });
    const logoUrl = settings[0]?.business_logo_url;
    if (!logoUrl) {
      return Response.json({ error: 'No business logo configured' }, { status: 404 });
    }

    // Host validation: the stored logo must live on a known-safe surface —
    // the app's configured CDN host, or this app's own platform file storage
    // (logos uploaded before the S3 migration live there). No client-supplied
    // URL is ever fetched, so there is no SSRF surface.
    const cdnBase = secrets.get('S3_CDN_BASE');
    const appId = secrets.get('BASE44_APP_ID');
    let parsedLogo;
    let cdnHostname;
    try {
      parsedLogo = new URL(logoUrl);
      cdnHostname = new URL(cdnBase).hostname;
    } catch (e) {
      return Response.json({ error: 'Invalid logo URL' }, { status: 400 });
    }
    const isOnCdn = parsedLogo.hostname === cdnHostname;
    const isOwnPlatformFile =
      parsedLogo.hostname === 'base44.app' &&
      appId &&
      parsedLogo.pathname.startsWith(`/api/apps/${appId}/files/`);
    if (parsedLogo.protocol !== 'https:' || (!isOnCdn && !isOwnPlatformFile)) {
      return Response.json({ error: 'Logo URL is not on an allowed app storage host' }, { status: 400 });
    }

    // Server-side fetch: no Origin header, no CORS evaluation.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(parsedLogo.toString(), { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      return Response.json({ error: `CDN fetch failed with status ${res.status}` }, { status: 502 });
    }

    const declaredLength = parseInt(res.headers.get('content-length') || '0', 10);
    if (declaredLength > MAX_LOGO_BYTES) {
      return Response.json({ error: 'Logo exceeds size limit' }, { status: 413 });
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length > MAX_LOGO_BYTES) {
      return Response.json({ error: 'Logo exceeds size limit' }, { status: 413 });
    }

    // Sniff the real image type from magic bytes — storage endpoints may not
    // return a usable Content-Type, and trusting headers would allow serving
    // non-image bytes as a data URL.
    const sniffedType = sniffImageType(bytes);
    if (!sniffedType) {
      return Response.json({ error: 'Stored logo is not an image' }, { status: 400 });
    }

    return Response.json({ dataUrl: `data:${sniffedType};base64,${toBase64(bytes)}`, contentType: sniffedType });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return Response.json({ error: 'Logo fetch timed out' }, { status: 504 });
    }
    console.error('proxyLogoImage error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}