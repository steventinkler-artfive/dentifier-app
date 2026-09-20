import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { itemFromPayload, toDisplayDamageType } from "../../shared/llmPayloadValidation.ts";

// ============================================================================
// generateAssessmentNotes — server-side relocation of the assessment-notes
// LLM call. Prompt, response_json_schema, the "gemini_3_8_flash" model pin
// and the [QUOTE-TIMING] logs are copied byte-for-byte from
// src/components/assessment/QuoteGeneration.jsx (generateQuote).
// The payload is strictly validated before the LLM is invoked: only the
// fields validated in llmPayloadValidation are read, so no client-supplied
// prompt or model can reach the LLM.
// ============================================================================

/**
 * Determines the outcome-caveat type for a damage item.
 * Computed in code so the notes LLM never infers hedging from depth or
 * repair method on its own — the prompt consumes this value verbatim.
 */
function getCaveatType(damageItem) {
  if (damageItem.has_stretched_metal) return 'stretched_metal';
  if (damageItem.repair_method === 'Limited Tool Access') return 'limited_access';
  if (damageItem.depth === 'Deep / Sharp') return 'deep_depth';
  if (damageItem.depth === 'Medium') return 'medium_depth';
  return 'none';
}

const MAX_ITEMS = 20;
const MAX_OBSERVATIONS = 20;

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
      damageItems = rawItems.map(itemFromPayload);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }

    const rawObservations = body?.observations;
    if (rawObservations !== undefined && rawObservations !== null && !Array.isArray(rawObservations)) {
      return Response.json({ error: 'observations must be an array' }, { status: 400 });
    }
    const rawObs = rawObservations || [];
    if (rawObs.length > MAX_OBSERVATIONS) {
      return Response.json({ error: `observations must contain at most ${MAX_OBSERVATIONS} entries` }, { status: 400 });
    }
    const observations = [];
    for (const o of rawObs) {
      if (!o || typeof o !== 'object'
        || typeof o.panel !== 'string' || o.panel.length < 1 || o.panel.length > 100
        || typeof o.observation !== 'string' || o.observation.length < 1 || o.observation.length > 300) {
        return Response.json({ error: 'Each observation must be { panel (<=100 chars), observation (<=300 chars) }' }, { status: 400 });
      }
      observations.push({ panel: o.panel, observation: o.observation });
    }

    // Quote instructions are loaded server-side — the client never supplies them.
    const globalSettingsList = await base44.entities.GlobalSetting.filter({ setting_key: 'main' });
    const llmQuoteInstructions = globalSettingsList?.[0]?.llm_quote_instructions;
    if (!llmQuoteInstructions) {
      return Response.json({ error: 'Quote instructions are not configured' }, { status: 400 });
    }

    // ─── Prompt construction — byte-for-byte from QuoteGeneration.jsx ───────

    const observationsText = observations.length > 0
      ? observations.map(o => `Photo observation (${o.panel}): ${o.observation}`).join('\n')
      : '';

    const damageContext = damageItems.map((item, idx) =>
      `${idx + 1}. Panel: ${item.panel} | Type: ${toDisplayDamageType(item.damage_type)}${item.depth && (item.depth === 'Medium' || item.depth === 'Deep / Sharp') ? ` | Depth: ${item.depth}` : ''}${item.affects_body_line ? ' | Body line: yes' : ''}${item.has_stretched_metal ? ' | Stretched metal: yes' : ''}${item.repair_method && item.repair_method !== 'Good Tool Access' ? ` | Repair method: ${item.repair_method}` : ''}${item.paint_type && item.paint_type !== 'Standard' ? ` | Paint type: ${item.paint_type}` : ''} | Caveat type: ${getCaveatType(item)}${item.notes ? ` | Notes: ${item.notes}` : ''}`
    ).join('\n') + (observationsText ? `\n${observationsText}` : '');

    const notesPrompt = `${llmQuoteInstructions}

---

TASK: Write the customer-facing assessment notes for the following job.

DAMAGE BEING REPAIRED:
${damageContext}

OUTPUT: Return a JSON object with a single field "assessment_notes" containing 1–3 sentences of plain text. No bullet points, no headings. Do not include any disclaimer — the system adds that separately.`;

    // [QUOTE-TIMING] instrumentation relocated verbatim from QuoteGeneration.jsx
    console.log(`[QUOTE-TIMING] LLM #2 (assessment notes) start — prompt ${notesPrompt.length} chars`);
    const notesStartTime = performance.now();
    const notesResponse = await base44.integrations.Core.InvokeLLM({
      prompt: notesPrompt,
      model: "gemini_3_8_flash",
      response_json_schema: {
        type: "object",
        properties: {
          assessment_notes: { type: "string" }
        },
        required: ["assessment_notes"]
      }
    });
    console.log(`[QUOTE-TIMING] LLM #2 (assessment notes) done — prompt ${notesPrompt.length} chars, ${(performance.now() - notesStartTime).toFixed(0)}ms`);

    return Response.json(notesResponse);
  } catch (error) {
    console.error('Error in generateAssessmentNotes:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}