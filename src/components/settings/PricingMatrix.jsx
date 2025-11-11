import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

const CORE_DAMAGE_TYPES = ["Standard Dent", "Crease"];

const SIZE_RANGE_OPTIONS = [
  "up to 10mm",
  "11mm - 25mm",
  "26mm - 50mm",
  "51mm - 80mm",
  "81mm - 120mm",
  "121mm - 200mm",
  "201mm - 300mm",
  "301mm - 500mm",
  "501mm - 750mm",
  "751mm - 1000mm (or larger)"
];

export default function PricingMatrix({ pricingMatrix, customDamageTypes, onChange, onCustomTypesChange, currency, worksOnAluminum }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [newCustomTypeName, setNewCustomTypeName] = useState("");

  const getCurrencySymbol = (curr) => {
    const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
    return symbols[curr] || '£';
  };

  const handleAddEntry = () => {
    const newEntry = {
      damage_type: "Standard Dent",
      size_range: "26mm - 50mm",
      base_price: 120
    };
    onChange([...pricingMatrix, newEntry]);
  };

  const handleRemoveEntry = (index) => {
    const updated = pricingMatrix.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateEntry = (index, field, value) => {
    const updated = [...pricingMatrix];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleAddCustomType = () => {
    if (!newCustomTypeName.trim()) return;
    
    const allTypes = [...CORE_DAMAGE_TYPES, ...customDamageTypes];
    if (allTypes.includes(newCustomTypeName.trim())) {
      alert("This damage type already exists!");
      return;
    }

    const updatedCustomTypes = [...customDamageTypes, newCustomTypeName.trim()];
    onCustomTypesChange(updatedCustomTypes);
    setNewCustomTypeName("");
    setIsAddingCustomType(false);
  };

  const handleDeleteCustomType = (typeToDelete) => {
    const entriesUsingType = pricingMatrix.filter(entry => entry.damage_type === typeToDelete);
    
    if (entriesUsingType.length > 0) {
      const confirmed = window.confirm(
        `This custom type is used in ${entriesUsingType.length} pricing ${entriesUsingType.length === 1 ? 'entry' : 'entries'}. ` +
        `If you delete it, those entries will also be removed. Continue?`
      );
      if (!confirmed) return;
      
      const updatedMatrix = pricingMatrix.filter(entry => entry.damage_type !== typeToDelete);
      onChange(updatedMatrix);
    }
    
    const updatedCustomTypes = customDamageTypes.filter(type => type !== typeToDelete);
    onCustomTypesChange(updatedCustomTypes);
  };

  const allDamageTypes = [...CORE_DAMAGE_TYPES, ...customDamageTypes];

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader 
        className="cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            Pricing Matrix
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </Button>
        </div>
        <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3 mt-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300 space-y-1">
              <p className="font-medium">Matrix prices are for steel panels (market rate)</p>
              <p>• Aluminum repairs automatically calculated at 1.35x steel price</p>
              <p>• These are customer-facing prices, adjusted for complexity during quoting</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Custom Damage Types Management */}
          {customDamageTypes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white text-sm">Your Custom Damage Types</Label>
              <div className="flex flex-wrap gap-2">
                {customDamageTypes.map((type) => (
                  <div key={type} className="flex items-center gap-1 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                    <span className="text-white text-sm">{type}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCustomType(type)}
                      className="h-5 w-5 p-0 hover:bg-red-900/50 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matrix Entries */}
          <div className="space-y-3">
            {pricingMatrix.map((entry, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end bg-slate-800 p-3 rounded-lg">
                <div className="col-span-4 space-y-1">
                  <Label className="text-slate-400 text-xs">Damage Type</Label>
                  <Select
                    value={entry.damage_type}
                    onValueChange={(value) => {
                      if (value === "__add_custom__") {
                        setIsAddingCustomType(true);
                      } else {
                        handleUpdateEntry(index, 'damage_type', value);
                      }
                    }}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {allDamageTypes.map(type => (
                        <SelectItem key={type} value={type} className="text-white hover:bg-slate-700">
                          {type}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_custom__" className="text-green-400 hover:bg-slate-700 border-t border-slate-600">
                        + Add Custom Type
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-4 space-y-1">
                  <Label className="text-slate-400 text-xs">Size Range</Label>
                  <Select
                    value={entry.size_range}
                    onValueChange={(value) => handleUpdateEntry(index, 'size_range', value)}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {SIZE_RANGE_OPTIONS.map(range => (
                        <SelectItem key={range} value={range} className="text-white hover:bg-slate-700">
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-3 space-y-1">
                  <Label className="text-slate-400 text-xs">Price (Steel)</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      {getCurrencySymbol(currency)}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="5"
                      value={entry.base_price}
                      onChange={(e) => handleUpdateEntry(index, 'base_price', parseFloat(e.target.value) || 0)}
                      className="bg-slate-900 border-slate-700 text-white pl-6 h-9"
                    />
                  </div>
                </div>

                <div className="col-span-1 flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEntry(index)}
                    className="h-9 w-9 p-0 hover:bg-red-900/50 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Custom Type Modal */}
          {isAddingCustomType && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
              <Label className="text-white">Create Custom Damage Type</Label>
              <Input
                value={newCustomTypeName}
                onChange={(e) => setNewCustomTypeName(e.target.value)}
                placeholder="e.g., Hail Damage, Oversized Panel"
                className="bg-slate-900 border-slate-700 text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomType();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddCustomType}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Create Type
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingCustomType(false);
                    setNewCustomTypeName("");
                  }}
                  className="flex-1 bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Add Entry Button */}
          <Button
            onClick={handleAddEntry}
            variant="outline"
            className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing Entry
          </Button>

          {/* Summary */}
          <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
            <p>• {pricingMatrix.length} pricing {pricingMatrix.length === 1 ? 'entry' : 'entries'} configured</p>
            <p>• {allDamageTypes.length} damage {allDamageTypes.length === 1 ? 'type' : 'types'} available ({CORE_DAMAGE_TYPES.length} core + {customDamageTypes.length} custom)</p>
            {worksOnAluminum && <p>• Aluminum pricing: automatic 1.35x multiplier</p>}
          </div>
        </CardContent>
      )}
    </Card>
  );
}