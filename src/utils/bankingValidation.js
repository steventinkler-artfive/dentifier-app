// Shared UK banking field validation helpers used by both the
// OnboardingWizard banking step and the Settings banking card.

/** Strip non-digits and format a sort code as XX-XX-XX (max 6 digits). */
export function formatSortCode(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}

/** Account number must be exactly 8 numeric digits. */
export function isValidAccountNumber(value) {
  return /^\d{8}$/.test((value || '').trim());
}

/** Sort code must be 6 digits in XX-XX-XX form. */
export function isValidSortCode(value) {
  return /^\d{2}-\d{2}-\d{2}$/.test((value || '').trim());
}

/** True only when all three required banking fields are present AND valid. */
export function isValidBanking(data) {
  return !!(
    (data?.bank_account_name || '').trim() &&
    isValidAccountNumber(data?.bank_account_number) &&
    isValidSortCode(data?.bank_sort_code)
  );
}

/**
 * True when the user has started entering banking details but they are
 * incomplete/invalid. Empty banking fields are NOT an error (user can skip),
 * but partial/invalid entries block saving/proceeding.
 */
export function hasBankingErrors(data) {
  const acc = (data?.bank_account_number || '').trim();
  const sort = (data?.bank_sort_code || '').trim();
  const name = (data?.bank_account_name || '').trim();
  if (acc || sort || name) {
    return !isValidBanking(data);
  }
  return false;
}