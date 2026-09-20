import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, CheckCircle, Trash2, AlertTriangle, Settings } from "lucide-react";

import { calculateEstimatedTimeRange } from "@/utils/timeEstimate";
import { toDisplayDamageType } from "@/utils/damageTypeDisplay";
import { getPhotoObservations } from "@/utils/photoObservations";
import { getValidPricingEntries } from "@/utils/pricing";
import UnpricedItemsCard from "@/components/assessment/UnpricedItemsCard";

// ============================================================================
// PROGRAMMATIC PRICING CALCULATION FUNCTIONS
// ============================================================================

/**
 * Determines if this damage needs tool finishing (not just glue pulling)
 */
function assessToolFinishingNeeded(damageItem) {
  return (
    damageItem.depth === "Deep/Sharp" ||
    damageItem.affects_body_line === true ||
    damageItem.damage_type === "Crease" ||
    damageItem.has_stretched_metal === true
  );
}

/**
 * Calculates the repair method multiplier based on damage characteristics
 * This is CONDITIONAL - varies based on whether tool finishing is needed
 */
function calculateRepairMethodMultiplier(damageItem) {
  switch(damageItem.repair_method) {
    case "Good Tool Access":
      return 1.0;
      
    case "Glue Pull Only":
      return 1.25;

    case "Limited Tool Access":
      return 1.30;
      
    case "Unsure":
      return 1.10;
      
    default:
      return 1.1;
  }
}

/**
 * Extract numeric size from size range string
 * Returns the midpoint of the range for interpolation purposes
 */
function extractNumericSize(sizeRange) {
  // Extract all numbers from the string
  const numbers = sizeRange.match(/(\d+)/g);
  if (!numbers || numbers.length === 0) return 50; // default fallback if no numbers found
  
  // If we have two numbers (a range), return the midpoint
  if (numbers.length >= 2) {
    const min = parseInt(numbers[0]);
    const max = parseInt(numbers[1]);
    return (min + max) / 2;
  }
  
  // If we have one number, return it
  return parseInt(numbers[0]);
}

/**
 * Calculate average price increment per mm from data points for a specific damage type.
 * Used for extrapolation in `lookupPricingMatrix`.
 */
function calculateAverageIncrement(sortedEntries) {
  if (sortedEntries.length < 2) return 0;
  
  const increments = [];
  for (let i = 1; i < sortedEntries.length; i++) {
    const sizeDiff = sortedEntries[i].sizeInMm - sortedEntries[i-1].sizeInMm;
    // Changed from base_price to price as per normalization
    const priceDiff = sortedEntries[i].price - sortedEntries[i-1].price;
    
    if (sizeDiff > 0) {
      increments.push(priceDiff / sizeDiff);
    }
  }
  
  const positiveIncrements = increments.filter(inc => inc >= 0);
  if (positiveIncrements.length === 0) return 0;
  
  return positiveIncrements.reduce((sum, inc) => sum + inc, 0) / positiveIncrements.length;
}

/**
 * Get the base price from a matrix entry, handling both old and new structures
 * OLD: { steel_price, aluminum_price }
 * NEW: { base_price }
 */
function getEntryBasePrice(entry, material) {
  // New structure - single base_price field
  if (entry.base_price !== undefined && entry.base_price !== null) {
    return entry.base_price;
  }
  
  // Old structure - separate steel_price and aluminum_price fields
  if (material === "Aluminum" && entry.aluminum_price !== undefined && entry.aluminum_price !== null) {
    return entry.aluminum_price;
  }
  
  if (entry.steel_price !== undefined && entry.steel_price !== null) {
    return entry.steel_price;
  }
  
  return null;
}

/**
 * Lookup pricing from matrix with intelligent fallback
 * HANDLES BOTH OLD AND NEW MATRIX STRUCTURES
 */
