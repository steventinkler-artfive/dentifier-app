/**
 * Returns only valid pricing matrix entries — rows with both a damage_type
 * and a size_range. Blank/incomplete rows (e.g. created by "Add Pricing Entry"
 * but never filled in) are excluded so they never reach dropdowns, pricing
 * lookups, or PDF rendering.
 *
 * @param {Array} pricingMatrix - The raw pricing_matrix array from UserSetting
 * @returns {Array} Only entries with a non-empty damage_type and size_range
 */
export function getValidPricingEntries(pricingMatrix) {
  if (!Array.isArray(pricingMatrix)) return [];
  return pricingMatrix.filter(
    entry => entry && entry.damage_type && entry.size_range
  );
}