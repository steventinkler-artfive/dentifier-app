import React from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toDisplayDamageType } from "@/utils/damageTypeDisplay";

/**
 * Fix 1: shown when quote generation is blocked because damage items have no
 * matrix price for their damage type. No prices are produced, nothing is saved,
 * and the assessment stays where it is so the technician can resolve it.
 */
export default function UnpricedItemsCard({ items, onOpenSettings }) {
  return (
    <Card className="bg-red-900/20 border-red-700">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-200 font-medium">Quote stopped — some damage items have no matrix price</p>
            <ul className="mt-2 space-y-1">
              {items.map((item, idx) => (
                <li key={idx} className="text-red-200 text-sm">
                  No matrix price for {toDisplayDamageType(item.damageType)}, {item.sizeRange} ({item.panel}). Add a price in Settings, or change the damage type.
                </li>
              ))}
            </ul>
            <p className="text-red-300 text-sm mt-2">
              Nothing has been saved and no prices were generated.
            </p>
            {onOpenSettings && (
              <Button
                onClick={onOpenSettings}
                variant="outline"
                size="sm"
                className="mt-2 border-red-600 text-red-200 hover:bg-red-800 hover:text-white"
              >
                Open Settings
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}