function lookupPricingMatrix(pricingMatrix, damageType, sizeRange, material, hourlyRate) {
  const normalizedDamageType = (damageType || '').trim();
  const normalizedSizeRange = (sizeRange || '').trim().replace(/\s+/g, ' ');
  
  // Filter matrix for matching damage type with valid price
  const typeEntries = pricingMatrix.filter(entry => {
    const entryType = (entry.damage_type || '').trim();
    const basePrice = getEntryBasePrice(entry, material);
    return entryType === normalizedDamageType && basePrice > 0;
  });
  
  // Normalize entries to use consistent 'price' field
  const normalizedTypeEntries = typeEntries.map(entry => ({
    ...entry,
    price: getEntryBasePrice(entry, material)
  }));
  
  if (normalizedTypeEntries.length === 0) {
    // Fix 1: never invent a price or fabricate a matrix entry. Pre-generation
    // validation blocks this case before any calculation; this throw is the
    // defensive backstop and surfaces through the per-item warning path
    // (fallbackUsed), which the breakdown card shows as an unmissable warning.
    throw new Error(`No matrix price for ${damageType} (${sizeRange}) — add a price in Settings or change the damage type`);
  }
  
  // Look for exact match
  const exactMatch = normalizedTypeEntries.find(entry => {
    const entryRange = (entry.size_range || '').trim();
    const match = entryRange === normalizedSizeRange;
    console.log(`  Size range "${entryRange}" === "${normalizedSizeRange}": ${match}, price: ${entry.price}`);
    return match;
  });
  
  if (exactMatch) {
    console.log(`  ✅ EXACT MATCH FOUND: ${exactMatch.damage_type} ${exactMatch.size_range} = £${exactMatch.price}`);
    return {
      price: exactMatch.price,
      matrixEntry: {
        damage_type: exactMatch.damage_type,
        size_range: exactMatch.size_range,
        base_price: exactMatch.price // Ensure matrixEntry returns base_price for consistency
      },
      isEstimate: false
    };
  }
  
  console.log('  ⚠️ NO EXACT MATCH: Using interpolation/extrapolation');
  
  // No exact match - use interpolation/extrapolation
  const requestedNumericSize = extractNumericSize(sizeRange);
  
  // Sort entries by size
  const sortedEntries = normalizedTypeEntries
    .map(entry => ({
      ...entry,
      sizeInMm: extractNumericSize(entry.size_range)
    }))
    .sort((a, b) => a.sizeInMm - b.sizeInMm);
  
  // Find surrounding entries
  let lowerEntry = null;
  let upperEntry = null;
  
  for (let i = 0; i < sortedEntries.length; i++) {
    if (sortedEntries[i].sizeInMm <= requestedNumericSize) {
      lowerEntry = sortedEntries[i];
    }
    if (sortedEntries[i].sizeInMm >= requestedNumericSize && !upperEntry) {
      upperEntry = sortedEntries[i];
      break;
    }
  }
  
  if (lowerEntry && upperEntry && lowerEntry.sizeInMm !== upperEntry.sizeInMm) {
    // Interpolate
    const sizeDiff = upperEntry.sizeInMm - lowerEntry.sizeInMm;
    const priceDiff = upperEntry.price - lowerEntry.price; // Use .price
    const sizeOffset = requestedNumericSize - lowerEntry.sizeInMm;
    const interpolatedPrice = lowerEntry.price + (priceDiff * sizeOffset / sizeDiff); // Use .price
    
    console.log(`  📊 INTERPOLATED: £${interpolatedPrice.toFixed(2)}`);
    
    return {
      price: Math.max(50, Math.round(interpolatedPrice / 5) * 5),
      matrixEntry: {
        damage_type: lowerEntry.damage_type,
        size_range: `${lowerEntry.size_range} to ${upperEntry.size_range}`,
        base_price: Math.max(50, Math.round(interpolatedPrice / 5) * 5)
      },
      isEstimate: true,
      fallbackReason: `Interpolated from ${lowerEntry.size_range} - ${upperEntry.size_range}`
    };
  }
  
  if (lowerEntry && !upperEntry) {
    // Extrapolate upward
    const avgIncrement = calculateAverageIncrement(sortedEntries);
    const sizeDiff = requestedNumericSize - lowerEntry.sizeInMm;
    const extrapolatedPrice = lowerEntry.price + (avgIncrement * sizeDiff); // Use .price
    
    console.log(`  📈 EXTRAPOLATED UP: £${extrapolatedPrice.toFixed(2)}`);
    
    return {
      price: Math.max(lowerEntry.price + 50, Math.round(extrapolatedPrice / 5) * 5), // Use .price
      matrixEntry: {
        damage_type: lowerEntry.damage_type,
        size_range: lowerEntry.size_range,
        base_price: Math.max(lowerEntry.price + 50, Math.round(extrapolatedPrice / 5) * 5) // Use .price
      },
      isEstimate: true,
      fallbackReason: `Extrapolated up from ${lowerEntry.size_range}`
    };
  }
  
  if (!lowerEntry && upperEntry) {
    // Extrapolate downward
    const avgIncrement = calculateAverageIncrement(sortedEntries);
    const sizeDiff = upperEntry.sizeInMm - requestedNumericSize;
    const extrapolatedPrice = upperEntry.price - (avgIncrement * sizeDiff); // Use .price
    
    console.log(`  📉 EXTRAPOLATED DOWN: £${extrapolatedPrice.toFixed(2)}`);
    
    return {
      price: Math.max(hourlyRate * 0.5, 50, Math.round(extrapolatedPrice / 5) * 5),
      matrixEntry: {
        damage_type: upperEntry.damage_type,
        size_range: upperEntry.size_range,
        base_price: Math.max(hourlyRate * 0.5, 50, Math.round(extrapolatedPrice / 5) * 5)
      },
      isEstimate: true,
      fallbackReason: `Extrapolated down from ${upperEntry.size_range}`
    };
  }

  // Single entry scaling
  if (sortedEntries.length === 1) {
    const point = sortedEntries[0];
    const sizeRatio = requestedNumericSize / point.sizeInMm;
    const cappedRatio = Math.pow(sizeRatio, 0.7);
    const scaledPrice = point.price * cappedRatio; // Use .price
    
    console.log(`  🔄 SCALED: £${scaledPrice.toFixed(2)}`);
    
    return {
      price: Math.max(50, Math.round(scaledPrice / 5) * 5),
      matrixEntry: {
        damage_type: point.damage_type,
        size_range: point.size_range,
        base_price: Math.max(50, Math.round(scaledPrice / 5) * 5)
      },
      isEstimate: true,
      fallbackReason: `Scaled from single entry ${point.size_range}`
    };
  }

  // Fix 1: rows exist for this type but none can produce a price for this size
  // (e.g. duplicate or unreadable size ranges). Never invent a price — surface
  // it through the per-item warning path (fallbackUsed).
  throw new Error(`Matrix rows for ${damageType} could not produce a price for ${sizeRange} — check for duplicate or unreadable size ranges in Settings`);
}


/**
 * Master function: Calculates complete price for a single damage item
 */
