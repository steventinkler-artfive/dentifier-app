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

  // Final fallback
  console.log('  ❌ FINAL FALLBACK');
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
  const aluminumMultiplier = (damageItem.material === "Aluminum" && usingNewStructure) ? 1.35 : 1.0;
  const basePrice = safeBaseMatrixPrice * aluminumMultiplier;
  
  // STEP 2: Calculate All Complexity Multipliers
  const repairMethodMultiplier = calculateRepairMethodMultiplier(damageItem);
  
  const depthMultiplier = {
    "Shallow": 1.0,
    "Medium": 1.25,
    "Deep/Sharp": 1.5,
    "Unsure": 1.2
  }[damageItem.depth] || 1.1;
  
  let bodyLineMultiplier = 1.0;
  if (damageItem.affects_body_line) {
    bodyLineMultiplier = (repairMethodMultiplier > 1.3) ? 1.1 : 1.2;
  }
  
  const stretchedMetalMultiplier = damageItem.has_stretched_metal ? 1.15 : 1.0;
  
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
  
  totalComplexityMultiplier = Math.min(totalComplexityMultiplier, 2.0);
  
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
    notes: damageItem.notes,
    matrixEntry: matrixEntry,
    isEstimate: isEstimate,
    fallbackReason: fallbackReason,
    baseSteelPrice: safeBaseMatrixPrice, // Now represents the price from matrix before aluminum multiplier (if new structure) or after (if old structure)
    aluminumMultiplier: aluminumMultiplier,
    basePrice: basePrice,
    hourlyRate: hourlyRate,
    multipliers: {
      aluminum: aluminumMultiplier,
      repairMethod: repairMethodMultiplier,
      depth: depthMultiplier,
      bodyLine: bodyLineMultiplier,
      stretchedMetal: stretchedMetalMultiplier,
      notes: notesMultiplier,
      totalComplexity: totalComplexityMultiplier
    },
    adjustedPrice: adjustedPrice,
    totalPrice: totalPrice,
    estimatedHoursForTech: estimatedHoursForTech,
    roundedHoursForTech: roundedHoursForTech
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
  const [calculationBreakdown, setCalculationBreakdown] = useState([]);
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [currency, setCurrency] = useState('GBP');
  const [notes, setNotes] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [userSettings, setUserSettings] = useState(null);
  const [error, setError] = useState(null);
  const [quoteGenerated, setQuoteGenerated] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const user = await base44.auth.me();
        const settings = await base44.entities.UserSetting.filter({ user_email: user.email });
        
        // Load global settings for LLM quoting instructions
        const globalSettingsList = await base44.entities.GlobalSetting.filter({ setting_key: 'main' });
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
    if (userSettings && !generating && !quoteGenerated) {
      generateQuote();
    }
  }, [userSettings, generating, quoteGenerated]);

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
    setError(null);

    try {
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
        setCalculationBreakdown([]);
        setEstimatedTime(damageItems.length * 2);
        setNotes('Per panel pricing applied.');
        setQuoteGenerated(true);
        setGenerating(false);
        return;
      }

      const hourlyRate = userSettings.hourly_rate || 70;
      const baseCost = userSettings.base_cost || 0;
      const pricingMatrix = userSettings.pricing_matrix || [];
      const globalSettings = userSettings._globalSettings;

      const calculatedLineItems = [];
      const breakdownDetails = [];
      let totalEstimatedHours = 0;
      let hasEstimates = false;

      for (let i = 0; i < damageItems.length; i++) {
        const item = damageItems[i];
        
        try {
          const calculation = calculateDamageItemPrice(item, hourlyRate, pricingMatrix);
          
          if (calculation.isEstimate) {
            hasEstimates = true;
          }
          
          breakdownDetails.push(calculation);
          totalEstimatedHours += calculation.roundedHoursForTech;
          
          // Use LLM to generate professional customer-facing description if global settings available
          if (globalSettings?.llm_quote_instructions) {
            try {
              const llmQuoteInstructions = globalSettings.llm_quote_instructions;
              
              const quotePrompt = `${llmQuoteInstructions}

INPUT DATA FOR THIS SINGLE DAMAGE ITEM:

Panel: ${item.panel}
Damage Type: ${item.damage_type}
Size Range: ${item.size_range}
Depth: ${item.depth || 'Shallow'}
Material: ${item.material === 'Aluminum' ? 'Aluminium' : item.material || 'Steel'}
Repair Method: ${item.repair_method || 'Good Tool Access'}
affects_body_line: ${item.affects_body_line ? 'true' : 'false'}
has_stretched_metal: ${item.has_stretched_metal ? 'true' : 'false'}
aluminium_panel: ${item.material === 'Aluminum' ? 'true' : 'false'}
matte_paint: ${(item.notes || '').toLowerCase().includes('matte') ? 'true' : 'false'}
Technician's Additional Notes: ${item.notes || 'None'}
FINAL CALCULATED PRICE: ${getCurrencySymbol()}${calculation.totalPrice.toFixed(2)} (DO NOT MODIFY)

REQUIRED OUTPUT:
Provide ONLY the line item description as a plain string. Example: "PDR Labour - Rear Door Standard Dent Repair (51mm - 80mm, Medium, Body Line Area)"

DO NOT include JSON formatting, quotes, or any other text - just the description string.`;

              const llmResponse = await base44.integrations.Core.InvokeLLM({
                prompt: quotePrompt
              });
              
              // LLM returns plain string now
              let description = typeof llmResponse === 'string' ? llmResponse.trim() : llmResponse;
              
              // Fallback if LLM returns something unexpected
              if (!description || description.length === 0 || description.length > 200) {
                throw new Error('Invalid LLM description');
              }
              
              calculatedLineItems.push({
                description: description,
                quantity: calculation.roundedHoursForTech,
                unit_price: hourlyRate,
                total_price: calculation.totalPrice
              });
              
            } catch (llmError) {
              console.error('LLM description generation failed, using fallback:', llmError);
              // Fallback to programmatic description
              let description = `PDR Labour - ${item.panel} ${item.damage_type} Repair (${item.size_range}`;
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
              
              calculatedLineItems.push({
                description: description,
                quantity: calculation.roundedHoursForTech,
                unit_price: hourlyRate,
                total_price: calculation.totalPrice
              });
            }
          } else {
            // No global settings - use programmatic fallback
            let description = `PDR Labour - ${item.panel} ${item.damage_type} Repair (${item.size_range}`;
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
            
            calculatedLineItems.push({
              description: description,
              quantity: calculation.roundedHoursForTech,
              unit_price: hourlyRate,
              total_price: calculation.totalPrice
            });
          }
          
        } catch (err) {
          console.error(`Error calculating item ${i + 1}:`, err);
          const fallbackHours = 2;
          calculatedLineItems.push({
            description: `PDR Labour - ${item.panel} Repair (Fallback)`,
            quantity: fallbackHours,
            unit_price: hourlyRate,
            total_price: fallbackHours * hourlyRate
          });
          totalEstimatedHours += fallbackHours;
          
          breakdownDetails.push({
            panel: item.panel,
            damageType: item.damage_type,
            sizeRange: item.size_range,
            error: err.message,
            fallbackUsed: true,
            isEstimate: true,
            totalPrice: fallbackHours * hourlyRate,
            fallbackReason: "Individual item calculation failed."
          });
          hasEstimates = true;
        }
      }

      if (baseCost > 0) {
        calculatedLineItems.unshift({
          description: 'Base Cost / Call-out Fee',
          quantity: 1,
          unit_price: baseCost,
          total_price: baseCost
        });
      }

      setLineItems(calculatedLineItems);
      setCalculationBreakdown(breakdownDetails);
      setEstimatedTime(totalEstimatedHours);
      
      // Generate customer-facing AI assessment notes
      let assessmentNotes = '';
      
      if (globalSettings?.llm_quote_instructions) {
        try {
          const hasStretchedMetal = damageItems.some(i => i.has_stretched_metal);
          const hasGluePull = damageItems.some(i => i.repair_method === 'Glue Pull Only');
          const hasLimitedAccess = damageItems.some(i => i.repair_method === 'Limited Tool Access');
          const hasNoAccess = damageItems.some(i => i.repair_method === 'Strip & Re-fit' || i.repair_method === 'Unsure');

          let openingSentenceInstruction = '';
          if (hasGluePull) {
            openingSentenceInstruction = 'OPENING SENTENCE (mandatory): "This is a glue pull only repair due to the location and access of the dent."';
          } else if (hasLimitedAccess) {
            openingSentenceInstruction = 'OPENING SENTENCE (mandatory): Write one sentence acknowledging that access to this area is restricted, but that the repair will be carried out to the highest standard.';
          } else if (hasNoAccess) {
            openingSentenceInstruction = 'OPENING SENTENCE (mandatory): Write one sentence noting that this area has limited or no direct access, and explain how the repair will be approached.';
          } else {
            openingSentenceInstruction = 'OPENING SENTENCE: Do NOT mention access or repair method. Go straight to the positive outcome statement about the expected improvement.';
          }

          const notesPrompt = `You are writing customer-facing notes for a professional dent repair quote. These notes appear on the customer's quote document. Write in first person as the business — use "we" not "your technician".

STRUCTURE — follow this exact order, one sentence per point:
1. ${openingSentenceInstruction}
2. A positive statement about the expected improvement to the appearance of the specific panel(s) after the repair.
${hasStretchedMetal ? '3. Include this stretched metal caveat — use this exact wording: "While we will work to restore it as much as possible, please keep in mind that due to the condition of the metal, a complete 100% restoration may not be achievable."' : ''}
${hasStretchedMetal ? '4.' : '3.'} Close with the goal: "Our goal is to make the damage less noticeable and enhance the overall look of your vehicle."

TONE RULES:
- First person, "we" not "your technician". Confident and professional. Never apologetic.
- Do NOT use: "We appreciate your understanding", "we hope", "unfortunately", "we apologise", "advise you of the outcome on completion", "discuss with you before work begins".
- Do NOT use jargon: no "PDR", "tool access", "repair method", "matrix".
- Reference the specific panel(s) and damage type — not generic.
- ${hasStretchedMetal ? '4' : '3'} sentences total.

DAMAGE BEING REPAIRED:
${damageItems.map((item, idx) => `${idx + 1}. ${item.panel} — ${item.damage_type}${item.size_range ? ` (${item.size_range})` : ''}${item.depth ? `, ${item.depth} depth` : ''}${item.affects_body_line ? ', crosses body line' : ''}${item.has_stretched_metal ? ', stretched metal present' : ''}${item.repair_method ? `, method: ${item.repair_method}` : ''}`).join('\n')}

OUTPUT: Plain text only. ${hasStretchedMetal ? '4' : '3'} sentences. No bullet points, no headings, no JSON.`;

          const notesResponse = await base44.integrations.Core.InvokeLLM({
            prompt: notesPrompt
          });
          
          const generatedNotes = typeof notesResponse === 'string' ? notesResponse.trim() : notesResponse;
          
          if (generatedNotes && generatedNotes.length > 10 && generatedNotes.length < 800) {
            assessmentNotes = generatedNotes;
          }
        } catch (notesError) {
          console.error('Failed to generate AI assessment notes:', notesError);
        }
      }
      
      setNotes(assessmentNotes);
      setQuoteGenerated(true);
      // Auto-save and navigate if onFinalSave is provided and we're not in multi-vehicle mode
      // (this is triggered from the analysis screen flow)

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
                  <p className="text-red-300">
                    <AlertTriangle className="inline-block w-4 h-4 mr-1" />
                    {breakdown.error || 'Fallback pricing used.'}
                  </p>
                ) : (
                  <>
                    <p><span className="font-semibold">Matrix Base:</span> {breakdown.matrixEntry?.damage_type} - {breakdown.matrixEntry?.size_range} ({getCurrencySymbol()}{breakdown.matrixEntry?.base_price?.toFixed(2)})</p>
                    <p><span className="font-semibold">Estimated Repair Time (for internal use):</span> {breakdown.roundedHoursForTech} hrs</p>
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