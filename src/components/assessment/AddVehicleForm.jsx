import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, X, Camera, Upload } from "lucide-react";
import { compressMultipleImages } from "../utils/imageCompression";

const CAR_PANELS = [
  "Bonnet/Hood", "Front Wing/Fender (Left)", "Front Wing/Fender (Right)",
  "Front Door (Left)", "Front Door (Right)", "Rear Door (Left)", "Rear Door (Right)",
  "Rear Quarter Panel (Left)", "Rear Quarter Panel (Right)", "Boot Lid/Trunk",
  "Roof", "A-Pillar", "B-Pillar", "C-Pillar", "Tailgate", "Other"
];

const createEmptyPanel = () => ({ panel: '', notes: '' });

export default function AddVehicleForm({ customerId, onSave, onCancel, defaultPanelPrice = 60 }) {
  const [newVehicle, setNewVehicle] = useState({
    registration: '',
    colour: '',
    notes: '',
    panels: [createEmptyPanel()],
    photo_urls: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const updateNewVehicle = (field, value) => {
    setNewVehicle(prev => ({ ...prev, [field]: value }));
  };

  const addPanel = () => {
    setNewVehicle(prev => ({ ...prev, panels: [...prev.panels, createEmptyPanel()] }));
  };

  const removePanel = (panelIdx) => {
    setNewVehicle(prev => ({ ...prev, panels: prev.panels.filter((_, i) => i !== panelIdx) }));
  };

  const updatePanel = (panelIdx, field, value) => {
    setNewVehicle(prev => {
      const updatedPanels = [...prev.panels];
      updatedPanels[panelIdx] = { ...updatedPanels[panelIdx], [field]: value };
      return { ...prev, panels: updatedPanels };
    });
  };

  const handlePhotoUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const compressed = await compressMultipleImages(files);
      const urls = await Promise.all(compressed.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
      setNewVehicle(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, ...urls]
      }));
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (photoIdx) => {
    setNewVehicle(prev => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== photoIdx)
    }));
  };

  const handleSave = async () => {
    setError('');
    const validPanels = newVehicle.panels.filter(p => p.panel);
    if (validPanels.length === 0) {
      setError('Add at least one panel to the new vehicle.');
      return;
    }

    setIsSaving(true);
    try {
      const lineItems = validPanels.map(p => ({
        description: `PDR Labour - ${p.panel}${p.notes ? `: ${p.notes}` : ''}`,
        quantity: 1,
        unit_price: defaultPanelPrice,
        total_price: defaultPanelPrice
      }));

      const newVehicleData = {
        registration: newVehicle.registration || '',
        colour: newVehicle.colour || '',
        notes: newVehicle.notes || '',
        panels: validPanels,
        photo_urls: newVehicle.photo_urls,
        line_items: lineItems,
        quote_amount: defaultPanelPrice * validPanels.length
      };

      onSave(newVehicleData);
    } catch (e) {
      console.error('Error saving new vehicle:', e);
      setError('Failed to add new vehicle.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Add New Vehicle</h3>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white h-7 px-2"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-white text-sm">Reg</Label>
            <Input
              value={newVehicle.registration}
              onChange={e => updateNewVehicle('registration', e.target.value.toUpperCase())}
              placeholder="e.g. KP24 XXX"
              className="bg-[#f4c500] border-[#f4c500] text-slate-900 placeholder:text-slate-600 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white text-sm">Colour</Label>
            <Input
              value={newVehicle.colour}
              onChange={e => updateNewVehicle('colour', e.target.value)}
              placeholder="e.g. Silver, White, Black"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white text-sm">Notes</Label>
            <Input
              value={newVehicle.notes}
              onChange={e => updateNewVehicle('notes', e.target.value)}
              placeholder="e.g. Silver Astra — nearside rear door, light crease"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Panels Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px bg-slate-600 flex-1" />
            <span className="text-slate-400 text-sm font-medium">Panels</span>
            <div className="h-px bg-slate-600 flex-1" />
          </div>

          {newVehicle.panels.map((panelItem, panelIdx) => (
            <div key={panelIdx} className="bg-slate-800 rounded-lg p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-white text-xs">Panel</Label>
                <Select
                  value={panelItem.panel}
                  onValueChange={v => updatePanel(panelIdx, 'panel', v)}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select panel" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CAR_PANELS.map(p => (
                      <SelectItem key={p} value={p} className="text-white hover:bg-slate-700">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white text-xs">Description</Label>
                <Input
                  value={panelItem.notes}
                  onChange={e => updatePanel(panelIdx, 'notes', e.target.value)}
                  placeholder="Brief description of damage..."
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              {newVehicle.panels.length > 1 && (
                <Button
                  onClick={() => removePanel(panelIdx)}
                  variant="outline"
                  size="sm"
                  className="w-full border-red-700 text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Remove Panel
                </Button>
              )}
            </div>
          ))}

          <Button
            onClick={addPanel}
            variant="outline"
            className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            + Add a Panel
          </Button>
        </div>

        {/* Photos Section */}
        <div className="space-y-2">
          <p className="text-slate-400 text-sm">📷 Add Photos (optional)</p>

          {newVehicle.photo_urls.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {newVehicle.photo_urls.map((url, photoIdx) => (
                <div key={photoIdx} className="relative group">
                  <img src={url} alt={`Photo ${photoIdx + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                  <button
                    onClick={() => removePhoto(photoIdx)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploading}
                onChange={e => { handlePhotoUpload(e.target.files); e.target.value = ''; }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full bg-green-600 border-green-600 text-white hover:bg-green-700"
                disabled={uploading}
                onClick={e => e.currentTarget.previousElementSibling.click()}
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Camera className="w-3.5 h-3.5 mr-1" />}
                Camera
              </Button>
            </label>
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading}
                onChange={e => { handlePhotoUpload(e.target.files); e.target.value = ''; }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full bg-rose-600 border-rose-600 text-white hover:bg-rose-700"
                disabled={uploading}
                onClick={e => e.currentTarget.previousElementSibling.click()}
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Gallery
              </Button>
            </label>
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving || newVehicle.panels.filter(p => p.panel).length === 0}
          className="w-full pink-gradient text-white font-semibold h-10"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
          ) : (
            <><Plus className="w-4 h-4 mr-2" />Add Vehicle</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}