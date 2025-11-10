
import React, { useState, useEffect } from "react";
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
  const needsToolFinishing = assessToolFinishingNeeded(damageItem);
  
  switch(damageItem.repair_method) {
    case "Good Tool Access":
      return 1.0;
      
    case "Limited Tool Access":
      return needsToolFinishing ? 1.35 : 1.1;
      
    case "Glue Pull Only":
      return needsToolFinishing ? 1.6 : 1.0;
      
    case "Strip & Re-fit":
      return 1.3;
      
    case "Unsure":
      return needsToolFinishing ? 1.25 : 1.15;
      
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
  if (sortedEntries.length < 2) return 0; // Return 0 if not enough data to calculate increment
  
  const increments = [];
  for (let i = 1; i < sortedEntries.length; i++) {
    const sizeDiff = sortedEntries[i].sizeInMm - sortedEntries[i-1].sizeInMm;
    const priceDiff = sortedEntries[i].base_price - sortedEntries[i-1].base_price;
    
    if (sizeDiff > 0) { // Ensure positive size difference
      increments.push(priceDiff / sizeDiff);
    }
  }
  
  // Return average of positive increments. If all are negative, return 0.
  const positiveIncrements = increments.filter(inc => inc >= 0);
  if (positiveIncrements.length === 0) return 0;
  
  return positiveIncrements.reduce((sum, inc) => sum + inc, 0) / positiveIncrements.length;
}

/**
 * Lookup pricing from matrix with intelligent fallback
 * NOW USES: base_price (steel default) instead of steel_price/aluminum_price
 * Aluminum pricing is handled by applying 1.35x multiplier in main calculation
 */
