import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from "base44:runtime";
import { itemFromPayload } from "../../shared/llmPayloadValidation.ts";

// ============================================================================
// analyzeDamage — server-side relocation of the DamageAnalysis LLM call.
// Prompt, response_json_schema and the "gemini_3_8_flash" model pin are
// copied byte-for-byte from src/components/assessment/DamageAnalysis.jsx.
// The payload is strictly validated before the LLM is invoked: only the
// fields listed below are read, so no client-supplied prompt or model can
// reach the LLM.
// ============================================================================

const MAX_ITEMS = 20;
const MAX_PHOTOS = 20;

// Extends the shared item picker with the dent_count field used by the analysis prompt.
function itemFromPayloadWithDentCount(raw) {
  const item = itemFromPayload(raw);
  let dentCount = raw.dent_count;
  if (dentCount === undefined || dentCount === null) dentCount = 1;
  if (!Number.isInteger(dentCount) || dentCount < 1 || dentCount > 50) {
    throw new Error('Damage item field "dent_count" must be an integer between 1 and 50');
  }
  return { ...item, dent_count: dentCount };
}

function isAllowedPhotoUrl(url) {
  if (typeof url !== 'string' || url.length > 500 || !url.startsWith('https://')) return false;
  let host;
  try { host = new URL(url).hostname; } catch (_) { return false; }
  // Current photos: app S3 CDN (host derived from S3_CDN_BASE).
  const cdnBase = (secrets.get('S3_CDN_BASE') || '').replace(/\/+$/, '');
  if (cdnBase) {
    try { if (new URL(cdnBase).hostname === host) return true; } catch (_) { /* fall through */ }
  }
  // Legacy photos uploaded before the S3 migration live in Base44 storage.
  return host.endsWith('.supabase.co');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try {
      user = await base44.auth.me();
    } catch (_) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try { body = await req.json(); } catch (_) {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const rawItems = body?.damageItems;
    if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > MAX_ITEMS) {
      return Response.json({ error: `damageItems must be an array of 1-${MAX_ITEMS} items` }, { status: 400 });
    }
    let damageItems;
    try {
      damageItems = rawItems.map(itemFromPayloadWithDentCount);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }

    const rawVehicle = body?.vehicle;
    let vehicle = null;
    if (rawVehicle && typeof rawVehicle === 'object') {
      const vStr = (field) => (typeof rawVehicle[field] === 'string' && rawVehicle[field].length <= 50) ? rawVehicle[field] : undefined;
      const year = Number.isInteger(rawVehicle.year) ? rawVehicle.year : undefined;
      if (year !== undefined || rawVehicle.make || rawVehicle.model) {
        vehicle = { year, make: vStr('make'), model: vStr('model'), color: vStr('color') };
      }
    }

    const rawPhotos = body?.photos;
    if (rawPhotos !== undefined && rawPhotos !== null && !Array.isArray(rawPhotos)) {
      return Response.json({ error: 'photos must be an array' }, { status: 400 });
    }
    const photos = rawPhotos || [];
    if (photos.length > MAX_PHOTOS) {
      return Response.json({ error: `photos must contain at most ${MAX_PHOTOS} URLs` }, { status: 400 });
    }
    for (let i = 0; i < photos.length; i++) {
      if (!isAllowedPhotoUrl(photos[i])) {
        return Response.json({ error: `photos[${i}] is not a valid photo URL from this app's storage` }, { status: 400 });
      }
    }

    // ─── Prompt construction — byte-for-byte from DamageAnalysis.jsx ────────

    const vehicleInfo = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.color ? ` (${vehicle.color})` : ''}`
      : 'Vehicle details not provided';

    const damageDescription = damageItems.map((item, index) => {
      const parts = [`Item ${index}: Panel = ${item.panel}`];
      if (item.damage_type) parts.push(`Type: ${item.damage_type}`);
      if (item.size_range) parts.push(`Size: ${item.size_range}`);
      parts.push(`Count: ${item.dent_count || 1} dent(s)`);
      if (item.material) parts.push(`Material: ${item.material}`);
      if (item.repair_method) parts.push(`Repair Method: ${item.repair_method}`);
      if (item.depth) parts.push(`Depth: ${item.depth}`);
      if (item.affects_body_line) parts.push(`Affects Body Line: Yes`);
      if (item.has_stretched_metal) parts.push(`Stretched Metal: Yes`);
      if (item.notes) parts.push(`Notes: ${item.notes}`);
      return parts.join(' | ');
    }).join('\n');

    const prompt = `You are Dentifier, an AI assistant for PDR technicians. Your job is to provide a brief, valuable second opinion based on BOTH the photos AND the technician's manual inputs.

VEHICLE: ${vehicleInfo}

TECHNICIAN-ENTERED DAMAGE DATA:
${damageDescription}

PHOTOS: ${photos.length} photo(s) provided.

YOUR TASK — respond in JSON with exactly these two fields:

1. "confidence_check": ONE short sentence (max 20 words) comparing what's visible in the photos to the entered inputs.
   - If photos match inputs: "Photos appear consistent with the selected inputs."
   - If photos suggest shallower AND technician-entered depth is 'Deep/Sharp': "Photos suggest the damage may be shallower than selected — worth reviewing before proceeding."
   - If photos suggest shallower AND technician-entered depth is 'Shallow' or 'Medium': "Photos appear consistent with the selected inputs."
   - If photos suggest deeper AND technician-entered depth is 'Shallow': "Photos suggest the damage may be deeper than selected — worth reviewing before proceeding."
   - If photos suggest deeper AND technician-entered depth is 'Medium' or 'Deep/Sharp': "Photos appear consistent with the selected inputs."
   - If no photos: "No photos provided — analysis based on manual inputs only."
   - DO NOT repeat the full damage description. ONE sentence only.

2. "photo_observations": An object where each key is the item index as a string (e.g. "0", "1", "2") and the value is ONE sentence describing where the damage is located in the photo for THAT specific item.
   For EACH item, follow these rules strictly:
   - The damage location described must be attributed to the panel selected by the technician for that item. For example: "The dent is located towards the front edge of the [SELECTED PANEL]."
   - The damage location described in photo_observation must be attributed to [SELECTED PANEL]. You may reference an adjacent panel as a landmark to describe position (e.g. "near the leading edge, close to the wing" or "towards the boot") but must never state or imply that the damage itself is located on a panel other than [SELECTED PANEL].
   - If you cannot confidently associate the available photos with a specific item's panel, that item's observation must be exactly: "No additional observations from photo analysis."
   - If no photo was provided at all, set every item's observation to "No additional observations from photo analysis."
   - ONE sentence per item only.

   UK ENGLISH — use UK vehicle terminology throughout:
   - "Bonnet" not "Hood"
   - "Boot" not "Trunk"
   - "Wing" not "Fender"
   - "Windscreen" not "Windshield"
   - "Rear quarter panel" not "Quarter panel"

OUTPUT: JSON only. No other text.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "gemini_3_8_flash",
      file_urls: photos.length > 0 ? photos : undefined,
      response_json_schema: {
        type: "object",
        properties: {
          confidence_check: { type: "string" },
          photo_observations: {
            type: "object",
            additionalProperties: { type: "string" }
          }
        },
        required: ["confidence_check", "photo_observations"]
      }
    });

    return Response.json(response);
  } catch (error) {
    console.error('Error in analyzeDamage:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}