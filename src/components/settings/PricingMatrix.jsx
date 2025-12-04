import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, AlertCircle, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useAlert } from "@/components/ui/CustomAlert";

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

const DEFAULT_PRICING_MATRIX = [
  // Standard Dent - All 10 size ranges
  { damage_type: "Standard Dent", size_range: "up to 10mm", base_price: 60 },
  { damage_type: "Standard Dent", size_range: "11mm - 25mm", base_price: 90 },
  { damage_type: "Standard Dent", size_range: "26mm - 50mm", base_price: 120 },
  { damage_type: "Standard Dent", size_range: "51mm - 80mm", base_price: 180 },
  { damage_type: "Standard Dent", size_range: "81mm - 120mm", base_price: 240 },
  { damage_type: "Standard Dent", size_range: "121mm - 200mm", base_price: 300 },
  { damage_type: "Standard Dent", size_range: "201mm - 300mm", base_price: 360 },
  { damage_type: "Standard Dent", size_range: "301mm - 500mm", base_price: 450 },
  { damage_type: "Standard Dent", size_range: "501mm - 750mm", base_price: 550 },
  { damage_type: "Standard Dent", size_range: "751mm - 1000mm (or larger)", base_price: 650 },
  
  // Crease - First 7 size ranges
  { damage_type: "Crease", size_range: "11mm - 25mm", base_price: 150 },
  { damage_type: "Crease", size_range: "26mm - 50mm", base_price: 220 },
  { damage_type: "Crease", size_range: "51mm - 80mm", base_price: 280 },
  { damage_type: "Crease", size_range: "81mm - 120mm", base_price: 350 },
  { damage_type: "Crease", size_range: "121mm - 200mm", base_price: 420 },
  { damage_type: "Crease", size_range: "201mm - 300mm", base_price: 500 },
  { damage_type: "Crease", size_range: "301mm - 500mm", base_price: 600 }
];