function calculateDamageItemPrice(damageItem, hourlyRate, pricingMatrix) {
  // STEP 1: Matrix Lookup
  const { price: baseMatrixPrice, matrixEntry, isEstimate, fallbackReason } = lookupPricingMatrix(
    pricingMatrix,
    damageItem.damage_type,
    damageItem.size_range,
    damageItem.material,
    hourlyRate
  );
  
  const safeBaseMatrixPrice = Math.max(baseMatrixPrice, 50);
  
  // STEP 1.5: Apply Aluminum Modifier if needed
  // If the pricing matrix uses the new 'base_price' field, then the base price retrieved is for steel.
  // In this case, we need to apply the aluminum multiplier.
  // If the pricing matrix uses the old 'steel_price'/'aluminum_price' fields, then lookupPricingMatrix
  // already returns the material-specific price, so no additional multiplier is needed here.
  const usingNewStructure = pricingMatrix.length > 0 && pricingMatrix[0].base_price !== undefined;
  const materialMultiplier = usingNewStructure
    ? (damageItem.material === "Aluminum" ? 1.35 : damageItem.material === "HS Steel" ? 1.25 : 1.0)
    : 1.0;
  const basePrice = safeBaseMatrixPrice * materialMultiplier;
  
  // STEP 2: Calculate All Complexity Multipliers
  const repairMethodMultiplier = calculateRepairMethodMultiplier(damageItem);
  
  const depthMultiplier = {
    "Shallow": 1.0,
    "Medium": 1.25,
    "Deep / Sharp": 1.5,
  }[damageItem.depth] || 1.0;
  
  let bodyLineMultiplier = 1.0;
  if (damageItem.affects_body_line) {
    bodyLineMultiplier = (repairMethodMultiplier > 1.3) ? 1.1 : 1.2;
  }
  
  const stretchedMetalMultiplier = damageItem.has_stretched_metal ? 1.25 : 1.0;
  
  const paintTypeMultiplier = {
    "Standard": 1.0,
    "Matt": 1.40,
    "PPF": 1.30,
    "Wrap": 1.30
  }[damageItem.paint_type] || 1.0;
  
  let notesMultiplier = 1.0;
  const notes = (damageItem.notes || "").toLowerCase();
  
  if (notes.includes("previous repair") || notes.includes("poor repair")) {
    notesMultiplier *= 1.25;
  }
  
  // STEP 3: Combine All Complexity Multipliers
  let totalComplexityMultiplier = 
    repairMethodMultiplier * 
    depthMultiplier * 
    bodyLineMultiplier * 
    stretchedMetalMultiplier * 
    paintTypeMultiplier *
    notesMultiplier;
  
  totalComplexityMultiplier = Math.min(totalComplexityMultiplier, 2.5);
  
  // STEP 4: Apply Multipliers to PRICE
  const adjustedPrice = basePrice * totalComplexityMultiplier;
  const totalPrice = Math.round(adjustedPrice / 5) * 5;
  
  // STEP 5: Calculate Estimated Hours for Tech Reference
  const estimatedHoursForTech = totalPrice / hourlyRate;
  const roundedHoursForTech = Math.round(estimatedHoursForTech * 2) / 2;
  
  // STEP 6: Return Complete Result
  return {
    damageType: damageItem.damage_type,
    panel: damageItem.panel,
    sizeRange: damageItem.size_range,
    material: damageItem.material,
    depth: damageItem.depth,
    affectsBodyLine: damageItem.affects_body_line,
    hasStretchedMetal: damageItem.has_stretched_metal,
    repairMethod: damageItem.repair_method,
    paintType: damageItem.paint_type || 'Standard',
    notes: damageItem.notes,
    matrixEntry: matrixEntry,
    isEstimate: isEstimate,
    fallbackReason: fallbackReason,
    baseSteelPrice: safeBaseMatrixPrice, // Now represents the price from matrix before material multiplier (if new structure) or after (if old structure)
    materialMultiplier: materialMultiplier,
    basePrice: basePrice,
    hourlyRate: hourlyRate,
    multipliers: {
      material: materialMultiplier,
      repairMethod: repairMethodMultiplier,
      depth: depthMultiplier,
      bodyLine: bodyLineMultiplier,
      stretchedMetal: stretchedMetalMultiplier,
      paintType: paintTypeMultiplier,
      notes: notesMultiplier,
      totalComplexity: totalComplexityMultiplier
    },
    adjustedPrice: adjustedPrice,
    totalPrice: totalPrice,
    estimatedHoursForTech: estimatedHoursForTech,
    roundedHoursForTech: roundedHoursForTech
  };
}

/**
 * Determines the outcome-caveat type for a damage item.
 * Computed in code so the notes LLM never infers hedging from depth or
 * repair method on its own — the prompt consumes this value verbatim.
 */
