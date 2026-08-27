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

/**
 * Computes the VAT-inclusive total to display for an assessment, matching the
 * calculation on the quote/invoice detail screen.
 *
 * net subtotal = total_amount (if set) otherwise quote_amount minus the discount
 * VAT         = is_vat_registered ? net * tax_rate / 100 : 0
 * displayed    = net + VAT
 *
 * @param {object} assessment - The assessment record
 * @param {object|null} userSettings - The current user's UserSetting (may be null)
 * @returns {number} The total amount to display (net + VAT)
 */
export function calcDisplayTotal(assessment, userSettings) {
  const qAmt = assessment?.quote_amount || 0;
  const sub = (assessment?.total_amount ?? (qAmt - (qAmt * (assessment?.discount_percentage || 0) / 100))) || 0;
  const vat = userSettings?.is_vat_registered ? (sub * (userSettings.tax_rate || 0)) / 100 : 0;
  return sub + vat;
}