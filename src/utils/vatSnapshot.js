/**
 * VAT snapshot helpers.
 *
 * A finalised assessment (any status other than draft) carries a `vat_snapshot`
 * frozen at the moment it first left draft, so later changes to the
 * technician's VAT settings never rewrite historical quotes/invoices.
 * Drafts have no snapshot and read the live UserSetting values.
 */

/**
 * Resolves the VAT context for an assessment: its own frozen snapshot when
 * present, otherwise the live user settings.
 *
 * @param {object} assessment - The assessment record
 * @param {object|null} userSettings - The current user's UserSetting (may be null)
 * @returns {{ isVatRegistered: boolean, vatRate: number }}
 */
export function getVatContext(assessment, userSettings) {
  const snapshot = assessment?.vat_snapshot;
  if (snapshot && typeof snapshot.is_vat_registered === "boolean") {
    return {
      isVatRegistered: snapshot.is_vat_registered,
      vatRate: snapshot.tax_rate || 0,
    };
  }
  return {
    isVatRegistered: !!userSettings?.is_vat_registered,
    vatRate: userSettings?.tax_rate || 0,
  };
}

/**
 * Builds a snapshot from the given (live) settings. Records without a
 * UserSetting default to not registered at a 20% rate — inert, since VAT is
 * never applied when not registered.
 *
 * @param {object|null} userSettings - The current user's UserSetting (may be null)
 * @returns {{ is_vat_registered: boolean, tax_rate: number }}
 */
export function buildVatSnapshot(userSettings) {
  return {
    is_vat_registered: !!userSettings?.is_vat_registered,
    tax_rate: userSettings?.tax_rate ?? 20,
  };
}