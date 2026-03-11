import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Camera, Upload, X, Loader2, ChevronDown, AlertTriangle, Plus, Receipt } from "lucide-react";
import { compressMultipleImages } from "../utils/imageCompression";
import { useAlert } from "@/components/ui/CustomAlert";

const CAR_PANELS = [
  "Bonnet/Hood", "Front Wing/Fender (Left)", "Front Wing/Fender (Right)",
  "Front Door (Left)", "Front Door (Right)", "Rear Door (Left)", "Rear Door (Right)",
  "Rear Quarter Panel (Left)", "Rear Quarter Panel (Right)", "Boot Lid/Trunk",
  "Roof", "A-Pillar", "B-Pillar", "C-Pillar", "Tailgate", "Other"
];

const BASE_DAMAGE_TYPES = ["Standard Dent", "Crease"];

const DEFAULT_SIZE_RANGES = [
  "up to 10mm", "11mm - 25mm", "26mm - 50mm", "51mm - 80mm",
  "81mm - 120mm", "121mm - 200mm", "201mm - 300mm", "301mm - 500mm",
  "501mm - 750mm", "751mm - 1000mm (or larger)"
];

const MATERIALS = ["Steel", "Aluminum", "Unsure"];

const REPAIR_METHODS = [
  "Good Tool Access", "Limited Tool Access", "Glue Pull Only",
  "Glue Pull + Rod Finish", "Unsure"
];

const DENT_DEPTH = ["Shallow", "Medium", "Deep/Sharp", "Unsure"];

const createDefaultDamageItem = () => ({
  panel: "",
  damage_type: "Standard Dent",
  size_range: "26mm - 50mm",
  material: "Steel",
  repair_method: "Good Tool Access",
  depth: "Shallow",
  has_stretched_metal: false,
  affects_body_line: false,
  dent_count: 1,
  notes: "",
  associated_photos_urls: []
});

