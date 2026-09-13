/**
 * Shared client-side search and vehicle-line formatting for the
 * Quotes and Invoices screens.
 *
 * Search activates at 2+ characters and matches:
 *   1. Customer name (contact or business name)
 *   2. Vehicle registration (normalised — lowercased, all non-alphanumeric
 *      characters stripped on both sides, so "AB12-CDE" matches "AB12 CDE")
 *   3. Make / 4. Model (via the vehicle lookup for standard assessments)
 *   5. Make & Model free text (vehicles[].notes — rendered verbatim,
 *      never parsed or reformatted)
 *   6. Quote number / 7. Invoice number (prefix-less digit match:
 *      "Q-0217" is found by "Q-0217", "0217" and "217")
 */

export const LIST_CEILING = 2000;

export const ASSESSMENT_LIST_FIELDS = [
  'status',
  'quote_number',
  'invoice_number',
  'customer_id',
  'currency',
  'quote_amount',
  'total_amount',
  'discount_percentage',
  'vat_snapshot',
  'sent_date',
  'payment_status',
  'is_multi_vehicle',
  'vehicle_id',
  'vehicles',
];

const MIN_TERM_LENGTH = 2;
const MAX_SHORT_LIST_LENGTH = 28;

export function normaliseRegistration(value) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Digits with leading zeros stripped — "Q-0217" and "0217" both become "217"
function normaliseNumberDigits(value) {
  return (value || '').replace(/\D/g, '').replace(/^0+/, '');
}

function containsIgnoreCase(value, term) {
  if (!value) return false;
  return String(value).toLowerCase().includes(term.toLowerCase());
}

function registrationMatches(stored, term) {
  const s = normaliseRegistration(stored);
  const t = normaliseRegistration(term);
  return s.length > 0 && t.length > 0 && s.includes(t);
}

/**
 * Vehicle entries for an assessment in card order. Entries that resolve to a
 * Vehicle record are "standard"; panel-quote entries (no resolvable
 * vehicle_id) carry their registration and free-text notes verbatim.
 */
export function buildVehicleEntries(assessment, vehiclesLookup = {}) {
  const entries = [];
  if (assessment.vehicles && assessment.vehicles.length > 0) {
    assessment.vehicles.forEach((entry, index) => {
      const record = entry.vehicle_id ? vehiclesLookup[entry.vehicle_id] : null;
      if (record) {
        entries.push({
          index,
          type: 'standard',
          record,
          registration: record.license_plate || entry.registration || null,
          details: [record.year, record.make, record.model].filter(Boolean).join(' ') || null,
          notes: entry.notes || null,
        });
      } else {
        entries.push({
          index,
          type: 'panel',
          record: null,
          registration: entry.registration || null,
          details: entry.notes || null,
          notes: entry.notes || null,
        });
      }
    });
  } else if (assessment.vehicle_id) {
    const record = vehiclesLookup[assessment.vehicle_id];
    if (record) {
      entries.push({
        index: 0,
        type: 'standard',
        record,
        registration: record.license_plate || null,
        details: [record.year, record.make, record.model].filter(Boolean).join(' ') || null,
        notes: null,
      });
    }
  }
  return entries;
}

/**
 * Matches one assessment against the search term. Returns null when nothing
 * matches, otherwise { vehicleMatch } — vehicleMatch is set when a vehicle
 * field matched: { field, index, isRegistrationMatch }.
 */
export function matchAssessment(assessment, rawTerm, { customers = {}, vehicles: vehiclesLookup = {} } = {}) {
  const term = (rawTerm || '').trim();
  if (term.length < MIN_TERM_LENGTH) return null;

  let isMatch = false;

  // 1. Customer name
  const customer = customers[assessment.customer_id];
  if (customer && (containsIgnoreCase(customer.name, term) || containsIgnoreCase(customer.business_name, term))) {
    isMatch = true;
  }

  // 6. Quote number / 7. Invoice number — prefix-less digit match
  const termDigits = normaliseNumberDigits(term);
  if (termDigits) {
    if (assessment.quote_number && normaliseNumberDigits(assessment.quote_number) === termDigits) isMatch = true;
    if (assessment.invoice_number && normaliseNumberDigits(assessment.invoice_number) === termDigits) isMatch = true;
  }

  // 2–5. Vehicle fields
  const entries = buildVehicleEntries(assessment, vehiclesLookup);
  let vehicleMatch = null;

  for (const entry of entries) {
    if (registrationMatches(entry.registration, term)) {
      vehicleMatch = { field: 'registration', index: entry.index, isRegistrationMatch: true };
      break;
    }
  }
  if (!vehicleMatch) {
    for (const entry of entries) {
      if (entry.record && containsIgnoreCase(entry.record.make, term)) {
        vehicleMatch = { field: 'make', index: entry.index, isRegistrationMatch: false };
        break;
      }
    }
  }
  if (!vehicleMatch) {
    for (const entry of entries) {
      if (entry.record && containsIgnoreCase(entry.record.model, term)) {
        vehicleMatch = { field: 'model', index: entry.index, isRegistrationMatch: false };
        break;
      }
    }
  }
  if (!vehicleMatch) {
    for (const entry of entries) {
      if (containsIgnoreCase(entry.notes, term)) {
        vehicleMatch = { field: 'notes', index: entry.index, isRegistrationMatch: false };
        break;
      }
    }
  }

  if (!isMatch && !vehicleMatch) return null;
  return { vehicleMatch };
}

export function searchAssessments(assessments, term, lookups) {
  const results = [];
  for (const assessment of assessments) {
    const match = matchAssessment(assessment, term, lookups);
    if (match) results.push({ assessment, match });
  }
  return results;
}

/**
 * Builds the card vehicle line per the agreed count-based rules:
 *   1 vehicle   → the vehicle's details
 *   2–3         → short comma-separated list ("first +N more" when too long)
 *   4 or more   → the count only, e.g. "6 vehicles"
 *
 * When a vehicle field matched during search on a multi-vehicle record, also
 * returns the matched vehicle line, e.g.
 *   "AB12 CDE — 2021 Ford Focus (3 of 10 vehicles)"
 */
export function getVehicleLineInfo(assessment, vehiclesLookup = {}, vehicleMatch = null) {
  const entries = buildVehicleEntries(assessment, vehiclesLookup);
  if (entries.length === 0) {
    return { count: 0, text: null, matchedLine: null };
  }

  const composeWithRegistration = (entry) =>
    [entry.registration, entry.details].filter(Boolean).join(' — ') || null;

  let text;
  if (entries.length === 1) {
    const entry = entries[0];
    text = entry.type === 'standard' ? (entry.details || entry.registration) : composeWithRegistration(entry);
  } else if (entries.length <= 3) {
    const labels = entries
      .map((entry) => (entry.type === 'standard' ? entry.details : (entry.details || entry.registration)))
      .filter(Boolean);
    const joined = labels.join(', ');
    text = !joined
      ? `${entries.length} vehicles`
      : joined.length > MAX_SHORT_LIST_LENGTH && labels.length > 1
        ? `${labels[0]} +${labels.length - 1} more`
        : joined;
  } else {
    text = `${entries.length} vehicles`;
  }

  let matchedLine = null;
  if (vehicleMatch && entries.length > 1) {
    const entry = entries.find((e) => e.index === vehicleMatch.index);
    if (entry) {
      const composed = composeWithRegistration(entry) || 'Vehicle';
      matchedLine = `${composed} (${entry.index + 1} of ${entries.length} vehicles)`;
    }
  }

  return { count: entries.length, text, matchedLine };
}