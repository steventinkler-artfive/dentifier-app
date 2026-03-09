import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Car, Edit2, Save, Trash2, Plus, Loader2 } from "lucide-react";

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
  const [editingVehicleIdx, setEditingVehicleIdx] = useState(null);
  const [editedVehicles, setEditedVehicles] = useState(null);
  const [savingVehicle, setSavingVehicle] = useState(false);

  const currency = assessment.currency || "GBP";
  const sym = getCurrencySymbol(currency);
  const vehicles = assessment.vehicles || [];
  const grandTotal = vehicles.reduce((s, v) => s + (v.quote_amount || 0), 0);

  const startEditVehicle = (idx) => {
    setEditedVehicles(JSON.parse(JSON.stringify(assessment.vehicles)));
    setEditingVehicleIdx(idx);
  };

  const cancelEditVehicle = () => {
    setEditingVehicleIdx(null);
    setEditedVehicles(null);
  };

  const updateEditedField = (idx, field, value) => {
    setEditedVehicles((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const updateEditedLineItemPrice = (vIdx, liIdx, value) => {
    setEditedVehicles((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const price = parseFloat(value) || 0;
      updated[vIdx].line_items[liIdx].total_price = price;
      updated[vIdx].line_items[liIdx].unit_price = price;
      updated[vIdx].quote_amount = updated[vIdx].line_items.reduce(
        (s, i) => s + (i.total_price || 0),
        0
      );
      return updated;
    });
  };

  const updateEditedLineItemDesc = (vIdx, liIdx, value) => {
    setEditedVehicles((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated[vIdx].line_items[liIdx].description = value;
      return updated;
    });
  };

  const removeEditedLineItem = (vIdx, liIdx) => {
    setEditedVehicles((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated[vIdx].line_items = updated[vIdx].line_items.filter(
        (_, i) => i !== liIdx
      );
      updated[vIdx].quote_amount = updated[vIdx].line_items.reduce(
        (s, i) => s + (i.total_price || 0),
        0
      );
      return updated;
    });
  };

  const addEditedLineItem = (vIdx) => {
    setEditedVehicles((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated[vIdx].line_items.push({
        description: "PDR Labour - ",
        quantity: 1,
        unit_price: 60,
        total_price: 60,
      });
      updated[vIdx].quote_amount = updated[vIdx].line_items.reduce(
        (s, i) => s + (i.total_price || 0),
        0
      );
      return updated;
    });
  };

  const saveVehicleEdit = async () => {
    setSavingVehicle(true);
    try {
      const newTotal = editedVehicles.reduce(
        (s, v) => s + (v.quote_amount || 0),
        0
      );
      await base44.entities.Assessment.update(assessment.id, {
        vehicles: editedVehicles,
        quote_amount: newTotal,
      });
      setEditingVehicleIdx(null);
      setEditedVehicles(null);
      onAssessmentUpdate();
    } catch (err) {
      console.error("Error saving vehicle edit:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSavingVehicle(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Vehicle Cards */}
      {vehicles.map((v, idx) => {
        const label = v.registration
          ? [v.registration, v.colour, v.notes].filter(Boolean).join(" — ")
          : `Vehicle ${idx + 1}`;
        const lineItems = v.line_items || [];
        const subtotal = v.quote_amount || 0;
        const isEditing = editingVehicleIdx === idx;
        const ev = isEditing ? editedVehicles[idx] : null;
        const editedSubtotal = isEditing
          ? (ev.line_items || []).reduce((s, i) => s + (i.total_price || 0), 0)
          : 0;

        return (
          <Card key={idx} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Car className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {isEditing ? (
                    <div className="flex gap-2 flex-wrap flex-1">
                      <Input
                        value={ev.registration || ""}
                        onChange={(e) =>
                          updateEditedField(idx, "registration", e.target.value)
                        }
                        placeholder="Reg"
                        className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-28"
                      />
                      <Input
                        value={ev.colour || ""}
                        onChange={(e) =>
                          updateEditedField(idx, "colour", e.target.value)
                        }
                        placeholder="Colour"
                        className="bg-slate-800 border-slate-700 text-white text-sm h-8 w-24"
                      />
                    </div>
                  ) : (
                    <span className="text-white font-semibold text-sm truncate">
                      {label}
                    </span>
                  )}
                </div>
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEditVehicle(idx)}
                    className="h-7 w-7 text-slate-400 hover:text-white flex-shrink-0"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={saveVehicleEdit}
                      disabled={savingVehicle}
                      className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs px-3"
                    >
                      {savingVehicle ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditVehicle}
                      className="text-slate-400 h-8 text-xs px-2"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              {isEditing && (
                <Input
                  value={ev.notes || ""}
                  onChange={(e) =>
                    updateEditedField(idx, "notes", e.target.value)
                  }
                  placeholder="Notes (e.g. Peugeot 508)"
                  className="bg-slate-800 border-slate-700 text-white text-sm mt-2"
                />
              )}
            </CardHeader>
            <CardContent className="text-sm space-y-2 pt-1">
              {isEditing ? (
                <>
                  {(ev.line_items || []).map((item, liIdx) => (
                    <div
                      key={liIdx}
                      className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg"
                    >
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateEditedLineItemDesc(idx, liIdx, e.target.value)
                        }
                        className="bg-slate-700 border-slate-600 text-white text-xs flex-1 h-8"
                      />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-slate-400 text-xs">{sym}</span>
                        <Input
                          type="number"
                          step="5"
                          value={item.total_price === 0 ? "" : item.total_price}
                          onChange={(e) =>
                            updateEditedLineItemPrice(idx, liIdx, e.target.value)
                          }
                          className="bg-slate-700 border-slate-600 text-white text-xs w-20 h-8"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEditedLineItem(idx, liIdx)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addEditedLineItem(idx)}
                    className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-xs h-8"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Panel
                  </Button>
                  <div className="flex justify-between items-center p-2 bg-slate-800 rounded-lg mt-1 border-t border-slate-700">
                    <span className="text-slate-300 text-xs font-medium">Subtotal</span>
                    <span className="text-white font-semibold text-sm">
                      {formatCurrency(editedSubtotal, currency)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {lineItems.map((item, liIdx) => (
                    <div
                      key={liIdx}
                      className="flex justify-between items-start py-1.5 border-b border-slate-800 last:border-0"
                    >
                      <span className="text-slate-300 text-xs flex-1 pr-3">
                        {item.description}
                      </span>
                      <span className="text-white text-xs font-medium flex-shrink-0">
                        {formatCurrency(item.total_price || 0, currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-700">
                    <span className="text-slate-300 text-sm font-medium">Subtotal</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(subtotal, currency)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

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
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
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
                <Label
                  htmlFor="include-notes-pp"
                  className="text-white text-sm cursor-pointer"
                >
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