export default function PhotoCapture({ initialPhotos = [], initialDamageItems = [], initialChargePerPanel = false, onPhotosCapture }) {
  const [uploadedPhotos, setUploadedPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [chargePerPanel, setChargePerPanel] = useState(initialChargePerPanel);
  const [damageItems, setDamageItems] = useState(
    initialDamageItems.length > 0
      ? initialDamageItems
      : (initialChargePerPanel ? [] : [createDefaultDamageItem()])
  );
  const [expandedItems, setExpandedItems] = useState(new Set([0]));
  const [uploadingItemIndex, setUploadingItemIndex] = useState(null);
  const [damageTypes, setDamageTypes] = useState(BASE_DAMAGE_TYPES);
  const [sizeRanges, setSizeRanges] = useState(DEFAULT_SIZE_RANGES);
  const [additionalLineItems, setAdditionalLineItems] = useState([]);
  const [showAddLineItemForm, setShowAddLineItemForm] = useState(false);
  const [newLineItemDescription, setNewLineItemDescription] = useState('');
  const [newLineItemPrice, setNewLineItemPrice] = useState('');
  const { showAlert } = useAlert();

  useEffect(() => {
    const loadPricingOptions = async () => {
      try {
        const currentUser = await base44.auth.me();
        const userSettingsList = await base44.entities.UserSetting.filter({ user_email: currentUser.email });
        if (userSettingsList.length > 0) {
          const settings = userSettingsList[0];
          const pricingMatrix = settings.pricing_matrix || [];
          const customTypes = settings.custom_damage_types || [];
          const customSizes = settings.custom_size_ranges || [];

          const matrixDamageTypes = [...new Set(pricingMatrix.map(e => e.damage_type))];
          const allDamageTypes = [...new Set([...BASE_DAMAGE_TYPES, ...matrixDamageTypes, ...customTypes])];
          setDamageTypes(allDamageTypes);

          const matrixSizeRanges = [...new Set(pricingMatrix.map(e => e.size_range))];
          const allSizeRanges = [...new Set([...DEFAULT_SIZE_RANGES, ...matrixSizeRanges, ...customSizes])];
          const sorted = allSizeRanges.sort((a, b) => {
            const n = s => { const m = s.match(/(\d+)/); return m ? parseInt(m[1]) : 0; };
            return n(a) - n(b);
          });
          setSizeRanges(sorted);
        }
      } catch (error) {
        console.error("Error loading pricing options:", error);
      }
    };
    loadPricingOptions();
  }, []);

  // ── Global photo upload ───────────────────────────────────────────────────
  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const compressed = await compressMultipleImages(files);
      const urls = await Promise.all(compressed.map(async f => {
        const r = await base44.integrations.Core.UploadFile({ file: f });
        return r.file_url;
      }));
      setUploadedPhotos(prev => [...prev, ...urls]);
    } catch (error) {
      console.error("Upload failed:", error);
      showAlert("Failed to upload photos. Please try again.", "Upload Error");
    } finally {
      setUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleRemovePhoto = (idx) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Per-item photo upload ─────────────────────────────────────────────────
  const handleItemFileSelect = async (event, itemIndex) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploadingItemIndex(itemIndex);
    try {
      const compressed = await compressMultipleImages(files);
      const urls = await Promise.all(compressed.map(async f => {
        const r = await base44.integrations.Core.UploadFile({ file: f });
        return r.file_url;
      }));
      setDamageItems(prev => {
        const updated = [...prev];
        updated[itemIndex] = {
          ...updated[itemIndex],
          associated_photos_urls: [...(updated[itemIndex].associated_photos_urls || []), ...urls]
        };
        return updated;
      });
      // Also surface in global pool so DamageAnalysis AI can use them
      setUploadedPhotos(prev => [...prev, ...urls]);
    } catch (error) {
      console.error("Item photo upload failed:", error);
      showAlert("Failed to upload photo. Please try again.", "Upload Error");
    } finally {
      setUploadingItemIndex(null);
      if (event.target) event.target.value = '';
    }
  };

  const handleRemoveItemPhoto = (itemIndex, photoUrl) => {
    setDamageItems(prev => {
      const updated = [...prev];
      updated[itemIndex] = {
        ...updated[itemIndex],
        associated_photos_urls: (updated[itemIndex].associated_photos_urls || []).filter(u => u !== photoUrl)
      };
      return updated;
    });
  };

  // ── Card expand/collapse ──────────────────────────────────────────────────
  const toggleItemExpand = (index) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  // ── Damage item CRUD ──────────────────────────────────────────────────────
  const handleAddDamageItem = () => {
    const newIndex = damageItems.length;
    setDamageItems(prev => [...prev, createDefaultDamageItem()]);
    setExpandedItems(prev => new Set([...prev, newIndex]));
  };

  const handleRemoveDamageItem = (indexToRemove) => {
    setDamageItems(prev => prev.filter((_, i) => i !== indexToRemove));
    setExpandedItems(prev => {
      const next = new Set();
      prev.forEach(i => {
        if (i < indexToRemove) next.add(i);
        else if (i > indexToRemove) next.add(i - 1);
      });
      return next;
    });
  };

  const handleDamageItemChange = (itemIndex, field, value) => {
    setDamageItems(prev => {
      const updated = [...prev];
      updated[itemIndex] = { ...updated[itemIndex], [field]: value };
      return updated;
    });
  };

  // ── Continue ──────────────────────────────────────────────────────────────
  const handleContinue = async () => {
    if (!chargePerPanel) {
      if (damageItems.length === 0) {
        await showAlert("Please add at least one damage item or enable 'Charge Per Panel' mode.", "Damage Items Required");
        return;
      }
      for (let i = 0; i < damageItems.length; i++) {
        const item = damageItems[i];
        if (!item.panel || !item.damage_type || !item.size_range) {
          await showAlert(`Damage item ${i + 1} is incomplete. Please fill in Panel, Damage Type, and Size Range.`, "Incomplete Entry");
          return;
        }
      }
    } else {
      if (damageItems.length === 0) {
        await showAlert("Please add at least one panel/damage entry.", "Panel Required");
        return;
      }
      for (let i = 0; i < damageItems.length; i++) {
        if (!damageItems[i].panel) {
          await showAlert(`Entry ${i + 1} needs a panel specified.`, "Panel Required");
          return;
        }
      }
    }

    onPhotosCapture({ photos: uploadedPhotos, damageItems, chargePerPanel, additionalLineItems });
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Camera className="w-5 h-5 text-purple-400" />
          Damage Documentation
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Detailed Damage Items ── */}
        {!chargePerPanel && (
          <div className="space-y-3">
            <Label className="text-white">Detailed Damage Items</Label>

            {damageItems.map((item, itemIndex) => {
              const isExpanded = expandedItems.has(itemIndex);
              const isItemUploading = uploadingItemIndex === itemIndex;

              return (
                <div key={itemIndex} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">

                  {/* Collapsible header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer select-none"
                    onClick={() => toggleItemExpand(itemIndex)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">
                          {item.panel || 'New Damage Item'}
                        </p>
                        {!isExpanded && (
                          <p className="text-slate-400 text-xs truncate">
                            {[item.damage_type, item.size_range].filter(Boolean).join(' · ') || 'Tap to expand'}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveDamageItem(itemIndex); }}
                      className="ml-2 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-700 pt-4">

                      {/* Per-item photos */}
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-sm">Photos for this item</Label>
                        {(item.associated_photos_urls || []).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {(item.associated_photos_urls || []).map((url, pIdx) => (
                              <div key={pIdx} className="relative w-16 h-16 flex-shrink-0">
                                <img src={url} alt={`Item photo ${pIdx + 1}`} className="w-full h-full object-cover rounded" />
                                <button
                                  onClick={() => handleRemoveItemPhoto(itemIndex, url)}
                                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <label className="flex-1">
                            <input type="file" accept="image/*" capture="environment"
                              onChange={(e) => handleItemFileSelect(e, itemIndex)}
                              className="hidden" disabled={uploadingItemIndex !== null} />
                            <Button type="button" variant="outline" size="sm"
                              className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-xs"
                              disabled={uploadingItemIndex !== null}
                              onClick={(e) => e.currentTarget.previousElementSibling.click()}>
                              {isItemUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Camera className="w-3 h-3 mr-1" />}
                              Camera
                            </Button>
                          </label>
                          <label className="flex-1">
                            <input type="file" accept="image/*" multiple
                              onChange={(e) => handleItemFileSelect(e, itemIndex)}
                              className="hidden" disabled={uploadingItemIndex !== null} />
                            <Button type="button" variant="outline" size="sm"
                              className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-xs"
                              disabled={uploadingItemIndex !== null}
                              onClick={(e) => e.currentTarget.previousElementSibling.click()}>
                              <Upload className="w-3 h-3 mr-1" />
                              Gallery
                            </Button>
                          </label>
                        </div>
                      </div>

                      {/* Glue pull warning */}
                      {(item.repair_method === "Glue Pull Only" || item.repair_method === "Glue Pull + Rod Finish") &&
                        (item.depth === "Deep/Sharp" || item.affects_body_line || item.has_stretched_metal) && (
                        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <p className="text-yellow-300 text-xs">
                            Warning: Glue pull only may not be suitable for deep dents, body lines, or stretched metal. Consider alternative repair methods.
                          </p>
                        </div>
                      )}

                      {/* Damage details grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-white">Panel <span className="text-red-400">*</span></Label>
                          <Select value={item.panel} onValueChange={(v) => handleDamageItemChange(itemIndex, 'panel', v)}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Select panel" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {CAR_PANELS.map(p => <SelectItem key={p} value={p} className="text-white hover:bg-slate-700">{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Damage Type <span className="text-red-400">*</span></Label>
                          <Select value={item.damage_type} onValueChange={(v) => handleDamageItemChange(itemIndex, 'damage_type', v)}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {damageTypes.map(t => <SelectItem key={t} value={t} className="text-white hover:bg-slate-700">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Size Range <span className="text-red-400">*</span></Label>
                          <Select value={item.size_range} onValueChange={(v) => handleDamageItemChange(itemIndex, 'size_range', v)}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {sizeRanges.map(r => <SelectItem key={r} value={r} className="text-white hover:bg-slate-700">{r}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Material</Label>
                          <Select value={item.material} onValueChange={(v) => handleDamageItemChange(itemIndex, 'material', v)}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {MATERIALS.map(m => <SelectItem key={m} value={m} className="text-white hover:bg-slate-700">{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Repair Method</Label>
                          <Select value={item.repair_method} onValueChange={(v) => handleDamageItemChange(itemIndex, 'repair_method', v)}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {REPAIR_METHODS.map(m => <SelectItem key={m} value={m} className="text-white hover:bg-slate-700">{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Depth</Label>
                          <Select value={item.depth} onValueChange={(v) => handleDamageItemChange(itemIndex, 'depth', v)}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {DENT_DEPTH.map(d => <SelectItem key={d} value={d} className="text-white hover:bg-slate-700">{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch id={`stretched-${itemIndex}`} checked={item.has_stretched_metal}
                            onCheckedChange={(c) => handleDamageItemChange(itemIndex, 'has_stretched_metal', c)}
                            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600" />
                          <Label htmlFor={`stretched-${itemIndex}`} className="text-white text-sm">Stretched Metal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id={`bodyline-${itemIndex}`} checked={item.affects_body_line}
                            onCheckedChange={(c) => handleDamageItemChange(itemIndex, 'affects_body_line', c)}
                            className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600" />
                          <Label htmlFor={`bodyline-${itemIndex}`} className="text-white text-sm">Affects Body Line</Label>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label className="text-white">Additional Notes</Label>
                        <Input value={item.notes} onChange={(e) => handleDamageItemChange(itemIndex, 'notes', e.target.value)}
                          placeholder="e.g., near fuel door, double skin panel, matte paint finish..."
                          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add line item form */}
            {showAddLineItemForm && (
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
                <p className="text-white text-sm font-medium">Add Line Item</p>
                <Input value={newLineItemDescription} onChange={(e) => setNewLineItemDescription(e.target.value)}
                  placeholder="e.g. Strip & Re-fit, Paint correction, Headlamp restoration"
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                <Input type="number" value={newLineItemPrice} onChange={(e) => setNewLineItemPrice(e.target.value)}
                  placeholder="Price (GBP)" className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                <div className="flex gap-2">
                  <Button onClick={() => {
                    const price = parseFloat(newLineItemPrice) || 0;
                    if (!newLineItemDescription.trim() || price <= 0) return;
                    setAdditionalLineItems(prev => [...prev, { description: newLineItemDescription.trim(), quantity: 1, unit_price: price, total_price: price }]);
                    setNewLineItemDescription(''); setNewLineItemPrice(''); setShowAddLineItemForm(false);
                  }} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm">Add</Button>
                  <Button variant="outline" onClick={() => { setShowAddLineItemForm(false); setNewLineItemDescription(''); setNewLineItemPrice(''); }}
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 text-sm">Cancel</Button>
                </div>
              </div>
            )}

            {additionalLineItems.length > 0 && (
              <div className="space-y-2">
                {additionalLineItems.map((li, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 border border-slate-600 rounded-lg">
                    <div>
                      <p className="text-white text-sm">{li.description}</p>
                      <p className="text-slate-400 text-xs">£{li.total_price.toFixed(2)}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setAdditionalLineItems(prev => prev.filter((_, i) => i !== idx))}
                      className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-900/20">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {damageItems.length > 0 && !showAddLineItemForm && (
              <Button onClick={() => setShowAddLineItemForm(true)} variant="outline"
                className="w-full bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white text-sm">
                <Receipt className="w-4 h-4 mr-2" />+ Add Line Item
              </Button>
            )}

            <Button onClick={handleAddDamageItem} variant="outline"
              className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              {damageItems.length === 0 ? 'Add First Damage Item' : 'Add More Damage'}
            </Button>
          </div>
        )}

        {/* ── Simplified per-panel items ── */}
        {chargePerPanel && (
          <div className="space-y-4">
            <Label className="text-white">Panel List (Simplified)</Label>

            {damageItems.length === 0 && (
              <div className="text-center p-6 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700">
                <p className="text-slate-400 text-sm mb-3">No panels added yet</p>
                <Button onClick={handleAddDamageItem} variant="outline" size="sm"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                  Add First Panel
                </Button>
              </div>
            )}

            {damageItems.map((item, itemIndex) => (
              <div key={itemIndex} className="bg-slate-800 rounded-lg p-4 space-y-3 border border-slate-700">
                <div className="space-y-2">
                  <Label className="text-white">Panel <span className="text-red-400">*</span></Label>
                  <Select value={item.panel} onValueChange={(v) => handleDamageItemChange(itemIndex, 'panel', v)}>
                    <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Select panel" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {CAR_PANELS.map(p => <SelectItem key={p} value={p} className="text-white hover:bg-slate-700">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Notes/Description</Label>
                  <Input value={item.notes} onChange={(e) => handleDamageItemChange(itemIndex, 'notes', e.target.value)}
                    placeholder="Brief description of damage..."
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" />
                </div>
                <Button onClick={() => handleRemoveDamageItem(itemIndex)} variant="outline" size="sm"
                  className="w-full border-red-700 text-red-400 hover:bg-red-900/20">
                  <X className="w-4 h-4 mr-2" />Remove Panel
                </Button>
              </div>
            ))}

            {damageItems.length > 0 && (
              <Button onClick={handleAddDamageItem} variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-semibold">
                <Plus className="w-4 h-4 mr-2" />Add a Panel
              </Button>
            )}
          </div>
        )}

        {/* ── Continue ── */}
        <Button
          onClick={handleContinue}
          disabled={uploading || uploadingItemIndex !== null}
          className="w-full pink-gradient text-white font-semibold"
        >
          Continue to {chargePerPanel ? 'Quote' : 'Analysis'}
        </Button>

      </CardContent>
    </Card>
  );
}