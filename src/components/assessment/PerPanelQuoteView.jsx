import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Edit2, Save, Trash2, Plus, Loader2, Check, X } from "lucide-react";

const CAR_PANELS = [
  "Bonnet/Hood", "Front Wing/Fender (Left)", "Front Wing/Fender (Right)",
  "Front Door (Left)", "Front Door (Right)", "Rear Door (Left)", "Rear Door (Right)",
  "Rear Quarter Panel (Left)", "Rear Quarter Panel (Right)", "Boot Lid/Trunk",
  "Roof", "A-Pillar", "B-Pillar", "C-Pillar", "Tailgate", "Other"
];

export default function PerPanelQuoteView({
  assessment,
  onAssessmentUpdate,
  formatCurrency,
  getCurrencySymbol,
  editedNotes,
  setEditedNotes,
  editingNotes,
  setEditingNotes,
  handleSaveNotes,
  handleToggleNotesInQuote,
  includeNotesInQuote,
  isUpdating,
}) {
  const [vehicles, setVehicles] = useState([]);
  const [assessmentItems, setAssessmentItems] = useState([]);
  const [saving, setSaving] = useState(false);

  // editingItem: { type: 'vehicle', vehicleIdx, lineItemIdx } | { type: 'assessment', itemIdx } | null
  const [editingItem, setEditingItem] = useState(null);
  const [editValues, setEditValues] = useState({ description: "", price: 0 });

  // addingPanel: vehicleIdx | null
  // addingLineItem: vehicleIdx | 'assessment' | null
  const [addingPanel, setAddingPanel] = useState(null);
  const [addingLineItem, setAddingLineItem] = useState(null);
  const [newPanel, setNewPanel] = useState({ panel: "", description: "", price: 0 });
  const [newLineItem, setNewLineItem] = useState({ description: "", price: 0 });

  const currency = assessment.currency || "GBP";
  const sym = getCurrencySymbol(currency);

  // Default price for new panels: job_panel_price → first existing line item price → 60
  const defaultPanelPrice =
    assessment.job_panel_price ||
    assessment.vehicles?.[0]?.line_items?.[0]?.unit_price ||
    60;

  // Sync local state when assessment prop changes
  useEffect(() => {
    setVehicles(JSON.parse(JSON.stringify(assessment.vehicles || [])));
    setAssessmentItems(JSON.parse(JSON.stringify(assessment.line_items || [])));
  }, [assessment]);

  const saveToApi = async (updatedVehicles, updatedAssessmentItems) => {
    setSaving(true);
    try {
      const vehicleTotal = (updatedVehicles || vehicles).reduce((s, v) => s + (v.quote_amount || 0), 0);
      const assessmentTotal = (updatedAssessmentItems || assessmentItems).reduce((s, i) => s + (i.total_price || 0), 0);
      await base44.entities.Assessment.update(assessment.id, {
        vehicles: updatedVehicles || vehicles,
        line_items: updatedAssessmentItems || assessmentItems,
        quote_amount: vehicleTotal + assessmentTotal,
      });
      onAssessmentUpdate();
    } finally {
      setSaving(false);
    }
  };

  const recalcVehicle = (v) => ({
    ...v,
    quote_amount: (v.line_items || []).reduce((s, i) => s + (i.total_price || 0), 0),
  });

  // ─── Per-vehicle: edit existing item ───────────────────────────────────────
  const startEditVehicleItem = (vIdx, liIdx) => {
    const item = vehicles[vIdx].line_items[liIdx];
    setEditingItem({ type: "vehicle", vehicleIdx: vIdx, lineItemIdx: liIdx });
    setEditValues({ description: item.description, price: item.total_price });
    setAddingPanel(null);
    setAddingLineItem(null);
  };

  const saveEditVehicleItem = async () => {
    const { vehicleIdx, lineItemIdx } = editingItem;
    const updated = JSON.parse(JSON.stringify(vehicles));
    updated[vehicleIdx].line_items[lineItemIdx].description = editValues.description;
    updated[vehicleIdx].line_items[lineItemIdx].total_price = parseFloat(editValues.price) || 0;
    updated[vehicleIdx].line_items[lineItemIdx].unit_price = parseFloat(editValues.price) || 0;
    updated[vehicleIdx] = recalcVehicle(updated[vehicleIdx]);
    setVehicles(updated);
    setEditingItem(null);
    await saveToApi(updated, assessmentItems);
  };

  const removeVehicleItem = async (vIdx, liIdx) => {
    const updated = JSON.parse(JSON.stringify(vehicles));
    updated[vIdx].line_items = updated[vIdx].line_items.filter((_, i) => i !== liIdx);
    updated[vIdx] = recalcVehicle(updated[vIdx]);
    setVehicles(updated);
    await saveToApi(updated, assessmentItems);
  };

  // ─── Per-vehicle: add panel ─────────────────────────────────────────────────
  const openAddPanel = (vIdx) => {
    setAddingPanel(vIdx);
    setAddingLineItem(null);
    setEditingItem(null);
    setNewPanel({ panel: "", description: "", price: defaultPanelPrice });
  };

  const commitAddPanel = async (vIdx) => {
    if (!newPanel.panel) return;
    const price = parseFloat(newPanel.price) || defaultPanelPrice;
    const desc = `PDR Labour - ${newPanel.panel}${newPanel.description ? `: ${newPanel.description}` : ""}`;
    const updated = JSON.parse(JSON.stringify(vehicles));
    updated[vIdx].line_items.push({ description: desc, quantity: 1, unit_price: price, total_price: price });
    updated[vIdx] = recalcVehicle(updated[vIdx]);
    setVehicles(updated);
    setAddingPanel(null);
    setNewPanel({ panel: "", description: "", price: 0 });
    await saveToApi(updated, assessmentItems);
  };

  // ─── Per-vehicle: add custom line item ──────────────────────────────────────
  const openAddVehicleLineItem = (vIdx) => {
    setAddingLineItem(vIdx);
    setAddingPanel(null);
    setEditingItem(null);
    setNewLineItem({ description: "", price: 0 });
  };

  const commitAddVehicleLineItem = async (vIdx) => {
    if (!newLineItem.description.trim()) return;
    const price = parseFloat(newLineItem.price) || 0;
    const updated = JSON.parse(JSON.stringify(vehicles));
    updated[vIdx].line_items.push({ description: newLineItem.description, quantity: 1, unit_price: price, total_price: price });
    updated[vIdx] = recalcVehicle(updated[vIdx]);
    setVehicles(updated);
    setAddingLineItem(null);
    setNewLineItem({ description: "", price: 0 });
    await saveToApi(updated, assessmentItems);
  };

  // ─── Assessment-level: edit existing item ──────────────────────────────────
  const startEditAssessmentItem = (iIdx) => {
    const item = assessmentItems[iIdx];
    setEditingItem({ type: "assessment", itemIdx: iIdx });
    setEditValues({ description: item.description, price: item.total_price });
    setAddingPanel(null);
    setAddingLineItem(null);
  };

  const saveEditAssessmentItem = async () => {
    const { itemIdx } = editingItem;
    const updated = JSON.parse(JSON.stringify(assessmentItems));
    updated[itemIdx].description = editValues.description;
    updated[itemIdx].total_price = parseFloat(editValues.price) || 0;
    updated[itemIdx].unit_price = parseFloat(editValues.price) || 0;
    setAssessmentItems(updated);
    setEditingItem(null);
    await saveToApi(vehicles, updated);
  };

  const removeAssessmentItem = async (iIdx) => {
    const updated = assessmentItems.filter((_, i) => i !== iIdx);
    setAssessmentItems(updated);
    await saveToApi(vehicles, updated);
  };

  // ─── Assessment-level: add line item ───────────────────────────────────────
  const openAddAssessmentLineItem = () => {
    setAddingLineItem("assessment");
    setAddingPanel(null);
    setEditingItem(null);
    setNewLineItem({ description: "", price: 0 });
  };

  const commitAddAssessmentLineItem = async () => {
    if (!newLineItem.description.trim()) return;
    const price = parseFloat(newLineItem.price) || 0;
    const updated = [...assessmentItems, { description: newLineItem.description, quantity: 1, unit_price: price, total_price: price }];
    setAssessmentItems(updated);
    setAddingLineItem(null);
    setNewLineItem({ description: "", price: 0 });
    await saveToApi(vehicles, updated);
  };

  const cancelAdding = () => {
    setAddingPanel(null);
    setAddingLineItem(null);
    setEditingItem(null);
  };

  const vehicleTotal = vehicles.reduce((s, v) => s + (v.quote_amount || 0), 0);
  const assessmentLevelTotal = assessmentItems.reduce((s, i) => s + (i.total_price || 0), 0);
  const grandTotal = vehicleTotal + assessmentLevelTotal;

  return (
    <div className="space-y-4">
      {saving && (
        <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg text-slate-400 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
        </div>
      )}

      {/* ─── Vehicle Cards ─────────────────────────────────────────────── */}
      {vehicles.map((v, vIdx) => {
        const label = v.registration
          ? [v.registration, v.colour].filter(Boolean).join(" · ")
          : `Vehicle ${vIdx + 1}`;
        const sublabel = v.notes;
        const lineItems = v.line_items || [];

        return (
          <Card key={vIdx} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div>
                  <span className="text-white font-semibold text-sm">{label}</span>
                  {sublabel && <p className="text-slate-400 text-xs mt-0.5">{sublabel}</p>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5 pt-1">
              {/* Line items */}
              {lineItems.map((item, liIdx) => {
                const isEditing =
                  editingItem?.type === "vehicle" &&
                  editingItem.vehicleIdx === vIdx &&
                  editingItem.lineItemIdx === liIdx;

                return (
                  <div key={liIdx}>
                    {isEditing ? (
                      <div className="p-2 bg-slate-800 rounded-lg space-y-2 border border-slate-600">
                        <Input
                          value={editValues.description}
                          onChange={(e) => setEditValues((p) => ({ ...p, description: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white text-xs h-8"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">{sym}</span>
                          <Input
                            type="number"
                            step="5"
                            value={editValues.price}
                            onChange={(e) => setEditValues((p) => ({ ...p, price: e.target.value }))}
                            className="bg-slate-700 border-slate-600 text-white text-xs h-8 w-24"
                          />
                          <Button
                            size="sm"
                            onClick={saveEditVehicleItem}
                            disabled={saving}
                            className="bg-green-600 hover:bg-green-700 h-8 text-xs px-3"
                          >
                            <Check className="w-3 h-3 mr-1" />Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem(null)}
                            className="text-slate-400 h-8 text-xs px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-1.5 border-b border-slate-800 last:border-0">
                        <span className="text-slate-300 text-xs flex-1 pr-2">{item.description}</span>
                        <span className="text-white text-xs font-medium flex-shrink-0">
                          {formatCurrency(item.total_price || 0, currency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditVehicleItem(vIdx, liIdx)}
                          className="h-6 w-6 text-slate-400 hover:text-white flex-shrink-0"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeVehicleItem(vIdx, liIdx)}
                          className="h-6 w-6 text-red-400 hover:text-red-300 flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Panel inline form */}
              {addingPanel === vIdx && (
                <div className="p-3 bg-slate-800 rounded-lg space-y-2 border border-slate-600 mt-2">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Add Panel</p>
                  <Select
                    value={newPanel.panel}
                    onValueChange={(v) => setNewPanel((p) => ({ ...p, panel: v }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-xs h-8">
                      <SelectValue placeholder="Select panel" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {CAR_PANELS.map((p) => (
                        <SelectItem key={p} value={p} className="text-white hover:bg-slate-700">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={newPanel.description}
                    onChange={(e) => setNewPanel((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Description (e.g. 3x dents)"
                    className="bg-slate-700 border-slate-600 text-white text-xs h-8"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{sym}</span>
                    <Input
                      type="number"
                      step="5"
                      value={newPanel.price}
                      onChange={(e) => setNewPanel((p) => ({ ...p, price: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white text-xs h-8 w-28"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => commitAddPanel(vIdx)}
                      disabled={!newPanel.panel || saving}
                      className="bg-green-600 hover:bg-green-700 h-8 text-xs flex-1"
                    >
                      <Check className="w-3 h-3 mr-1" />Add Panel
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelAdding}
                      className="text-slate-400 h-8 text-xs px-3"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Add Line Item inline form (per vehicle) */}
              {addingLineItem === vIdx && (
                <div className="p-3 bg-slate-800 rounded-lg space-y-2 border border-slate-600 mt-2">
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">Add Line Item</p>
                  <Input
                    value={newLineItem.description}
                    onChange={(e) => setNewLineItem((p) => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Paint correction — bonnet"
                    className="bg-slate-700 border-slate-600 text-white text-xs h-8"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{sym}</span>
                    <Input
                      type="number"
                      step="5"
                      value={newLineItem.price}
                      onChange={(e) => setNewLineItem((p) => ({ ...p, price: e.target.value }))}
                      placeholder="0"
                      className="bg-slate-700 border-slate-600 text-white text-xs h-8 w-28"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => commitAddVehicleLineItem(vIdx)}
                      disabled={!newLineItem.description.trim() || saving}
                      className="bg-green-600 hover:bg-green-700 h-8 text-xs flex-1"
                    >
                      <Check className="w-3 h-3 mr-1" />Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelAdding}
                      className="text-slate-400 h-8 text-xs px-3"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Add buttons (shown when no inline form is open for this vehicle) */}
              {addingPanel !== vIdx && addingLineItem !== vIdx && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddPanel(vIdx)}
                    className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs h-8"
                  >
                    <Plus className="w-3 h-3 mr-1" />Add Panel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddVehicleLineItem(vIdx)}
                    className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-xs h-8"
                  >
                    <Plus className="w-3 h-3 mr-1" />Add Line Item
                  </Button>
                </div>
              )}

              {/* Subtotal */}
              <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-700">
                <span className="text-slate-300 text-sm font-medium">Subtotal</span>
                <span className="text-white font-semibold">
                  {formatCurrency(v.quote_amount || 0, currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* ─── Assessment-level line items ───────────────────────────────── */}
      {(assessmentItems.length > 0 || addingLineItem === "assessment") && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Additional Items</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5 pt-1">
            {assessmentItems.map((item, iIdx) => {
              const isEditing =
                editingItem?.type === "assessment" && editingItem.itemIdx === iIdx;
              return (
                <div key={iIdx}>
                  {isEditing ? (
                    <div className="p-2 bg-slate-800 rounded-lg space-y-2 border border-slate-600">
                      <Input
                        value={editValues.description}
                        onChange={(e) => setEditValues((p) => ({ ...p, description: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white text-xs h-8"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">{sym}</span>
                        <Input
                          type="number"
                          step="5"
                          value={editValues.price}
                          onChange={(e) => setEditValues((p) => ({ ...p, price: e.target.value }))}
                          className="bg-slate-700 border-slate-600 text-white text-xs h-8 w-24"
                        />
                        <Button
                          size="sm"
                          onClick={saveEditAssessmentItem}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700 h-8 text-xs px-3"
                        >
                          <Check className="w-3 h-3 mr-1" />Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(null)}
                          className="text-slate-400 h-8 text-xs px-2"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-1.5 border-b border-slate-800 last:border-0">
                      <span className="text-slate-300 text-xs flex-1 pr-2">{item.description}</span>
                      <span className="text-white text-xs font-medium flex-shrink-0">
                        {formatCurrency(item.total_price || 0, currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEditAssessmentItem(iIdx)}
                        className="h-6 w-6 text-slate-400 hover:text-white flex-shrink-0"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAssessmentItem(iIdx)}
                        className="h-6 w-6 text-red-400 hover:text-red-300 flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {addingLineItem === "assessment" && (
              <div className="p-3 bg-slate-800 rounded-lg space-y-2 border border-slate-600 mt-2">
                <Input
                  value={newLineItem.description}
                  onChange={(e) => setNewLineItem((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. Call-out fee, Travel"
                  className="bg-slate-700 border-slate-600 text-white text-xs h-8"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs">{sym}</span>
                  <Input
                    type="number"
                    step="5"
                    value={newLineItem.price}
                    onChange={(e) => setNewLineItem((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0"
                    className="bg-slate-700 border-slate-600 text-white text-xs h-8 w-28"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={commitAddAssessmentLineItem}
                    disabled={!newLineItem.description.trim() || saving}
                    className="bg-green-600 hover:bg-green-700 h-8 text-xs flex-1"
                  >
                    <Check className="w-3 h-3 mr-1" />Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelAdding}
                    className="text-slate-400 h-8 text-xs px-3"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assessment-level Add Line Item button */}
      {addingLineItem !== "assessment" && (
        <Button
          variant="outline"
          onClick={openAddAssessmentLineItem}
          className="w-full bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 text-sm h-10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Line Item
        </Button>
      )}

      {/* Grand Total */}
      <div className="p-4 bg-slate-800 rounded-xl border border-slate-600">
        <div className="flex justify-between items-center">
          <span className="text-white font-semibold">Grand Total</span>
          <span className="text-2xl font-bold text-green-400">
            {formatCurrency(grandTotal, currency)}
          </span>
        </div>
      </div>

      {/* Assessment Notes */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">Assessment Notes</CardTitle>
            {!editingNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingNotes(true)}
                className="text-blue-400 hover:text-blue-300 text-xs h-auto py-1"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {editingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={4}
                placeholder="Add notes..."
                className="bg-slate-800 border-slate-700 text-white text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Save</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingNotes(false);
                    setEditedNotes(assessment.notes || "");
                  }}
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-slate-400 whitespace-pre-wrap text-xs">
                {assessment.notes || "No notes added"}
              </p>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <Label htmlFor="include-notes-pp" className="text-white text-sm cursor-pointer">
                  Include notes in PDF quote
                </Label>
                <Switch
                  id="include-notes-pp"
                  checked={includeNotesInQuote}
                  onCheckedChange={handleToggleNotesInQuote}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}