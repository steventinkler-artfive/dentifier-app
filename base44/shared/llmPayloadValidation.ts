// ============================================================================
// Shared payload-validation helpers for the LLM backend wrappers:
// analyzeDamage, generateItemDescription, generateAssessmentNotes.
// Only the fields validated here are ever read from client payloads, so no
// client-supplied prompt or model can reach the LLM.
// ============================================================================

// Display translation for damage types — byte-identical to src/utils/damageTypeDisplay.js
export const DAMAGE_TYPE_DISPLAY = {
  "Standard Dent": "Round Dent",
  "Crease": "Crease Dent",
};

export const toDisplayDamageType = (stored) => DAMAGE_TYPE_DISPLAY[stored] || stored;

function pick(raw, field, maxLen, required) {
  const v = raw[field];
  if (v === undefined || v === null || v === '') {
    if (required) throw new Error(`Damage item field "${field}" is required`);
    return undefined;
  }
  if (typeof v !== 'string' || v.length > maxLen) {
    throw new Error(`Damage item field "${field}" must be a string of at most ${maxLen} characters`);
  }
  return v;
}

function pickBool(raw, field) {
  const v = raw[field];
  if (v === undefined || v === null) return false;
  if (typeof v !== 'boolean') throw new Error(`Damage item field "${field}" must be a boolean`);
  return v;
}

export function itemFromPayload(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Each damage item must be an object');
  return {
    panel: pick(raw, 'panel', 100, true),
    damage_type: pick(raw, 'damage_type', 60),
    size_range: pick(raw, 'size_range', 60),
    depth: pick(raw, 'depth', 40),
    material: pick(raw, 'material', 40),
    repair_method: pick(raw, 'repair_method', 40),
    paint_type: pick(raw, 'paint_type', 40),
    affects_body_line: pickBool(raw, 'affects_body_line'),
    has_stretched_metal: pickBool(raw, 'has_stretched_metal'),
    notes: pick(raw, 'notes', 500)
  };
}