/**
 * Display translation layer for damage types.
 * Stored values ("Standard Dent", "Crease") never change.
 * This module provides display labels and reverse mapping only.
 */

const DAMAGE_TYPE_DISPLAY = {
  "Standard Dent": "Round Dent",
  "Crease": "Crease Dent",
};

/**
 * Convert a stored damage type value to its display label.
 * Unknown values are returned as-is.
 */
export const toDisplayDamageType = (stored) => DAMAGE_TYPE_DISPLAY[stored] || stored;

/**
 * Convert a display label back to its stored value.
 * Used on dropdown selection to ensure the stored value is always canonical.
 * Unknown values are returned as-is.
 */
export const toStoredDamageType = (display) => {
  const entry = Object.entries(DAMAGE_TYPE_DISPLAY).find(([, v]) => v === display);
  return entry ? entry[0] : display;
};

/**
 * The base damage types in their STORED form (for internal logic).
 */
export const BASE_DAMAGE_TYPES_STORED = ["Standard Dent", "Crease"];

/**
 * The base damage types as display labels (for UI dropdowns).
 */
export const BASE_DAMAGE_TYPES_DISPLAY = BASE_DAMAGE_TYPES_STORED.map(toDisplayDamageType);