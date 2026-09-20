import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { itemFromPayload, toDisplayDamageType } from "../../shared/llmPayloadValidation.ts";

// ============================================================================
// generateItemDescription — server-side relocation of the per-item quote
// description LLM call. Prompt, the "gemini_3_8_flash" model pin and the
// [QUOTE-TIMING] logs are copied byte-for-byte from
// src/components/assessment/QuoteGeneration.jsx (processItem).
// The payload is strictly validated before the LLM is invoked: only the
// fields validated in llmPayloadValidation are read, so no client-supplied
// prompt or model can reach the LLM.
// ============================================================================

// Same symbol map as getCurrencySymbol() in QuoteGeneration.jsx
const CURRENCY_SYMBOLS = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };

const MAX_PRICE = 1000000;

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

    let item;
    try {
      item = itemFromPayload(body?.item);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 400 });
    }

    const calculatedPrice = body?.calculated_price;
    if (typeof calculatedPrice !== 'number' || !Number.isFinite(calculatedPrice) || calculatedPrice <= 0 || calculatedPrice > MAX_PRICE) {
      return Response.json({ error: `calculated_price must be a number between 0 and ${MAX_PRICE}` }, { status: 400 });
    }
    const currency = body?.currency;
    if (typeof currency !== 'string' || !CURRENCY_SYMBOLS[currency]) {
      return Response.json({ error: 'currency must be one of GBP, USD, EUR, CAD, AUD' }, { status: 400 });
    }
    const currencySymbol = CURRENCY_SYMBOLS[currency];

    // Quote instructions are loaded server-side — the client never supplies them.
    const globalSettingsList = await base44.entities.GlobalSetting.filter({ setting_key: 'main' });
    const llmQuoteInstructions = globalSettingsList?.[0]?.llm_quote_instructions;
    if (!llmQuoteInstructions) {
      return Response.json({ error: 'Quote instructions are not configured' }, { status: 400 });
    }

    // ─── Prompt construction — byte-for-byte from QuoteGeneration.jsx ───────

    const quotePrompt = `${llmQuoteInstructions}

INPUT DATA FOR THIS SINGLE DAMAGE ITEM:

Panel: ${item.panel}
Damage Type: ${toDisplayDamageType(item.damage_type)}
Size Range: ${item.size_range}
Depth: ${item.depth || 'Shallow'}
Material: ${item.material === 'Aluminum' ? 'Aluminium' : item.material || 'Steel'}
Repair Method: ${item.repair_method || 'Good Tool Access'}
Paint Type: ${item.paint_type || 'Standard'}
affects_body_line: ${item.affects_body_line ? 'true' : 'false'}
has_stretched_metal: ${item.has_stretched_metal ? 'true' : 'false'}
aluminium_panel: ${item.material === 'Aluminum' ? 'true' : 'false'}
Technician's Additional Notes: ${item.notes || 'None'}
FINAL CALCULATED PRICE: ${currencySymbol}${calculatedPrice.toFixed(2)} (DO NOT MODIFY)

REQUIRED OUTPUT:
Provide ONLY the line item description as a plain string. Example: "PDR Labour - Rear Door Round Dent Repair (51mm - 80mm, Medium, Body Line Area)"

DO NOT include JSON formatting, quotes, or any other text - just the description string.`;

    // [QUOTE-TIMING] instrumentation relocated verbatim from QuoteGeneration.jsx
    console.log(`[QUOTE-TIMING] LLM #1 (item description) start — prompt ${quotePrompt.length} chars`);
    const tDescStart = performance.now();
    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: quotePrompt,
      model: "gemini_3_8_flash"
    });
    console.log(`[QUOTE-TIMING] LLM #1 (item description) done — prompt ${quotePrompt.length} chars, ${(performance.now() - tDescStart).toFixed(0)}ms`);

    return Response.json(llmResponse);
  } catch (error) {
    console.error('Error in generateItemDescription:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}