function getCaveatType(damageItem) {
  if (damageItem.has_stretched_metal) return 'stretched_metal';
  if (damageItem.repair_method === 'Limited Tool Access') return 'limited_access';
  if (damageItem.depth === 'Deep / Sharp') return 'deep_depth';
  if (damageItem.depth === 'Medium') return 'medium_depth';
  return 'none';
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

const PER_PANEL_DISCLAIMER = `Repair carried out using standard PDR tooling and/or glue pulling techniques as appropriate to the damage. Final result dependent on paint condition and damage characteristics assessed on the day.\n\nPLEASE NOTE: PDR is a non-destructive process, however pre-existing paint or panel conditions may become apparent during repair. By proceeding, the vehicle owner accepts that the technician cannot be held liable for any such pre-existing conditions.`;

// TEMPORARY timing instrumentation — log output only, no behaviour change. Remove once latency is diagnosed.
const QT = (label, detail) => console.log(`[QUOTE-TIMING] ${label}${detail ? ` — ${detail}` : ''}`);

export default function QuoteGeneration({
  customer,
  vehicle,
  analysis,
  photos,
  damageItems = [],
  additionalLineItems = [],
  vehicleCards = [],
  jobPanelPrice = null,
  onAddAnotherVehicle,
  onFinalSave,
  isPerPanelPricing = false,
  isMultiVehicleMode = false,
  autoSave = false
}) {
  const navigate = useNavigate();
  const mountTimeRef = useRef(performance.now());
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [calculationBreakdown, setCalculationBreakdown] = useState([]);
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [currency, setCurrency] = useState('GBP');
  const [notes, setNotes] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(null); // string range or null
  const [userSettings, setUserSettings] = useState(null);
  const [error, setError] = useState(null);
  const [quoteGenerated, setQuoteGenerated] = useState(false);
  const [autoSaveTriggered, setAutoSaveTriggered] = useState(false);
  const [vehicleSections, setVehicleSections] = useState([]);
  const [unpricedItems, setUnpricedItems] = useState([]); // Fix 1: items blocked because their damage type has no matrix price

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const t0 = performance.now();
        QT('mounted — settings reads starting');
        // 2a: auth.me and the global settings read are independent of each other,
        // so they run in parallel; the user settings read needs the email from
        // auth.me and therefore runs once that resolves.
        const [user, globalSettingsList] = await Promise.all([
          base44.auth.me(),
          base44.entities.GlobalSetting.filter({ setting_key: 'main' })
        ]);
        const t1 = performance.now();
        QT('auth.me + GlobalSetting.filter (parallel)', `${(t1 - t0).toFixed(0)}ms`);
        const settings = await base44.entities.UserSetting.filter({ user_email: user.email }, 'created_date');
        const t2 = performance.now();
        QT('UserSetting.filter', `${(t2 - t1).toFixed(0)}ms — settings reads total ${(t2 - t0).toFixed(0)}ms, elapsed since mount ${(t2 - mountTimeRef.current).toFixed(0)}ms`);
        const globalSettings = globalSettingsList.length > 0 ? globalSettingsList[0] : null;
        if (settings.length > 0) {
          console.log('📋 LOADED USER SETTINGS:', {
            pricingMatrixLength: settings[0].pricing_matrix?.length,
            pricingMatrixSample: settings[0].pricing_matrix?.slice(0, 3)
          });
          // Attach global settings to user settings for access in quote generation
          const settingsWithGlobal = { ...settings[0], _globalSettings: globalSettings };
          setUserSettings(settingsWithGlobal);
          setCurrency(settings[0].currency || 'GBP');
        } else {
          setError('User settings not found. Please configure your settings first.');
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load user settings. Please check your settings page.');
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (userSettings && !generating && !quoteGenerated && !error && unpricedItems.length === 0) {
      generateQuote();
    }
  }, [userSettings, generating, quoteGenerated, error, unpricedItems]);

  // Auto-save once quote is generated (single-vehicle flow from analysis screen, or per-panel multi-vehicle)
  useEffect(() => {
    if (quoteGenerated && !generating && !autoSaveTriggered) {
      if (autoSave && lineItems.length > 0) {
        setAutoSaveTriggered(true);
        handleFinalSave();
      } else if (isPerPanelPricing && vehicleSections.length > 0) {
        setAutoSaveTriggered(true);
        handleFinalSave();
      }
    }
  }, [autoSave, quoteGenerated, generating, lineItems, isPerPanelPricing, vehicleSections]);

  // The quote total is set synchronously at every point lineItems changes
  // (generation, fallback, and the manual edit handlers below) — it is NOT
  // derived via an effect, so no reader can observe a stale total relative
  // to the line items. Same reduce the previous derived effect used: identical
  // source and arithmetic.
  const sumLineItems = (items) => items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);

  const generateQuote = async () => {
    if (!userSettings) {
      setError('Missing user settings');
      setQuoteGenerated(true);
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      if (isPerPanelPricing) {
        const defaultPanelPrice = jobPanelPrice || userSettings.default_panel_price || 120;
        const baseCost = userSettings.base_cost || 0;

        // Multi-vehicle per-panel mode (new flow)
        if (vehicleCards && vehicleCards.length > 0) {
          const sections = vehicleCards.map((card, idx) => {
            const label = card.registration
              ? [card.registration, card.colour, card.notes].filter(Boolean).join(' — ')
              : `Vehicle ${idx + 1}`;
            const items = (card.panels || []).filter(p => p.panel).map(p => ({
              description: `PDR Labour - ${p.panel}${p.notes ? `: ${p.notes}` : ''}`,
              quantity: 1,
              unit_price: defaultPanelPrice,
              total_price: defaultPanelPrice
            }));
            const subtotal = items.reduce((s, i) => s + i.total_price, 0);
            return { label, items, subtotal };
          });
          setVehicleSections(sections);
          setNotes(PER_PANEL_DISCLAIMER);
          setQuoteGenerated(true);
          setGenerating(false);
          return;
        }

        // Single-vehicle per-panel (legacy photos flow)
        const simpleLineItems = damageItems.map((item, index) => ({
          description: `PDR Labour - ${item.panel}${item.notes ? `: ${item.notes}` : ''}`,
          quantity: 1,
          unit_price: defaultPanelPrice,
          total_price: defaultPanelPrice
        }));

        if (baseCost > 0) {
          simpleLineItems.unshift({
            description: 'Base Cost / Call-out Fee',
            quantity: 1,
            unit_price: baseCost,
            total_price: baseCost
          });
        }

        if (additionalLineItems && additionalLineItems.length > 0) {
          additionalLineItems.forEach(li => simpleLineItems.push(li));
        }

        setLineItems(simpleLineItems);
        setCalculationBreakdown([]);
        setEstimatedTime(null); // No time estimate for per-panel
        setNotes(PER_PANEL_DISCLAIMER);
        setQuoteGenerated(true);
        setGenerating(false);
        return;
      }

      const hourlyRate = userSettings.hourly_rate || 70;
      const baseCost = userSettings.base_cost || 0;
      const pricingMatrix = getValidPricingEntries(userSettings.pricing_matrix || []);
      const globalSettings = userSettings._globalSettings;

      // Fix 1: a damage type with no valid matrix row must never produce a price.
      // Validate every item BEFORE any LLM call, auto-save or state change, and
      // block generation naming the exact combination so the technician can
      // resolve it. Interpolation, extrapolation and single-entry scaling all
      // derive from real rows and are unaffected — they pass this check.
      const unpriced = damageItems
        .filter(item => {
          const normalizedType = (item.damage_type || '').trim();
          return !pricingMatrix.some(entry =>
            (entry.damage_type || '').trim() === normalizedType &&
            (getEntryBasePrice(entry, item.material) || 0) > 0
          );
        })
        .map(item => ({
          panel: item.panel || 'Unknown panel',
          damageType: item.damage_type || '',
          sizeRange: item.size_range || ''
        }));

      if (unpriced.length > 0) {
        setUnpricedItems(unpriced);
        setLineItems([]);
        setQuoteAmount(0);
        return;
      }
      setUnpricedItems([]);

      const calculatedLineItems = [];
      const breakdownDetails = [];
      let totalEstimatedHours = 0;
      let hasEstimates = false;

      // Determine repair method context once for use in both prompt and disclaimer
      const hasGluePull = damageItems.some(i => i.repair_method === 'Glue Pull Only');
      const hasLimitedAccess = damageItems.some(i => i.repair_method === 'Limited Tool Access');
      const hasStretchedMetal = damageItems.some(i => i.has_stretched_metal);

      // Helper: build the correct disclaimer based on repair method
      const buildDisclaimer = () => {
        if (hasGluePull) {
          return 'PLEASE NOTE: This repair utilises glue pulling techniques. Whilst every care is taken, there is a small risk of minor paint surface marks or texture changes. By proceeding, the vehicle owner accepts that the technician cannot be held liable for any such issues arising from the repair process.';
        }
        return 'PLEASE NOTE: PDR is a non-destructive process, however pre-existing paint or panel conditions may become apparent during repair. By proceeding, the vehicle owner accepts that the technician cannot be held liable for any such pre-existing conditions.';
      };

      // 2b: the assessment notes call shares nothing with the per-item description
      // calls, so its prompt is built and the call issued here — it runs concurrently
      // with the item calls below and is awaited only after the line items are set.
      let notesPromise = null;
      let notesPromptChars = 0;
      let notesStartTime = 0;
      if (globalSettings?.llm_quote_instructions) {
        const observations = getPhotoObservations(analysis?._ui, damageItems);
        const observationsText = observations.length > 0
          ? observations.map(o => `Photo observation (${o.panel}): ${o.observation}`).join('\n')
          : '';
        const damageContext = damageItems.map((item, idx) =>
          `${idx + 1}. Panel: ${item.panel} | Type: ${toDisplayDamageType(item.damage_type)}${item.depth && (item.depth === 'Medium' || item.depth === 'Deep / Sharp') ? ` | Depth: ${item.depth}` : ''}${item.affects_body_line ? ' | Body line: yes' : ''}${item.has_stretched_metal ? ' | Stretched metal: yes' : ''}${item.repair_method && item.repair_method !== 'Good Tool Access' ? ` | Repair method: ${item.repair_method}` : ''}${item.paint_type && item.paint_type !== 'Standard' ? ` | Paint type: ${item.paint_type}` : ''} | Caveat type: ${getCaveatType(item)}${item.notes ? ` | Notes: ${item.notes}` : ''}`
        ).join('\n') + (observationsText ? `\n${observationsText}` : '');

        const notesPrompt = `${globalSettings.llm_quote_instructions}

---

TASK: Write the customer-facing assessment notes for the following job.

DAMAGE BEING REPAIRED:
${damageContext}

OUTPUT: Return a JSON object with a single field "assessment_notes" containing 1–3 sentences of plain text. No bullet points, no headings. Do not include any disclaimer — the system adds that separately.`;

        notesPromptChars = notesPrompt.length;
        notesStartTime = performance.now();
        QT('LLM #2 (assessment notes) start', `prompt ${notesPromptChars} chars`);
        notesPromise = base44.integrations.Core.InvokeLLM({
          prompt: notesPrompt,
          model: "gemini_3_8_flash",
          response_json_schema: {
            type: "object",
            properties: {
              assessment_notes: { type: "string" }
            },
            required: ["assessment_notes"]
          }
        });
      }

      // 2b: each item's work runs in its own async function that always resolves —
      // never rejects — with either its result or exactly today's fallback, so one
      // failed call never affects any other. Results are matched back by item
      // index, never by completion order.
      const processItem = async (item, i) => {
        try {
          const calculation = calculateDamageItemPrice(item, hourlyRate, pricingMatrix);
          const isEstimate = calculation.isEstimate === true;

          // Use LLM to generate professional customer-facing description if global settings available
          if (globalSettings?.llm_quote_instructions) {
            try {
              const llmQuoteInstructions = globalSettings.llm_quote_instructions;
              
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
FINAL CALCULATED PRICE: ${getCurrencySymbol()}${calculation.totalPrice.toFixed(2)} (DO NOT MODIFY)

REQUIRED OUTPUT:
Provide ONLY the line item description as a plain string. Example: "PDR Labour - Rear Door Round Dent Repair (51mm - 80mm, Medium, Body Line Area)"

DO NOT include JSON formatting, quotes, or any other text - just the description string.`;

              const tDescStart = performance.now();
              QT('LLM #1 (item description) start', `prompt ${quotePrompt.length} chars`);
              const llmResponse = await base44.integrations.Core.InvokeLLM({
                prompt: quotePrompt,
                model: "gemini_3_8_flash"
              });
              QT('LLM #1 (item description) done', `prompt ${quotePrompt.length} chars, ${(performance.now() - tDescStart).toFixed(0)}ms`);
              
              // LLM returns plain string now
              let description = typeof llmResponse === 'string' ? llmResponse.trim() : llmResponse;
              
              // Fallback if LLM returns something unexpected
              if (!description || description.length === 0 || description.length > 200) {
                throw new Error('Invalid LLM description');
              }
              
              return {
                lineItem: {
                  description: description,
                  quantity: calculation.roundedHoursForTech,
                  unit_price: hourlyRate,
                  total_price: calculation.totalPrice
                },
                breakdown: calculation,
                estimateHours: calculation.roundedHoursForTech,
                isEstimate: isEstimate
              };
              
            } catch (llmError) {
              console.error('LLM description generation failed, using fallback:', llmError);
              // Fallback to programmatic description
              let description = `PDR Labour - ${item.panel} ${toDisplayDamageType(item.damage_type)} Repair (${item.size_range}`;
              if (item.depth && item.depth !== "Shallow") {
                description += `, ${item.depth}`;
              }
              description += `)`;
              if (item.affects_body_line) description += ' (Body Line Area)';
              if (item.has_stretched_metal) description += ' (Stretched Metal)';
              const itemNotesLower = (item.notes || "").toLowerCase(); 
              if (itemNotesLower.includes("matte paint") || itemNotesLower.includes("matte finish")) {
                description += ' (Matte Paint Finish)';
              }
              
              return {
                lineItem: {
                  description: description,
                  quantity: calculation.roundedHoursForTech,
                  unit_price: hourlyRate,
                  total_price: calculation.totalPrice
                },
                breakdown: calculation,
                estimateHours: calculation.roundedHoursForTech,
                isEstimate: isEstimate
              };
            }
          } else {
            // No global settings - use programmatic fallback
            let description = `PDR Labour - ${item.panel} ${toDisplayDamageType(item.damage_type)} Repair (${item.size_range}`;
            if (item.depth && item.depth !== "Shallow") {
              description += `, ${item.depth}`;
            }
            description += `)`;
            if (item.affects_body_line) description += ' (Body Line Area)';
            if (item.has_stretched_metal) description += ' (Stretched Metal)';
            const itemNotesLower = (item.notes || "").toLowerCase(); 
            if (itemNotesLower.includes("matte paint") || itemNotesLower.includes("matte finish")) {
              description += ' (Matte Paint Finish)';
            }
            
            return {
              lineItem: {
                description: description,
                quantity: calculation.roundedHoursForTech,
                unit_price: hourlyRate,
                total_price: calculation.totalPrice
              },
              breakdown: calculation,
              estimateHours: calculation.roundedHoursForTech,
              isEstimate: isEstimate
            };
          }
          
        } catch (err) {
          console.error(`Error calculating item ${i + 1}:`, err);
          const fallbackHours = 2;
          return {
            lineItem: {
              description: `PDR Labour - ${item.panel} Repair (Fallback)`,
              quantity: fallbackHours,
              unit_price: hourlyRate,
              total_price: fallbackHours * hourlyRate
            },
            breakdown: {
              panel: item.panel,
              damageType: item.damage_type,
              sizeRange: item.size_range,
              error: err.message,
              fallbackUsed: true,
              isEstimate: true,
              totalPrice: fallbackHours * hourlyRate,
              fallbackReason: "Individual item calculation failed."
            },
            estimateHours: fallbackHours,
            isEstimate: true
          };
        }
      };

      // Issue all per-item description calls concurrently
      const itemResults = await Promise.all(damageItems.map((item, i) => processItem(item, i)));
      // Match results back by item index — never by completion order
      itemResults.forEach((result, i) => {
        calculatedLineItems[i] = result.lineItem;
        breakdownDetails[i] = result.breakdown;
        totalEstimatedHours += result.estimateHours;
        if (result.isEstimate) hasEstimates = true;
      });

      if (baseCost > 0) {
        calculatedLineItems.unshift({
          description: 'Base Cost / Call-out Fee',
          quantity: 1,
          unit_price: baseCost,
          total_price: baseCost
        });
      }

      // Append any additional line items added on the damage form
      if (additionalLineItems && additionalLineItems.length > 0) {
        additionalLineItems.forEach(li => calculatedLineItems.push(li));
      }

      setLineItems(calculatedLineItems);
      setQuoteAmount(sumLineItems(calculatedLineItems));
      setCalculationBreakdown(breakdownDetails);
      setEstimatedTime(calculateEstimatedTimeRange(damageItems));
      
      // Await the concurrent notes call. On failure the notes fall back to the
      // disclaimer exactly as before — the line items above are unaffected.
      let assessmentNotes = '';
      if (notesPromise) {
        try {
          const notesResponse = await notesPromise;
          QT('LLM #2 (assessment notes) done', `prompt ${notesPromptChars} chars, ${(performance.now() - notesStartTime).toFixed(0)}ms`);

          const generatedNotes = notesResponse?.assessment_notes?.trim() || '';

          if (generatedNotes && generatedNotes.length > 10) {
            assessmentNotes = generatedNotes + '\n\n' + buildDisclaimer();
          } else {
            assessmentNotes = buildDisclaimer();
          }
        } catch (notesError) {
          console.error('Failed to generate AI assessment notes:', notesError);
          assessmentNotes = buildDisclaimer();
        }
      } else {
        assessmentNotes = buildDisclaimer();
      }
      
      setNotes(assessmentNotes);
      QT('quote displayed', `total from mount ${(performance.now() - mountTimeRef.current).toFixed(0)}ms`);
      setQuoteGenerated(true);
      // Auto-save and navigate if onFinalSave is provided and we're not in multi-vehicle mode
      // (this is triggered from the analysis screen flow)

    } catch (err) {
      console.error('Error generating quote:', err);
      // Fix 1: no invented full-quote fallback on unexpected errors — show the
      // error with a retry instead. Nothing is saved.
      setError('generation_failed');
      setLineItems([]);
      setQuoteAmount(0);
      setCalculationBreakdown([]);
      setEstimatedTime(null);
    } finally {
      setSending(false);
      setGenerating(false);
    }
  };

  const updateSectionItem = (sectionIdx, itemIdx, newPrice) => {
    setVehicleSections(prev => {
      const updated = [...prev];
      const newItems = [...updated[sectionIdx].items];
      newItems[itemIdx] = { ...newItems[itemIdx], total_price: newPrice, unit_price: newPrice };
      updated[sectionIdx] = {
        ...updated[sectionIdx],
        items: newItems,
        subtotal: newItems.reduce((s, i) => s + (i.total_price || 0), 0)
      };
      return updated;
    });
  };

  const addLineItem = () => {
    const defaultHourlyRate = userSettings?.hourly_rate || 70;
    const updated = [...lineItems, {
      description: 'PDR Labour - Custom Item',
      quantity: 1,
      unit_price: defaultHourlyRate,
      total_price: defaultHourlyRate
    }];
    setLineItems(updated);
    setQuoteAmount(sumLineItems(updated));
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;

    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].unit_price) || 0;
      updated[index].total_price = qty * price;
    }

    setLineItems(updated);
    setQuoteAmount(sumLineItems(updated));
  };

  const removeLineItem = (index) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
    setQuoteAmount(sumLineItems(updated));
  };

  const handleAddAnotherVehicle = async () => {
    setSending(true);
    try {
      const quoteData = {
        lineItems: lineItems.filter(item => item.description.trim() !== ''),
        quoteAmount,
        discountPercentage,
        currency,
        notes,
        estimatedTime: estimatedTime || null,
        calculationBreakdown: calculationBreakdown 
      };
      await onAddAnotherVehicle(quoteData);
    } catch (err) {
      console.error('Error preparing for next vehicle:', err);
      alert('Failed to save vehicle data. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleFinalSave = async () => {
    setSending(true);
    try {
      const isPerPanelMultiVehicle = isPerPanelPricing && vehicleSections.length > 0;
      const grandTotal = vehicleSections.reduce((s, sec) => s + sec.subtotal, 0);
      const quoteData = isPerPanelMultiVehicle ? {
        lineItems: vehicleSections.flatMap(s => s.items),
        quoteAmount: grandTotal,
        currency,
        notes,
        estimatedTime: null,
        calculationBreakdown: [],
        vehicleSections
      } : {
        lineItems: lineItems.filter(item => item.description.trim() !== ''),
        quoteAmount,
        discountPercentage,
        currency,
        notes,
        estimatedTime: estimatedTime || null,
        calculationBreakdown: calculationBreakdown
      };
      await onFinalSave(quoteData);
    } catch (err) {
      console.error('Error saving assessment:', err);
      alert('Failed to save assessment. Please try again.');
      setSending(false);
    }
  };

  const getCurrencySymbol = (curr = currency) => {
    const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
    return symbols[curr] || '£';
  };

  // Fix 1: when damage items are blocked from pricing, show the block card in
  // every mode — including auto-save, where the review UI never renders and the
  // technician would otherwise stare at the loading card forever.
  if (unpricedItems.length > 0) {
    return (
      <UnpricedItemsCard
        items={unpricedItems}
        onOpenSettings={() => navigate(createPageUrl('Settings'))}
      />
    );
  }

  // In auto-save mode or per-panel pricing, always show a loading screen — never show the review UI
  if (autoSave || isPerPanelPricing) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-rose-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Generating & Saving Quote...</h3>
          <p className="text-slate-400">This will only take a moment</p>
        </CardContent>
      </Card>
    );
  }

  if (generating) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-rose-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {isPerPanelPricing ? 'Calculating Per Panel Pricing...' : 'Generating Quote...'}
          </h3>
          <p className="text-slate-400">
            {isPerPanelPricing ? 'Applying standard panel rates' : 'Calculating pricing programmatically...'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && error === 'generation_failed' && (
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-200 font-medium">Quote Generation Error</p>
                <p className="text-red-300 text-sm mt-1">
                  Quote generation failed — no prices were produced and nothing has been saved. Please retry; if it keeps failing, check your settings.
                </p>
                <Button
                  onClick={() => { setQuoteGenerated(false); generateQuote(); }}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-red-600 text-red-200 hover:bg-red-800 hover:text-white"
                  disabled={generating}
                >
                  <Loader2 className={`w-3 h-3 mr-1 ${generating ? 'animate-spin' : 'hidden'}`} />
                  Retry Generation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="GBP" className="text-white hover:!bg-slate-700">GBP (£)</SelectItem>
                <SelectItem value="USD" className="text-white hover:!bg-slate-700">USD ($)</SelectItem>
                <SelectItem value="EUR" className="text-white hover:!bg-slate-700">EUR (€)</SelectItem>
                <SelectItem value="CAD" className="text-white hover:!bg-slate-700">CAD (C$)</SelectItem>
                <SelectItem value="AUD" className="text-white hover:!bg-slate-700">AUD (A$)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPerPanelPricing && vehicleSections.length > 0 ? (
            <div className="space-y-6">
              {vehicleSections.map((section, sectionIdx) => (
                <div key={sectionIdx} className="space-y-3">
                  <h3 className="text-white font-semibold text-base border-b border-slate-600 pb-2">{section.label}</h3>
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="p-3 bg-slate-700 rounded-lg space-y-2">
                      <p className="text-white text-sm">{item.description}</p>
                      <div>
                        <Label className="text-slate-400 text-xs">Price ({currency})</Label>
                        <Input
                          type="number"
                          step="5"
                          value={item.total_price === 0 ? '' : item.total_price}
                          onChange={(e) => updateSectionItem(sectionIdx, itemIdx, parseFloat(e.target.value) || 0)}
                          className="bg-slate-600 border-slate-500 text-white font-semibold"
                        />
                        <p className="text-xs text-slate-400 mt-1">Edit to override</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                    <span className="text-slate-300 text-sm font-medium">Subtotal</span>
                    <span className="text-white font-semibold">{getCurrencySymbol()}{section.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-slate-700 rounded-lg border border-slate-500">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Amount</span>
                  <span className="text-2xl font-bold text-green-400">
                    {getCurrencySymbol()}{vehicleSections.reduce((s, sec) => s + sec.subtotal, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
          <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-white">Line Items</Label>
              <Button onClick={addLineItem} variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                Add Item
              </Button>
            </div>

            {lineItems.length === 0 ? (
              <div className="p-4 bg-slate-700 rounded-lg text-center">
                <p className="text-slate-400 text-sm mb-2">No line items yet</p>
                <Button onClick={addLineItem} variant="outline" size="sm" className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500">
                  Add First Item
                </Button>
              </div>
            ) : (
              lineItems.map((item, index) => (
                <div key={index} className="p-3 bg-slate-700 rounded-lg space-y-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    placeholder="Description"
                    className="bg-slate-600 border-slate-500 text-white"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Label className="text-white text-xs mb-1">Final Price ({currency})</Label>
                      <Input
                        type="number"
                        step="5"
                        value={item.total_price === 0 ? '' : item.total_price}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newPrice = val === '' ? 0 : parseFloat(val) || 0;
                          const updated = [...lineItems];
                          updated[index] = {
                            ...updated[index],
                            total_price: newPrice,
                            quantity: 1,
                            unit_price: newPrice
                          };
                          setLineItems(updated);
                          setQuoteAmount(sumLineItems(updated));
                        }}
                        placeholder="0"
                        className="bg-slate-600 border-slate-500 text-white font-semibold"
                      />
                      <p className="text-xs text-slate-400 mt-1">Edit to override calculated price</p>
                    </div>
                    <Button
                      onClick={() => removeLineItem(index)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20 mt-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
              <span className="text-slate-300 text-sm">Subtotal</span>
              <span className="text-white font-medium">{getCurrencySymbol()}{quoteAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg">
              <span className="text-slate-300 text-sm flex-1">Discount (%)</span>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={discountPercentage === 0 ? '' : discountPercentage}
                onChange={(e) => setDiscountPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                placeholder="0"
                className="bg-slate-600 border-slate-500 text-white w-24 text-right"
              />
            </div>
            {discountPercentage > 0 && (
              <div className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                <span className="text-slate-300 text-sm">Discount ({discountPercentage}%)</span>
                <span className="text-red-400 font-medium">-{getCurrencySymbol()}{(quoteAmount * discountPercentage / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="p-4 bg-slate-700 rounded-lg border border-slate-500">
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">Total Amount</span>
                <span className="text-2xl font-bold text-green-400">
                  {getCurrencySymbol()}{(quoteAmount * (1 - discountPercentage / 100)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          </>
          )}

          {!isPerPanelPricing && calculationBreakdown.length > 0 && (
          <div className="space-y-3 border-t border-slate-600 pt-4">
          <Label className="text-white text-lg font-semibold">Technical Pricing Breakdown</Label>
          <p className="text-slate-400 text-sm mb-2">Details of programmatic calculation (for internal use)</p>
          {calculationBreakdown.map((breakdown, idx) => (
            <Card key={idx} className="bg-slate-700 border-slate-600 text-white">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base font-medium flex justify-between items-center">
                  <span>{breakdown.panel} - {breakdown.damageType || 'Fallback'}</span>
                  <span className="text-green-300 text-lg">{getCurrencySymbol()}{breakdown.totalPrice?.toFixed(2) || '0.00'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm p-4 pt-0 space-y-2">
                {breakdown.error || breakdown.fallbackUsed ? (
                  <div className="bg-red-950/60 border border-red-600 rounded-lg p-2">
                    <p className="text-red-300 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      Fallback pricing used — this price is NOT from your matrix. Review before sending.
                    </p>
                    {breakdown.fallbackReason && (
                      <p className="text-red-200 text-xs mt-1">{breakdown.fallbackReason}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <p><span className="font-semibold">Matrix Base:</span> {breakdown.matrixEntry?.damage_type} - {breakdown.matrixEntry?.size_range} ({getCurrencySymbol()}{breakdown.matrixEntry?.base_price?.toFixed(2)})</p>
                    {breakdown.paintType && breakdown.paintType !== 'Standard' && (
                      <p><span className="font-semibold">Paint Type:</span> {breakdown.paintType} ({breakdown.multipliers?.paintType?.toFixed(2)}x uplift)</p>
                    )}
                    {estimatedTime && (
                      <div>
                        <p><span className="font-semibold">Estimated Time (tech only):</span> {estimatedTime}</p>
                        <p className="text-slate-400 text-xs mt-1">Estimate only — actual time depends on the job.</p>
                      </div>
                    )}
                    <p><span className="font-semibold">Final Price:</span> {getCurrencySymbol()}{breakdown.totalPrice?.toFixed(2)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          </div>
          )}

          <div className="space-y-2">
            <Label className="text-white">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for the quote..."
              rows={3}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          {isMultiVehicleMode && !(isPerPanelPricing && vehicleSections.length > 0) ? (
            <div className="space-y-3 pt-4 border-t border-slate-600">
              <Button
                onClick={handleAddAnotherVehicle}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={sending || lineItems.length === 0}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Vehicle
                  </>
                )}
              </Button>

              <Button
                onClick={handleFinalSave}
                className="w-full pink-gradient text-white font-semibold"
                disabled={sending || (lineItems.length === 0 && vehicleSections.length === 0)}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Assessment
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleFinalSave}
              className="w-full pink-gradient text-white font-semibold"
              disabled={sending || (lineItems.length === 0 && vehicleSections.length === 0)}
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Assessment
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}