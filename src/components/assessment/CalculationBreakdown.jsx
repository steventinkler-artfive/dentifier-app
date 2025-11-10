import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";

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

  // Helper function to format matrix entry as string
  const formatMatrixEntry = (entry) => {
    if (!entry) return 'N/A';
    
    // FIXED: Prioritize showing structured data when available
    if (entry.size_range && entry.damage_type) {
      return `${entry.damage_type} • ${entry.size_range} • ${getCurrencySymbol()}${entry.base_price?.toFixed(2) || '0.00'}`;
    }
    
    // Only show notes if structured data is missing
    if (entry.notes) return entry.notes;
    
    return 'Matrix entry data unavailable';
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm mb-4">
        Detailed pricing calculation for verification purposes
      </p>

      {breakdownData.map((item, index) => (
        <div key={index} className="p-4 rounded-lg border bg-slate-800 border-slate-700">
          {item.fallbackUsed ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-300">
                    Damage Item {index + 1}: {item.panel || 'N/A'}
                  </h4>
                  <p className="text-yellow-200 text-sm mt-1">
                    Fallback pricing used: {item.error || 'Unknown error'}
                  </p>
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
                    {item.damageType || 'N/A'} • {item.sizeRange || 'N/A'} • {item.material || 'N/A'}
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

                {/* Base Calculation */}
                {(item.baseSteelPrice !== undefined || item.basePrice !== undefined) && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400">Matrix Base Price:</span>
                      <span className="text-white ml-2 font-medium">
                        {getCurrencySymbol()}{(item.baseSteelPrice || item.basePrice)?.toFixed(2)}
                      </span>
                    </div>
                    {item.aluminumMultiplier > 1 && (
                      <div>
                        <span className="text-slate-400">Aluminum (x1.35):</span>
                        <span className="text-white ml-2 font-medium">
                          {getCurrencySymbol()}{item.basePrice?.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Multipliers */}
                {item.multipliers && (
                  <div className="p-3 bg-slate-900 rounded">
                    <p className="text-xs text-slate-400 font-medium mb-2">MULTIPLIERS APPLIED:</p>
                    <div className="space-y-1 text-sm">
                      {item.multipliers.repairMethod && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">
                            Repair Method ({item.repairMethod || 'N/A'}):
                          </span>
                          <span className="text-white font-medium">
                            {item.multipliers.repairMethod.toFixed(2)}x
                          </span>
                        </div>
                      )}
                      {item.multipliers.depth && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">
                            Depth ({item.depth || 'N/A'}):
                          </span>
                          <span className="text-white font-medium">
                            {item.multipliers.depth.toFixed(2)}x
                          </span>
                        </div>
                      )}
                      {item.affectsBodyLine && item.multipliers.bodyLine && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Body Line:</span>
                          <span className="text-white font-medium">
                            {item.multipliers.bodyLine.toFixed(2)}x
                          </span>
                        </div>
                      )}
                      {item.hasStretchedMetal && item.multipliers.stretchedMetal && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Stretched Metal:</span>
                          <span className="text-white font-medium">
                            {item.multipliers.stretchedMetal.toFixed(2)}x
                          </span>
                        </div>
                      )}
                      {item.multipliers.notes && item.multipliers.notes !== 1.0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-300">Special Notes:</span>
                          <span className="text-white font-medium">
                            {item.multipliers.notes.toFixed(2)}x
                          </span>
                        </div>
                      )}
                      {item.multipliers.totalComplexity && (
                        <div className="flex justify-between pt-2 border-t border-slate-700">
                          <span className="text-green-300 font-medium">Total Multiplier:</span>
                          <span className="text-green-300 font-bold">
                            {item.multipliers.totalComplexity.toFixed(2)}x
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Final Calculation */}
                <div className="p-3 bg-green-900/20 rounded border border-green-700/50">
                  <div className="space-y-1 text-sm">
                    {item.adjustedPrice && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">Price (before rounding):</span>
                        <span className="text-white">
                          {getCurrencySymbol()}{item.adjustedPrice.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {item.roundedHoursForTech && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">Tech Hours (reference):</span>
                        <span className="text-white font-medium">
                          {item.roundedHoursForTech.toFixed(1)} hrs
                        </span>
                      </div>
                    )}
                    {item.totalPrice !== undefined && (
                      <div className="flex justify-between pt-2 border-t border-green-700/30">
                        <span className="text-green-300 font-semibold">Final Customer Price:</span>
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