function lookupPricingMatrix(pricingMatrix, damageType, sizeRange, material, hourlyRate) {
  console.log('🔍 MATRIX LOOKUP DEBUG:', {
    lookingFor: { damageType, sizeRange },
    matrixLength: pricingMatrix.length,
    matrixEntries: pricingMatrix.map(e => ({ 
      type: e.damage_type, 
      range: e.size_range, 
      price: e.base_price 
    }))
  });

  // Normalize strings for comparison (trim whitespace, consistent case)
  const normalizedDamageType = (damageType || '').trim();
  const normalizedSizeRange = (sizeRange || '').trim();
  
  // Filter matrix for matching damage type, and ensure base_price is valid
  const typeEntries = pricingMatrix.filter(entry => {
    const entryType = (entry.damage_type || '').trim();
    const match = entryType === normalizedDamageType && entry.base_price > 0;
    console.log(`  Comparing "${entryType}" === "${normalizedDamageType}": ${match}`);
    return match;
  });
  
  console.log(`  Found ${typeEntries.length} entries for damage type "${normalizedDamageType}"`);
  
  if (typeEntries.length === 0) {
    console.log('  ❌ NO MATCH: No valid entries for this damage type');
    // FIXED: Don't add "notes" field to fallback - let the component handle display
    return {
      price: hourlyRate * 2,
      matrixEntry: { 
        damage_type: damageType, 
        size_range: sizeRange, 
        base_price: hourlyRate * 2
      },
      isEstimate: true,
      fallbackReason: "No specific matrix data for this damage type"
    };
  }
  
  // Look for exact match with normalized strings
  const exactMatch = typeEntries.find(entry => {
    const entryRange = (entry.size_range || '').trim();
    const match = entryRange === normalizedSizeRange;
    console.log(`  Size range "${entryRange}" === "${normalizedSizeRange}": ${match}`);
    return match;
  });
  
  if (exactMatch) {
    console.log(`  ✅ EXACT MATCH FOUND: ${exactMatch.damage_type} ${exactMatch.size_range} = £${exactMatch.base_price}`);
    return {
      price: exactMatch.base_price,
      matrixEntry: exactMatch,
      isEstimate: false
    };
  }
  
  console.log('  ⚠️ NO EXACT MATCH: Using interpolation/extrapolation');
  
  // No exact match - use interpolation/extrapolation
  const requestedNumericSize = extractNumericSize(sizeRange);
  
  // Sort entries by size for interpolation
  const sortedEntries = typeEntries
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
    // Interpolate between two points
    const sizeDiff = upperEntry.sizeInMm - lowerEntry.sizeInMm;
    const priceDiff = upperEntry.base_price - lowerEntry.base_price;
    const sizeOffset = requestedNumericSize - lowerEntry.sizeInMm;
    const interpolatedPrice = lowerEntry.base_price + (priceDiff * sizeOffset / sizeDiff);
    
    console.log(`  📊 INTERPOLATED: £${interpolatedPrice.toFixed(2)} (between ${lowerEntry.size_range} and ${upperEntry.size_range})`);
    
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
    // Extrapolate upward using average increment from existing data
    const avgIncrement = calculateAverageIncrement(sortedEntries);
    const sizeDiff = requestedNumericSize - lowerEntry.sizeInMm;
    const extrapolatedPrice = lowerEntry.base_price + (avgIncrement * sizeDiff);
    
    console.log(`  📈 EXTRAPOLATED UP: £${extrapolatedPrice.toFixed(2)} (from ${lowerEntry.size_range})`);
    
    return {
      price: Math.max(lowerEntry.base_price + 50, Math.round(extrapolatedPrice / 5) * 5),
      matrixEntry: {
        damage_type: lowerEntry.damage_type,
        size_range: lowerEntry.size_range,
        base_price: Math.max(lowerEntry.base_price + 50, Math.round(extrapolatedPrice / 5) * 5)
      },
      isEstimate: true,
      fallbackReason: `Extrapolated up from ${lowerEntry.size_range}`
    };
  }
  
  if (!lowerEntry && upperEntry) {
    // Extrapolate downward
    const avgIncrement = calculateAverageIncrement(sortedEntries);
    const sizeDiff = upperEntry.sizeInMm - requestedNumericSize;
    const extrapolatedPrice = upperEntry.base_price - (avgIncrement * sizeDiff);
    
    console.log(`  📉 EXTRAPOLATED DOWN: £${extrapolatedPrice.toFixed(2)} (from ${upperEntry.size_range})`);
    
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

  // Fallback for cases with only one data point or no clear lower/upper for specific damage type
  if (sortedEntries.length === 1) {
    const point = sortedEntries[0];
    const sizeRatio = requestedNumericSize / point.sizeInMm;
    const cappedRatio = Math.pow(sizeRatio, 0.7); // Dampened scaling
    const scaledPrice = point.base_price * cappedRatio;
    
    console.log(`  🔄 SCALED: £${scaledPrice.toFixed(2)} (from single entry ${point.size_range})`);
    
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

  // Final fallback if nothing else worked
  console.log('  ❌ FINAL FALLBACK: Using generic hourly rate calculation');
  return {
    price: hourlyRate * 2,
    matrixEntry: { 
      damage_type: damageType, 
      size_range: sizeRange, 
      base_price: hourlyRate * 2
    },
    isEstimate: true,
    fallbackReason: "Generic fallback - no suitable matrix data found"
  };
}


/**
 * Master function: Calculates complete price for a single damage item
 * This is 100% programmatic - NO AI involvement
 * 
 * PRICING PHILOSOPHY:
 * - Matrix prices are MARKET RATES for steel (what customers pay)
 * - Aluminum is 1.35x steel price (applied as a modifier)
 * - Multipliers adjust the market rate for complexity
 * - Hours are calculated AFTER for tech reference only
 * - Customer sees fixed price, tech sees estimated time
 * 
 * Returns full breakdown for tech verification
 */
function calculateDamageItemPrice(damageItem, hourlyRate, pricingMatrix) {
  // STEP 1: Matrix Lookup (with intelligent fallback)
  // This gives us the MARKET RATE for steel
  const { price: baseSteelPrice, matrixEntry, isEstimate, fallbackReason } = lookupPricingMatrix(
    pricingMatrix,
    damageItem.damage_type,
    damageItem.size_range,
    damageItem.material,
    hourlyRate
  );
  
  // Ensure baseSteelPrice is not zero or negative
  const safeBaseSteelPrice = Math.max(baseSteelPrice, 50); // Minimum £50 for any repair
  
  // STEP 1.5: Apply Aluminum Modifier if needed (BEFORE other multipliers)
  // Aluminum is 1.35x the steel price
  const aluminumMultiplier = (damageItem.material === "Aluminum") ? 1.35 : 1.0;
  const basePrice = safeBaseSteelPrice * aluminumMultiplier;
  
  // STEP 2: Calculate All Complexity Multipliers
  
  // 2A. Repair Method Multiplier (CONDITIONAL)
  const repairMethodMultiplier = calculateRepairMethodMultiplier(damageItem);
  
  // 2B. Depth Multiplier (ALWAYS APPLIES)
  const depthMultiplier = {
    "Shallow": 1.0,
    "Medium": 1.25,
    "Deep/Sharp": 1.5,
    "Unsure": 1.2
  }[damageItem.depth] || 1.1;
  
  // 2C. Body Line Multiplier (CONDITIONAL)
  // If repair method already has high multiplier, reduce body line impact
  let bodyLineMultiplier = 1.0;
  if (damageItem.affects_body_line) {
    bodyLineMultiplier = (repairMethodMultiplier > 1.3) ? 1.1 : 1.2;
  }
  
  // 2D. Stretched Metal Multiplier
  const stretchedMetalMultiplier = damageItem.has_stretched_metal ? 1.15 : 1.0;
  
  // 2E. Notes-Based Multipliers (scan for keywords)
  let notesMultiplier = 1.0;
  const notes = (damageItem.notes || "").toLowerCase();
  
  if (notes.includes("matte paint") || notes.includes("matte finish")) {
    notesMultiplier *= 1.3;
  }
  if (notes.includes("previous repair") || notes.includes("poor repair")) {
    notesMultiplier *= 1.2;
  }
  if (notes.includes("double skin")) {
    notesMultiplier *= (repairMethodMultiplier > 1.3) ? 1.3 : 1.15;
  }
  
  // STEP 3: Combine All Complexity Multipliers
  let totalComplexityMultiplier = 
    repairMethodMultiplier * 
    depthMultiplier * 
    bodyLineMultiplier * 
    stretchedMetalMultiplier * 
    notesMultiplier;
  
  // Cap the total complexity multiplier at 2.0x to prevent extreme pricing
  totalComplexityMultiplier = Math.min(totalComplexityMultiplier, 2.0);
  
  // STEP 4: Apply Multipliers to PRICE (not hours)
  // This is the market rate adjusted for complexity
  const adjustedPrice = basePrice * totalComplexityMultiplier;
  
  // Round to nearest £5 for cleaner pricing
  const totalPrice = Math.round(adjustedPrice / 5) * 5;
  
  // STEP 5: Calculate Estimated Hours for Tech Reference ONLY
  // This tells the tech "based on your hourly rate, this job should take you X hours"
  const estimatedHoursForTech = totalPrice / hourlyRate;
  const roundedHoursForTech = Math.round(estimatedHoursForTech * 2) / 2; // Round to nearest 0.5
  
  // STEP 6: Return Complete Result with Full Breakdown
  return {
    damageType: damageItem.damage_type,
    panel: damageItem.panel,
    sizeRange: damageItem.size_range,
    material: damageItem.material,
    depth: damageItem.depth,
    affectsBodyLine: damageItem.affects_body_line,
    hasStretchedMetal: damageItem.has_stretched_metal,
    repairMethod: damageItem.repair_method,
    notes: damageItem.notes,
    matrixEntry: matrixEntry,
    isEstimate: isEstimate,
    fallbackReason: fallbackReason, // NEW: Include fallback reason
    baseSteelPrice: safeBaseSteelPrice, // Steel price from matrix
    aluminumMultiplier: aluminumMultiplier, // 1.35x if aluminum, 1.0 if steel
    basePrice: basePrice, // After aluminum adjustment, before complexity
    hourlyRate: hourlyRate, // Tech's reference rate
    multipliers: {
      aluminum: aluminumMultiplier,
      repairMethod: repairMethodMultiplier,
      depth: depthMultiplier,
      bodyLine: bodyLineMultiplier,
      stretchedMetal: stretchedMetalMultiplier,
      notes: notesMultiplier,
      totalComplexity: totalComplexityMultiplier
    },
    adjustedPrice: adjustedPrice, // Before rounding
    totalPrice: totalPrice, // Final customer price (rounded)
    estimatedHoursForTech: estimatedHoursForTech, // Raw calculation for reference
    roundedHoursForTech: roundedHoursForTech // Rounded for display
  };
}

// ============================================================================
// REACT COMPONENT
// ============================================================================

export default function QuoteGeneration({
  customer,
  vehicle,
  analysis,
  photos,
  damageItems = [],
  onAddAnotherVehicle,
  onFinalSave,
  isPerPanelPricing = false,
  isMultiVehicleMode = false
}) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [calculationBreakdown, setCalculationBreakdown] = useState([]); // NEW: Store calculation details
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [currency, setCurrency] = useState('GBP');
  const [notes, setNotes] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [userSettings, setUserSettings] = useState(null);
  const [error, setError] = useState(null); // Can be 'empty_matrix', 'partial_matrix', 'generation_failed'
  const [quoteGenerated, setQuoteGenerated] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const user = await base44.auth.me();
        const settings = await base44.entities.UserSetting.filter({ user_email: user.email });
        if (settings.length > 0) {
          setUserSettings(settings[0]);
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
    // Only generate if settings are loaded and not already generating/generated
    if (userSettings && !generating && !quoteGenerated) {
      generateQuote();
    }
  }, [userSettings, generating, quoteGenerated]); // Add quoteGenerated to dependencies to re-run if it changes

  useEffect(() => {
    const total = lineItems.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
    setQuoteAmount(total);
  }, [lineItems]);

  const generateQuote = async () => {
    if (!userSettings) {
      setError('Missing user settings');
      setQuoteGenerated(true);
      return;
    }

    setGenerating(true);
    setError(null); // Clear previous errors

    try {
      // PER PANEL PRICING - Simplified Logic
      if (isPerPanelPricing) {
        const defaultPanelPrice = userSettings.default_panel_price || 120;
        const baseCost = userSettings.base_cost || 0;
        
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

        setLineItems(simpleLineItems);
        setCalculationBreakdown([]); // No breakdown for per-panel pricing
        setEstimatedTime(damageItems.length * 2);
        setNotes('Per panel pricing applied.');
        setQuoteGenerated(true);
        setGenerating(false);
        return;
      }

      // DETAILED PRICING - 100% Programmatic Calculation
      const hourlyRate = userSettings.hourly_rate || 70;
      const baseCost = userSettings.base_cost || 0;
      const pricingMatrix = userSettings.pricing_matrix || [];

      console.log('=== PROGRAMMATIC QUOTE GENERATION ===');
      console.log('Pricing Matrix:', pricingMatrix);
      console.log('Damage Items:', damageItems);
      console.log('Hourly Rate:', hourlyRate);

      // Calculate each damage item using PURE CODE (NO AI)
      const calculatedLineItems = [];
      const breakdownDetails = []; // NEW: Store breakdown for each item
      let totalEstimatedHours = 0;
      let hasEstimates = false; // Flag to track if any item used an estimation (kept for potential future use)

      for (let i = 0; i < damageItems.length; i++) {
        const item = damageItems[i];
        
        try {
          // PROGRAMMATIC CALCULATION (NO AI INVOLVEMENT)
          const calculation = calculateDamageItemPrice(item, hourlyRate, pricingMatrix);
          
          console.log(`Item ${i + 1} Calculation:`, calculation);
          
          // Track if any estimates were used
          if (calculation.isEstimate) {
            hasEstimates = true;
          }
          
          // Store the full breakdown for tech view
          breakdownDetails.push(calculation);
          
          // Build description with size and depth
          let description = `PDR Labour - ${item.panel} ${item.damage_type} Repair (${item.size_range}`;
          
          // Add depth if not Shallow
          if (item.depth && item.depth !== "Shallow") {
            description += `, ${item.depth}`;
          }
          description += `)`;
          
          // Add modifiers
          if (item.affects_body_line) description += ' (Body Line Area)';
          if (item.has_stretched_metal) description += ' (Stretched Metal)';
          const itemNotesLower = (item.notes || "").toLowerCase(); 
          if (itemNotesLower.includes("matte paint") || itemNotesLower.includes("matte finish")) {
            description += ' (Matte Paint Finish)';
          }
          
          calculatedLineItems.push({
            description: description,
            quantity: calculation.roundedHoursForTech, // Use new field
            unit_price: hourlyRate,
            total_price: calculation.totalPrice // Use new field
          });
          
          totalEstimatedHours += calculation.roundedHoursForTech; // Use new field
          
        } catch (err) {
          console.error(`Error calculating item ${i + 1}:`, err);
          // Fallback to basic pricing
          const fallbackHours = 2; // Default fallback if individual item calculation fails
          calculatedLineItems.push({
            description: `PDR Labour - ${item.panel} Repair (Fallback)`,
            quantity: fallbackHours,
            unit_price: hourlyRate,
            total_price: fallbackHours * hourlyRate
          });
          totalEstimatedHours += fallbackHours;
          
          // Add fallback breakdown entry
          breakdownDetails.push({
            panel: item.panel,
            damageType: item.damage_type,
            sizeRange: item.size_range,
            error: err.message,
            fallbackUsed: true,
            isEstimate: true, // Treat any error fallback as an estimate
            totalPrice: fallbackHours * hourlyRate,
            fallbackReason: "Individual item calculation failed."
          });
          hasEstimates = true;
        }
      }

      // Add base cost if configured
      if (baseCost > 0) {
        calculatedLineItems.unshift({
          description: 'Base Cost / Call-out Fee',
          quantity: 1,
          unit_price: baseCost,
          total_price: baseCost
        });
      }

      setLineItems(calculatedLineItems);
      setCalculationBreakdown(breakdownDetails); // NEW: Store breakdown
      setEstimatedTime(totalEstimatedHours);
      setNotes('Quote calculated programmatically based on your pricing matrix and damage characteristics.');
      setQuoteGenerated(true);

      // REMOVED: No more pricing advisories - they were causing false warnings

    } catch (err) {
      console.error('Error generating quote:', err);
      setError('generation_failed');

      const defaultHourlyRate = userSettings?.hourly_rate || 70;
      const defaultBaseCost = userSettings?.base_cost || 0;

      const fallbackItems = [
        {
          description: 'PDR Labour',
          quantity: 2,
          unit_price: defaultHourlyRate,
          total_price: defaultHourlyRate * 2
        }
      ];

      if (defaultBaseCost > 0) {
        fallbackItems.unshift({
          description: 'Base Cost / Call-out Fee',
          quantity: 1,
          unit_price: defaultBaseCost,
          total_price: defaultBaseCost
        });
      }

      setLineItems(fallbackItems);
      // Clear breakdown for global failure
      setCalculationBreakdown([{ 
        error: err.message, 
        fallbackUsed: true, 
        notes: "Global fallback due to generation error.", 
        isEstimate: true, 
        totalPrice: fallbackItems.reduce((sum, item) => sum + item.total_price, 0),
        fallbackReason: "Global quote generation failed."
      }]);
      
      const fallbackEstimatedHours = fallbackItems.reduce((sum, item) => {
        if (item.description === 'Base Cost / Call-out Fee') {
            return sum;
        }
        return sum + item.quantity;
      }, 0);
      setEstimatedTime(fallbackEstimatedHours);
      setNotes('Auto-generated fallback pricing due to an error. Please review and adjust as necessary.');
      setQuoteGenerated(true);
    } finally {
      setSending(false);
      setGenerating(false);
    }
  };

  const addLineItem = () => {
    const defaultHourlyRate = userSettings?.hourly_rate || 70;
    setLineItems([...lineItems, {
      description: 'PDR Labour - Custom Item',
      quantity: 1,
      unit_price: defaultHourlyRate,
      total_price: defaultHourlyRate
    }]);
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
  };

  const removeLineItem = (index) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
  };

  const handleAddAnotherVehicle = async () => {
    setSending(true);
    try {
      const quoteData = {
        lineItems: lineItems.filter(item => item.description.trim() !== ''),
        quoteAmount,
        currency,
        notes,
        estimatedTime: parseFloat(estimatedTime) || 0,
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
      const quoteData = {
        lineItems: lineItems.filter(item => item.description.trim() !== ''),
        quoteAmount,
        currency,
        notes,
        estimatedTime: parseFloat(estimatedTime) || 0,
        calculationBreakdown: calculationBreakdown // NEW: Include breakdown in saved data
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
                  Failed to generate quote. Using fallback pricing. Please review and adjust.
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

      {/* REMOVED: All pricing advisory warnings - they were unreliable */}

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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-white">Line Items</Label>
              <Button onClick={addLineItem} variant="outline" size="sm" className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            {lineItems.length === 0 ? (
              <div className="p-4 bg-slate-700 rounded-lg text-center">
                <p className="text-slate-400 text-sm mb-2">No line items yet</p>
                <Button onClick={addLineItem} variant="outline" size="sm" className="bg-slate-600 border-slate-500 text-white hover:bg-slate-500">
                  <Plus className="w-4 h-4 mr-1" />
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
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateLineItem(index, 'quantity', val === '' ? '' : parseFloat(val) || 0);
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          updateLineItem(index, 'quantity', 0);
                        }
                      }}
                      placeholder="Hours"
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateLineItem(index, 'unit_price', val === '' ? '' : parseFloat(val) || 0);
                      }}
                      onBlur={(e) => {
                        if (e.target.value === '') {
                          updateLineItem(index, 'unit_price', 0);
                        }
                      }}
                      placeholder="Rate"
                      className="bg-slate-600 border-slate-500 text-white"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">
                        {getCurrencySymbol()}{item.total_price?.toFixed(2) || '0.00'}
                      </span>
                      <Button
                        onClick={() => removeLineItem(index)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-700 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">Total Amount</span>
              <span className="text-2xl font-bold text-green-400">
                {getCurrencySymbol()}{quoteAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {!isPerPanelPricing && calculationBreakdown.length > 0 && (
            <div className="space-y-3 border-t border-slate-600 pt-4">
              <Label className="text-white text-lg font-semibold">Technical Pricing Breakdown</Label>
              <p className="text-slate-400 text-sm mb-2">This section details how each damage item's price was calculated programmatically. The "Final Customer Price" is the amount shown to the customer, while "Estimated Tech Hours" are for internal reference based on your hourly rate.</p>
              {calculationBreakdown.map((breakdown, idx) => (
                <Card key={idx} className="bg-slate-700 border-slate-600 text-white">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base font-medium flex justify-between items-center">
                      <span>{breakdown.panel} - {breakdown.damageType || 'Custom/Fallback'} {breakdown.isEstimate && <span className="text-orange-300 text-xs">(Estimated)</span>}</span>
                      <span className="text-green-300 text-lg">{breakdown.totalPrice?.toFixed(2) !== undefined ? getCurrencySymbol() + breakdown.totalPrice.toFixed(2) : ''}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm p-4 pt-0 space-y-2">
                    {breakdown.error || breakdown.fallbackUsed ? (
                      <p className="text-red-300">
                        <AlertTriangle className="inline-block w-4 h-4 mr-1" />
                        Error calculating: {breakdown.error || 'Fallback pricing used.'}
                        {breakdown.fallbackReason && ` (${breakdown.fallbackReason})`}
                      </p>
                    ) : (
                      <>
                        <p><span className="font-semibold">Details:</span> {breakdown.damageType}, {breakdown.sizeRange}, {breakdown.depth}, {breakdown.material}</p>
                        <p><span className="font-semibold">Repair Method:</span> {breakdown.repairMethod}</p>
                        <p><span className="font-semibold">Matrix Base:</span> {breakdown.matrixEntry?.damage_type} - {breakdown.matrixEntry?.size_range} ({getCurrencySymbol()}{breakdown.matrixEntry?.base_price?.toFixed(2)})</p>
                        {breakdown.fallbackReason && <p><span className="font-semibold">Estimation Method:</span> {breakdown.fallbackReason}</p>}
                        <p><span className="font-semibold">Matrix Steel Base Price:</span> {getCurrencySymbol()}{breakdown.baseSteelPrice?.toFixed(2)}</p>
                        {breakdown.material === "Aluminum" && breakdown.multipliers?.aluminum > 1 && (
                            <p><span className="font-semibold">Aluminum Multiplier:</span> x{breakdown.multipliers.aluminum?.toFixed(2)}</p>
                        )}
                        <p><span className="font-semibold">Adjusted Base Price (pre-complexity):</span> {getCurrencySymbol()}{breakdown.basePrice?.toFixed(2)}</p>
                        
                        <div className="ml-2 mt-1 space-y-1">
                          <p><span className="font-semibold">Complexity Multipliers:</span></p>
                          <ul className="list-disc list-inside text-slate-300">
                            <li>Repair Method: x{breakdown.multipliers?.repairMethod?.toFixed(2)}</li>
                            <li>Depth ({breakdown.depth}): x{breakdown.multipliers?.depth?.toFixed(2)}</li>
                            {breakdown.affectsBodyLine && <li>Body Line: x{breakdown.multipliers?.bodyLine?.toFixed(2)}</li>}
                            {breakdown.hasStretchedMetal && <li>Stretched Metal: x{breakdown.multipliers?.stretchedMetal?.toFixed(2)}</li>}
                            {breakdown.multipliers?.notes > 1 && <li>Notes-based: x{breakdown.multipliers?.notes?.toFixed(2)}</li>}
                          </ul>
                          <p><span className="font-semibold">Total Complexity Multiplier:</span> x{breakdown.multipliers?.totalComplexity?.toFixed(2)}</p>
                        </div>
                        <p><span className="font-semibold">Adjusted Price (before rounding):</span> {getCurrencySymbol()}{breakdown.adjustedPrice?.toFixed(2)}</p>
                        <p><span className="font-semibold">Final Customer Price:</span> {getCurrencySymbol()}{breakdown.totalPrice?.toFixed(2)}</p>
                        <p><span className="font-semibold">Estimated Tech Hours:</span> {breakdown.estimatedHoursForTech?.toFixed(2)} hrs (at {getCurrencySymbol()}{breakdown.hourlyRate?.toFixed(2)}/hr)</p>
                        <p><span className="font-semibold">Rounded Tech Hours:</span> {breakdown.roundedHoursForTech?.toFixed(1)} hrs</p>
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

          {isMultiVehicleMode ? (
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
                disabled={sending || lineItems.length === 0}
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
              disabled={sending || lineItems.length === 0}
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
