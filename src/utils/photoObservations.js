/**
 * Normalizes photo observation data from an analysis `_ui` object.
 *
 * Supports two shapes:
 *  - NEW: `photo_observations` keyed by item index string ("0", "1", ...)
 *  - LEGACY: `photo_observation` single string (for assessments stored before the change)
 *
 * Observations equal to the fallback string are filtered out so only
 * meaningful, confident observations are returned.
 *
 * @param {object} ui - The `_ui` object from a damage_analysis record
 * @param {Array} damageItems - The damage items array (used for panel labels + ordering)
 * @returns {Array<{panel: string, observation: string}>}
 */
export function getPhotoObservations(ui, damageItems = []) {
  if (!ui) return [];
  const items = Array.isArray(damageItems) ? damageItems : [];
  const FALLBACK = 'No additional observations from photo analysis.';

  const isMeaningful = (text) =>
    typeof text === 'string' && text.trim().length > 0 && text.trim() !== FALLBACK;

  // New keyed-object format
  if (ui.photo_observations && typeof ui.photo_observations === 'object' && !Array.isArray(ui.photo_observations)) {
    return items
      .map((item, idx) => {
        const obs = ui.photo_observations[String(idx)] || ui.photo_observations[idx];
        return { panel: item?.panel || `Item ${idx + 1}`, observation: obs };
      })
      .filter((o) => isMeaningful(o.observation));
  }

  // Legacy single-string format
  if (isMeaningful(ui.photo_observation)) {
    return [{ panel: items[0]?.panel || 'Damage', observation: ui.photo_observation }];
  }

  return [];
}