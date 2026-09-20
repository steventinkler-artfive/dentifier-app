/**
 * MIRRORED CONSTANT — READ THIS BEFORE EDITING.
 *
 * The Set A default pricing matrix below is DUPLICATED in the backend seeding
 * function at base44/functions/ensureUserSetting/entry.ts. Backend functions
 * cannot import from src/, so the two copies must be maintained by hand.
 * Changing one requires changing the other — four diverging copies of this
 * matrix are what caused the pricing inconsistencies this module exists to
 * fix. Any price, size range or damage type changed here must be changed
 * there in the same edit.
 */

// Set A — 17 rows: Standard Dent across all 10 standard size ranges,
// Crease across the first 7. Stored strings are the canonical stored values
// ("Standard Dent" / "Crease"); UI display goes through toDisplayDamageType().
export const DEFAULT_PRICING_MATRIX = [
  { damage_type: "Standard Dent", size_range: "up to 10mm", base_price: 60 },
  { damage_type: "Standard Dent", size_range: "11mm - 25mm", base_price: 90 },
  { damage_type: "Standard Dent", size_range: "26mm - 50mm", base_price: 120 },
  { damage_type: "Standard Dent", size_range: "51mm - 80mm", base_price: 180 },
  { damage_type: "Standard Dent", size_range: "81mm - 120mm", base_price: 240 },
  { damage_type: "Standard Dent", size_range: "121mm - 200mm", base_price: 300 },
  { damage_type: "Standard Dent", size_range: "201mm - 300mm", base_price: 360 },
  { damage_type: "Standard Dent", size_range: "301mm - 500mm", base_price: 450 },
  { damage_type: "Standard Dent", size_range: "501mm - 750mm", base_price: 550 },
  { damage_type: "Standard Dent", size_range: "751mm - 1000mm (or larger)", base_price: 650 },
  { damage_type: "Crease", size_range: "11mm - 25mm", base_price: 130 },
  { damage_type: "Crease", size_range: "26mm - 50mm", base_price: 170 },
  { damage_type: "Crease", size_range: "51mm - 80mm", base_price: 250 },
  { damage_type: "Crease", size_range: "81mm - 120mm", base_price: 330 },
  { damage_type: "Crease", size_range: "121mm - 200mm", base_price: 415 },
  { damage_type: "Crease", size_range: "201mm - 300mm", base_price: 500 },
  { damage_type: "Crease", size_range: "301mm - 500mm", base_price: 620 }
];

// Base damage types in PhotoCapture dropdown order; custom types follow in
// creation order.
export const BASE_DAMAGE_TYPES = ["Standard Dent", "Crease"];

// Sort number for a size range: the first number in the string
// ("up to 10mm" → 10, "2000mm (or larger)" → 2000). Ranges with no number
// sort last.
export const getSizeSortNumber = (sizeRange) => {
  if (!sizeRange) return Infinity;
  const match = String(sizeRange).match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : Infinity;
};

// Numeric sort for a list of size range strings. Returns a new array.
export const sortBySizeNumber = (ranges) =>
  [...(ranges || [])].sort((a, b) => {
    const diff = getSizeSortNumber(a) - getSizeSortNumber(b);
    if (diff !== 0) return diff;
    return String(a).localeCompare(String(b));
  });

/**
 * Sort a stored pricing matrix for saving: base damage types in the
 * PhotoCapture dropdown order, then custom types in creation order, then
 * numerically by first size number. Stable — rows equal on both keys keep
 * their current order. Returns a new array; the input is untouched.
 */
export const sortPricingMatrix = (matrix, customDamageTypes = []) => {
  const typeRank = new Map();
  [...BASE_DAMAGE_TYPES, ...(customDamageTypes || [])].forEach((type, idx) => {
    if (!typeRank.has(type)) typeRank.set(type, idx);
  });
  let unknownRank = typeRank.size;
  return [...(matrix || [])]
    .map((entry, idx) => {
      const type = entry.damage_type;
      if (!typeRank.has(type)) {
        typeRank.set(type, unknownRank++);
      }
      return { entry, idx, typeRank: typeRank.get(type), sizeNum: getSizeSortNumber(entry.size_range) };
    })
    .sort((a, b) =>
      a.typeRank - b.typeRank || a.sizeNum - b.sizeNum || a.idx - b.idx
    )
    .map((wrapped) => wrapped.entry);
};