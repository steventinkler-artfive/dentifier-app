import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, X, Plus, Loader2 } from "lucide-react";
import { compressMultipleImages } from "../utils/imageCompression";

const CAR_PANELS = [
  "Bonnet/Hood", "Front Wing/Fender (Left)", "Front Wing/Fender (Right)",
  "Front Door (Left)", "Front Door (Right)", "Rear Door (Left)", "Rear Door (Right)",
  "Rear Quarter Panel (Left)", "Rear Quarter Panel (Right)", "Boot Lid/Trunk",
  "Roof", "A-Pillar", "B-Pillar", "C-Pillar", "Tailgate", "Other"
];

const createEmptyPanel = () => ({ panel: '', notes: '' });
const createEmptyCard = () => ({ registration: '', colour: '', notes: '', panels: [createEmptyPanel()], photo_urls: [] });

export default function VehicleFormMultiPanel({ customer, onComplete, defaultPanelPrice = 60 }) {
  const [vehicleCards, setVehicleCards] = useState([createEmptyCard()]);
  const [jobPanelPrice, setJobPanelPrice] = useState(defaultPanelPrice);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [error, setError] = useState('');

  const updateCard = (cardIdx, field, value) => {
    setVehicleCards(prev => {
      const updated = [...prev];
      updated[cardIdx] = { ...updated[cardIdx], [field]: value };
      return updated;
    });
  };

  const addCard = () => {
    setVehicleCards(prev => [...prev, createEmptyCard()]);
  };

  const removeCard = (cardIdx) => {
    setVehicleCards(prev => prev.filter((_, i) => i !== cardIdx));
  };

  const addPanel = (cardIdx) => {
    setVehicleCards(prev => {
      const updated = [...prev];
      updated[cardIdx] = { ...updated[cardIdx], panels: [...updated[cardIdx].panels, createEmptyPanel()] };
      return updated;
    });
  };

  const removePanel = (cardIdx, panelIdx) => {
    setVehicleCards(prev => {
      const updated = [...prev];
      updated[cardIdx] = { ...updated[cardIdx], panels: updated[cardIdx].panels.filter((_, i) => i !== panelIdx) };
      return updated;
    });
  };

  const updatePanel = (cardIdx, panelIdx, field, value) => {
    setVehicleCards(prev => {
      const updated = [...prev];
      const panels = [...updated[cardIdx].panels];
      panels[panelIdx] = { ...panels[panelIdx], [field]: value };
      updated[cardIdx] = { ...updated[cardIdx], panels };
      return updated;
    });
  };

  const handlePhotoUpload = async (cardIdx, files) => {
    if (!files || files.length === 0) return;
    setUploadingIdx(cardIdx);
    try {
      const compressed = await compressMultipleImages(files);
      const urls = await Promise.all(compressed.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
      setVehicleCards(prev => {
        const updated = [...prev];
        updated[cardIdx] = { ...updated[cardIdx], photo_urls: [...updated[cardIdx].photo_urls, ...urls] };
        return updated;
      });
    } catch (e) {
      console.error('Upload failed:', e);
    } finally {
      setUploadingIdx(null);
    }
  };

  const removePhoto = (cardIdx, photoIdx) => {
    setVehicleCards(prev => {
      const updated = [...prev];
      updated[cardIdx] = { ...updated[cardIdx], photo_urls: updated[cardIdx].photo_urls.filter((_, i) => i !== photoIdx) };
      return updated;
    });
  };

  const handleContinue = () => {
    setError('');
    for (let card of vehicleCards) {
      const validPanels = (card.panels || []).filter(p => p.panel);
      if (validPanels.length === 0) {
        setError('Add at least one panel to continue.');
        return;
      }
    }
    onComplete(
      vehicleCards.map(card => ({
        ...card,
        panels: card.panels.filter(p => p.panel)
      })),
      jobPanelPrice
    );
  };

  return (
    <div className="space-y-4">
      {/* Job-level price override */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 space-y-1.5">
          <Label className="text-white text-sm font-medium">Panel Price for this job</Label>
          <div className="flex items-center gap-2">
            <span className="text-white text-sm">£</span>
            <Input
              type="number"
              step="5"
              value={jobPanelPrice}
              onChange={e => setJobPanelPrice(parseFloat(e.target.value) || 0)}
              className="bg-slate-700 border-slate-600 text-white w-32"
            />
          </div>
          <p className="text-slate-400 text-xs">Applies to all panels in this job. You can adjust individual panels on the quote if needed.</p>
        </CardContent>
      </Card>

      {vehicleCards.map((card, cardIdx) => (
        <Card key={cardIdx} className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Vehicle {cardIdx + 1}</h3>
              {cardIdx > 0 && (
                <Button
                  onClick={() => removeCard(cardIdx)}
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-7 px-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove Vehicle
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-white text-sm">Reg</Label>
                <Input
                  value={card.registration}
                  onChange={e => updateCard(cardIdx, 'registration', e.target.value.toUpperCase())}
                  placeholder="e.g. KP24 XXX"
                  className="bg-[#f4c500] border-[#f4c500] text-slate-900 placeholder:text-slate-600 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white text-sm">Colour</Label>
                <Input
                  value={card.colour}
                  onChange={e => updateCard(cardIdx, 'colour', e.target.value)}
                  placeholder="e.g. Silver, White, Black"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-white text-sm">Notes</Label>
                <Input
                  value={card.notes}
                  onChange={e => updateCard(cardIdx, 'notes', e.target.value)}
                  placeholder="e.g. Silver Astra — nearside rear door, light crease"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
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

              {card.panels.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-2">No panels added yet</p>
              )}

              {card.panels.map((panelItem, panelIdx) => (
                <div key={panelIdx} className="bg-slate-700 rounded-lg p-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-white text-xs">Panel</Label>
                    <Select
                      value={panelItem.panel}
                      onValueChange={v => updatePanel(cardIdx, panelIdx, 'panel', v)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
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
                      onChange={e => updatePanel(cardIdx, panelIdx, 'notes', e.target.value)}
                      placeholder="Brief description of damage..."
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </div>

                  <Button
                    onClick={() => removePanel(cardIdx, panelIdx)}
                    variant="outline"
                    size="sm"
                    className="w-full border-red-700 text-red-400 hover:bg-red-900/20"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Remove Panel
                  </Button>
                </div>
              ))}

              <Button
                onClick={() => addPanel(cardIdx)}
                variant="outline"
                className="w-full bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                + Add a Panel
              </Button>
            </div>

            {/* Optional Photos */}
            <div className="space-y-2">
              <p className="text-slate-400 text-sm">📷 Add Photos (optional)</p>

              {card.photo_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {card.photo_urls.map((url, photoIdx) => (
                    <div key={photoIdx} className="relative group">
                      <img src={url} alt={`Photo ${photoIdx + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                      <button
                        onClick={() => removePhoto(cardIdx, photoIdx)}
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
                    disabled={uploadingIdx === cardIdx}
                    onChange={e => { handlePhotoUpload(cardIdx, e.target.files); e.target.value = ''; }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    disabled={uploadingIdx === cardIdx}
                    onClick={e => e.currentTarget.previousElementSibling.click()}
                  >
                    {uploadingIdx === cardIdx ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Camera className="w-3.5 h-3.5 mr-1" />}
                    Camera
                  </Button>
                </label>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploadingIdx === cardIdx}
                    onChange={e => { handlePhotoUpload(cardIdx, e.target.files); e.target.value = ''; }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    disabled={uploadingIdx === cardIdx}
                    onClick={e => e.currentTarget.previousElementSibling.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    Gallery
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={addCard}
        variant="outline"
        className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-semibold h-12"
      >
        <Plus className="w-5 h-5 mr-2" />
        Add Another Vehicle
      </Button>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <Button
        onClick={handleContinue}
        className="w-full pink-gradient text-white font-semibold h-12"
      >
        Continue to Quote
      </Button>
    </div>
  );
}