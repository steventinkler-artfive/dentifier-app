import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { toDisplayDamageType } from "@/utils/damageTypeDisplay";

export default function CalculationBreakdown({ breakdownData = [], currency = 'GBP' }) {
  if (!breakdownData || breakdownData.length === 0) {
    return (
      <div className="text-slate-400 text-sm text-center py-4">
        No calculation breakdown available
      </div>
    );
  }

  const getCurrencySymbol = () => {
    const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
    return symbols[currency] || '£';
  };

  // Helper to format multiplier as percentage
  const formatMultiplier = (value) => {
    if (value === undefined || value === null) return 'N/A';
    if (value === 1.0) return 'No uplift';
    const pct = Math.round((value - 1) * 100);
    return `${pct > 0 ? '+' : ''}${pct}%`;
  };

  // Helper function to format matrix entry as string
  const formatMatrixEntry = (entry) => {
    if (!entry) return 'N/A';
    
    // FIXED: Prioritize showing structured data when available
    if (entry.size_range && entry.damage_type) {
      return `${toDisplayDamageType(entry.damage_type)} • ${entry.size_range} • ${getCurrencySymbol()}${entry.base_price?.toFixed(2) || '0.00'}`;
    }
    
    // Only show notes if structured data is missing
    if (entry.notes) return entry.notes;
    
    return 'Matrix entry data unavailable';
  };

  // Running money value at each uplift step (display only — compounding, the
  // multipliers and the 2.5x cap are untouched; adjustedPrice and totalPrice
  // remain the authoritative figures).
  const buildUpliftSteps = (item) => {
    // Base is the material-adjusted base price the engine applies complexity
    // to (basePrice = matrix price x material). Material is not an uplift.
    const base = (item.basePrice !== undefined && item.basePrice !== null)
      ? item.basePrice
      : (item.baseSteelPrice || 0);
    const steps = [];
    let running = base;
    const push = (label, mult) => {
      if (!mult) return;
      if (mult === 1.0) {
        steps.push({ label, pctLabel: 'no uplift', amount: running, isUplift: false });
        return;
      }
      running *= mult;
      steps.push({ label, pctLabel: formatMultiplier(mult), amount: running, isUplift: true });
    };
    const m = item.multipliers || {};
    if (m.repairMethod) push(`Repair Method (${item.repairMethod || 'N/A'})`, m.repairMethod);
    if (m.depth) push(`Depth (${item.depth || 'N/A'})`, m.depth);
    if (item.paintType && m.paintType) push(`Paint Type (${item.paintType})`, m.paintType);
    if (item.affectsBodyLine && m.bodyLine) push('Body Line', m.bodyLine);
    if (item.hasStretchedMetal && m.stretchedMetal) push('Stretched Metal', m.stretchedMetal);
    if (m.notes && m.notes !== 1.0) push('Special Notes', m.notes);
    // The engine caps the complexity product (excluding material) at 2.5 and
    // stores the capped value, so recompute the uncapped product to know
    // whether the cap actually bit.
    const uncappedComplexity = [m.repairMethod, m.depth, m.bodyLine, m.stretchedMetal, m.paintType, m.notes]
      .reduce((acc, v) => acc * (v || 1.0), 1.0);
    const capped = uncappedComplexity > 2.5;
    const uncappedTotal = running;
    const runningTotal = capped ? (running / uncappedComplexity) * 2.5 : running;
    return { base, steps, uncappedComplexity, capped, uncappedTotal, runningTotal };
  };

  // Historical invented-price markers (pre-fix records). These breakdowns carry
  // a fabricated matrix entry, so they must render the warning branch — never
  // the green-ticked "MATRIX ENTRY USED" display. Data is untouched.
  const INVENTED_PRICE_MARKERS = [
    "No specific matrix data for this damage type",
    "Generic fallback - no suitable matrix data found"
  ];

  // Two right-aligned columns: uplift percentage, then the running
  // money value. The label column wraps under itself so long
  // labels never drag the numbers out of line.
  const rowClass = "grid grid-cols-[1fr_minmax(3.5rem,auto)_minmax(4.5rem,auto)] items-baseline gap-x-2 text-sm";

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm mb-4">
        Detailed pricing calculation for verification purposes
      </p>

      {breakdownData.map((item, index) => (
        <div key={index} className="p-4 rounded-lg border bg-slate-800 border-slate-700">
          {item.fallbackUsed || item.error || INVENTED_PRICE_MARKERS.includes(item.fallbackReason) ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-300">
                    Damage Item {index + 1}: {item.panel || 'N/A'}
                  </h4>
                  {INVENTED_PRICE_MARKERS.includes(item.fallbackReason) ? (
                    <p className="text-yellow-200 text-sm mt-1">
                      No matrix price existed for this item — the price shown was estimated from the hourly rate, not your pricing matrix.
                    </p>
                  ) : (
                    <p className="text-yellow-200 text-sm mt-1">
                      Fallback pricing used: {item.error || 'Unknown error'}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-yellow-200 text-xs mt-1">{item.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-white">
                    Damage Item {index + 1}: {item.panel || 'N/A'}
                  </h4>
                  <p className="text-slate-300 text-sm">
                    {toDisplayDamageType(item.damageType) || 'N/A'} • {item.sizeRange || 'N/A'} • {item.material === 'Aluminum' ? 'Aluminium' : (item.material || 'N/A')}
                  </p>
                </div>
              </div>

              {/* Matrix Entry */}
              <div className="pl-7 space-y-2">
                <div className="p-3 rounded border bg-slate-700 border-slate-600">
                  <p className="text-xs font-medium mb-1 text-slate-300">
                    MATRIX ENTRY USED:
                  </p>
                  <p className="text-white font-mono text-sm">{formatMatrixEntry(item.matrixEntry)}</p>
                </div>

                {/* Base price — material (if any) is part of establishing the
                    base, not a complexity uplift */}
                {(item.baseSteelPrice !== undefined || item.basePrice !== undefined) && (
                  <div className="space-y-1">
                    <div className={rowClass}>
                      <span className="text-slate-300 break-words pr-1">Matrix base price</span>
                      <span></span>
                      <span className="text-right text-white font-medium tabular-nums">
                        {getCurrencySymbol()}{(item.baseSteelPrice ?? item.basePrice)?.toFixed(2)}
                      </span>
                    </div>
                    {item.material && item.material !== 'Steel' &&
                      item.baseSteelPrice !== undefined && item.basePrice !== undefined && (
                      <div className={rowClass}>
                        <span className="text-slate-300 break-words pr-1">
                          {item.material === 'Aluminum' ? 'Aluminium' : item.material} panel
                        </span>
                        <span className="text-right text-slate-300 tabular-nums">
                          {formatMultiplier(item.basePrice / item.baseSteelPrice)}
                        </span>
                        <span className="text-right text-white font-medium tabular-nums">
                          {getCurrencySymbol()}{item.basePrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Multipliers */}
                {item.multipliers && (() => {
                  const uplift = buildUpliftSteps(item);
                  const symbol = getCurrencySymbol();
                  const upliftCount = uplift.steps.filter(s => s.isUplift).length;
                  const hasUplift = uplift.steps.some(s => s.isUplift);
                  const showRounding = item.adjustedPrice !== undefined && item.totalPrice !== undefined &&
                    Number(item.totalPrice) !== Number(item.adjustedPrice);
                  if (!hasUplift) {
                    return (
                      <div className="p-3 bg-slate-900 rounded">
                        <p className="text-slate-400 text-sm">No uplifts applied</p>
                      </div>
                    );
                  }
                  return (
                    <div className="p-3 bg-slate-900 rounded">
                      <p className="text-xs text-slate-400 font-medium mb-2">MULTIPLIERS APPLIED:</p>
                      <div className="space-y-1">
                        {uplift.steps.map((s, i) => (
                          <div key={i} className={rowClass}>
                            <span className={`break-words pr-1 ${s.isUplift ? 'text-slate-300' : 'text-slate-400'}`}>{s.label}</span>
                            <span className={`text-right tabular-nums ${s.isUplift ? 'text-slate-300' : 'text-slate-500'}`}>{s.pctLabel}</span>
                            <span className={`text-right tabular-nums font-medium ${s.isUplift ? 'text-white' : 'text-slate-400'}`}>{symbol}{s.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        {hasUplift && (
                          <div className={`${rowClass} pt-2 border-t border-slate-700`}>
                            <span className="text-green-300 font-medium break-words pr-1">
                              {uplift.capped ? 'Price after uplifts (capped)' : 'Price after uplifts'}
                            </span>
                            <span></span>
                            <span className="text-right text-green-300 font-bold tabular-nums">
                              {symbol}{uplift.runningTotal.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {showRounding && (
                          <div className={rowClass}>
                            <span className="text-slate-300 break-words pr-1">Rounded to nearest {symbol}5</span>
                            <span></span>
                            <span className="text-right text-white font-medium tabular-nums">
                              {symbol}{item.totalPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {uplift.capped ? (
                          <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                            <p>Uplifts capped — {symbol}{uplift.uncappedTotal.toFixed(2)} reduced to {symbol}{uplift.runningTotal.toFixed(2)}.</p>
                            <p>A repair never costs more than 2.5 times the base price.</p>
                          </div>
                        ) : upliftCount >= 2 ? (
                          <p className="text-xs text-slate-500 mt-2">
                            Each uplift applies to the price above it, not the base price.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })()}

                {/* Final Calculation */}
                <div className="p-3 bg-green-900/20 rounded border border-green-700/50">
                  <div className="space-y-1 text-sm">
                    {item.totalPrice !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-green-300 font-semibold">Final customer price</span>
                        <span className="text-green-300 font-bold text-lg">
                          {getCurrencySymbol()}{item.totalPrice.toFixed(2)} ✓
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}