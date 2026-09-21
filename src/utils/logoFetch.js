import { base44 } from "@/api/base44Client";

const PROXY_TIMEOUT_MS = 5000; // covers cold start + fetch; beyond this we give up
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

// In-memory cache keyed by the logo URL itself. A new upload produces a new
// URL, so a replaced logo is picked up immediately on the next PDF.
const logoCache = new Map();

export function getCachedLogo(logoUrl) {
  return logoCache.get(logoUrl) || null;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function invokeLogoProxy() {
  return base44.functions.invoke('proxyLogoImage').then((r) => {
    const d = r?.data ?? r;
    return d?.dataUrl || null;
  });
}

/**
 * Fetches a business logo for PDF rendering, returning a data URL.
 *
 * 1. Direct CDN fetch (healthy path — the proxy is never invoked on success).
 * 2. Backend proxy fallback (server-side fetch, no Origin header / CORS) —
 *    bounded to 5 seconds so PDF generation always completes.
 *
 * Returns null when both fail (caller decides its own fallback).
 * Only successful results are cached.
 */
export async function fetchLogoDataUrl(logoUrl) {
  if (!logoUrl) return null;
  if (logoCache.has(logoUrl)) return logoCache.get(logoUrl);

  // 1) Direct CDN fetch
  try {
    const res = await fetch(logoUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size <= MAX_LOGO_BYTES) {
        const dataUrl = await blobToDataUrl(blob);
        logoCache.set(logoUrl, dataUrl);
        return dataUrl;
      }
    }
  } catch (e) {
    // fall through to the backend proxy
  }

  // 2) Backend proxy fallback, bounded
  try {
    const dataUrl = await Promise.race([
      invokeLogoProxy(),
      new Promise((resolve) => setTimeout(() => resolve(null), PROXY_TIMEOUT_MS)),
    ]);
    if (dataUrl) {
      logoCache.set(logoUrl, dataUrl);
    }
    return dataUrl;
  } catch (e) {
    return null;
  }
}