export default function PricingMatrix({ pricingMatrix, customDamageTypes, customSizeRanges = [], onChange, onCustomTypesChange, onCustomSizeRangesChange, currency, worksOnAluminum }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [newCustomTypeName, setNewCustomTypeName] = useState("");
  const [isAddingCustomSizeRange, setIsAddingCustomSizeRange] = useState(false);
  const [newCustomSizeRange, setNewCustomSizeRange] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const { showAlert, showConfirm } = useAlert();

  const getCurrencySymbol = (curr) => {
    const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
    return symbols[curr] || '£';
  };

  const handleAddEntry = () => {
    const newEntry = {
      damage_type: "",
      size_range: "",
      base_price: 0
    };
    onChange([...pricingMatrix, newEntry]);
  };

  const handleRemoveEntry = (index) => {
    const updated = pricingMatrix.filter((_, i) => i !== index);
    onChange(updated);
    setDeleteDialogOpen(false);
    setEntryToDelete(null);
  };

  const handleUpdateEntry = (index, field, value) => {
    const updated = [...pricingMatrix];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleAddCustomType = async () => {
    if (!newCustomTypeName.trim()) return;
    
    const allTypes = [...CORE_DAMAGE_TYPES, ...customDamageTypes];
    if (allTypes.includes(newCustomTypeName.trim())) {
      await showAlert("This damage type already exists!", "Duplicate Entry");
      return;
    }

    const updatedCustomTypes = [...customDamageTypes, newCustomTypeName.trim()];
    onCustomTypesChange(updatedCustomTypes);
    setNewCustomTypeName("");
    setIsAddingCustomType(false);
  };

  const handleDeleteCustomType = async (typeToDelete) => {
    const entriesUsingType = pricingMatrix.filter(entry => entry.damage_type === typeToDelete);
    
    if (entriesUsingType.length > 0) {
      const confirmed = await showConfirm(
        `This custom type is used in ${entriesUsingType.length} pricing ${entriesUsingType.length === 1 ? 'entry' : 'entries'}. If you delete it, those entries will also be removed. Continue?`,
        "Delete Custom Type"
      );
      if (!confirmed) return;
      
      const updatedMatrix = pricingMatrix.filter(entry => entry.damage_type !== typeToDelete);
      onChange(updatedMatrix);
    }
    
    const updatedCustomTypes = customDamageTypes.filter(type => type !== typeToDelete);
    onCustomTypesChange(updatedCustomTypes);
  };

  const handleAddCustomSizeRange = async () => {
    if (!newCustomSizeRange.trim()) return;
    
    const allSizes = [...SIZE_RANGE_OPTIONS, ...customSizeRanges];
    if (allSizes.includes(newCustomSizeRange.trim())) {
      await showAlert("This size range already exists!", "Duplicate Entry");
      return;
    }

    const updatedCustomSizes = [...customSizeRanges, newCustomSizeRange.trim()];
    onCustomSizeRangesChange(updatedCustomSizes);
    setNewCustomSizeRange("");
    setIsAddingCustomSizeRange(false);
  };

  const handleDeleteCustomSizeRange = async (sizeToDelete) => {
    const entriesUsingSize = pricingMatrix.filter(entry => entry.size_range === sizeToDelete);
    
    if (entriesUsingSize.length > 0) {
      const confirmed = await showConfirm(
        `This custom size range is used in ${entriesUsingSize.length} pricing ${entriesUsingSize.length === 1 ? 'entry' : 'entries'}. If you delete it, those entries will also be removed. Continue?`,
        "Delete Custom Size Range"
      );
      if (!confirmed) return;
      
      const updatedMatrix = pricingMatrix.filter(entry => entry.size_range !== sizeToDelete);
      onChange(updatedMatrix);
    }
    
    const updatedCustomSizes = customSizeRanges.filter(size => size !== sizeToDelete);
    onCustomSizeRangesChange(updatedCustomSizes);
  };

  const handleResetToDefaults = () => {
    onChange(DEFAULT_PRICING_MATRIX);
    onCustomTypesChange([]);
    onCustomSizeRangesChange([]);
    setResetDialogOpen(false);
  };

  const allDamageTypes = [...CORE_DAMAGE_TYPES, ...customDamageTypes];
  const allSizeRanges = [...SIZE_RANGE_OPTIONS, ...customSizeRanges];

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader 
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            Pricing Matrix
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={(e) => {
                e.stopPropagation();
                setResetDialogOpen(true);
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
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
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mt-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-200 space-y-1">
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
                      className="h-5 w-5 p-0 hover:bg-red-900 text-slate-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Size Ranges Management */}
          {customSizeRanges.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white text-sm">Your Custom Size Ranges</Label>
              <div className="flex flex-wrap gap-2">
                {customSizeRanges.map((size) => (
                  <div key={size} className="flex items-center gap-1 bg-slate-800 rounded-lg px-3 py-1.5 border border-slate-700">
                    <span className="text-white text-sm">{size}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCustomSizeRange(size)}
                      className="h-5 w-5 p-0 hover:bg-red-900 text-slate-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matrix Entries */}
          <div className="space-y-0 divide-y divide-slate-700">
            {pricingMatrix.map((entry, index) => (
              <div key={index} className="py-5 first:pt-0 last:pb-0">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
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
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9">
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
                      onValueChange={(value) => {
                        if (value === "__add_custom_size__") {
                          setIsAddingCustomSizeRange(true);
                        } else {
                          handleUpdateEntry(index, 'size_range', value);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {allSizeRanges.map(range => (
                          <SelectItem key={range} value={range} className="text-white hover:bg-slate-700">
                            {range}
                          </SelectItem>
                        ))}
                        <SelectItem value="__add_custom_size__" className="text-green-400 hover:bg-slate-700 border-t border-slate-600">
                          + Add Custom Size Range
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-xs">Price</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEntryToDelete(index);
                          setDeleteDialogOpen(true);
                        }}
                        className="h-5 w-5 p-0 hover:bg-red-900/20 text-slate-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
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
                        className="bg-slate-800 border-slate-700 text-white pl-6 h-9"
                      />
                    </div>
                  </div>
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

          {/* Add Custom Size Range Modal */}
          {isAddingCustomSizeRange && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
              <Label className="text-white">Create Custom Size Range</Label>
              <Input
                value={newCustomSizeRange}
                onChange={(e) => setNewCustomSizeRange(e.target.value)}
                placeholder="e.g., 1001mm - 1500mm, Extra Large"
                className="bg-slate-900 border-slate-700 text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomSizeRange();
                  }
                }}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleAddCustomSizeRange}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Create Size Range
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddingCustomSizeRange(false);
                    setNewCustomSizeRange("");
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
            <p>• {allSizeRanges.length} size {allSizeRanges.length === 1 ? 'range' : 'ranges'} available ({SIZE_RANGE_OPTIONS.length} standard + {customSizeRanges.length} custom)</p>
            {worksOnAluminum && <p>• Aluminum pricing: automatic 1.35x multiplier</p>}
          </div>
        </CardContent>
      )}

      {/* Delete Entry Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this pricing entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRemoveEntry(entryToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset to Defaults Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reset Pricing Matrix?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to reset the pricing matrix to its default settings? This will delete all custom damage types and custom size ranges you've created, and remove all current pricing entries, reverting to the original 'Standard Dent' and 'Crease' types with their default size ranges and prices. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetToDefaults}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}