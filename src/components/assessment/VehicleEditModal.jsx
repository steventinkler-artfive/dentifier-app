import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressMultipleImages } from "../utils/imageCompression";
import { Save, X, ImageOff, Camera, Upload, Loader2 } from "lucide-react";

export default function VehicleEditModal({ vehicle, open, onSave, onCancel }) {
  const [form, setForm] = useState({
    registration: "",
    make: "",
    model: "",
    colour: "",
  });
  const [localPhotos, setLocalPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setForm({
        registration: vehicle.registration || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        colour: vehicle.colour || "",
      });
      setLocalPhotos(vehicle.damage_photos || []);
    }
  }, [vehicle, open]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    if (!navigator.onLine) {
      alert("Photo upload requires a connection.");
      if (event.target) event.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressMultipleImages(files);
      const urls = await Promise.all(
        compressed.map(async (f) => {
          const r = await base44.integrations.Core.UploadFile({ file: f });
          return r.file_url;
        })
      );
      setLocalPhotos((prev) => [...prev, ...urls]);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload photos. Please try again.");
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleRemovePhoto = (idx) => {
    setLocalPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({
      ...vehicle,
      registration: form.registration.toUpperCase().trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      colour: form.colour.trim(),
      damage_photos: localPhotos,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Vehicle</DialogTitle>
        </DialogHeader>

        {/* Editable fields */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Registration</Label>
            <Input
              value={form.registration}
              onChange={(e) => update("registration", e.target.value.toUpperCase())}
              placeholder="e.g. KP24 XXX"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Make</Label>
              <Input
                value={form.make}
                onChange={(e) => update("make", e.target.value)}
                placeholder="e.g. Vauxhall"
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Model</Label>
              <Input
                value={form.model}
                onChange={(e) => update("model", e.target.value)}
                placeholder="e.g. Astra"
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Colour</Label>
            <Input
              value={form.colour}
              onChange={(e) => update("colour", e.target.value)}
              placeholder="e.g. Silver"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Photos section */}
        <div className="space-y-2 pt-2">
          <Label className="text-slate-300 text-sm">
            Photos ({localPhotos.length})
          </Label>
          {localPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {localPhotos.map((url, idx) => (
                <div key={idx} className="relative w-full aspect-square">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src={url}
                      alt={`Vehicle photo ${idx + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-slate-700 hover:opacity-80 transition-opacity"
                    />
                  </a>
                  <button
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 bg-slate-800 rounded-lg border border-dashed border-slate-600">
              <ImageOff className="w-6 h-6 text-slate-500 mb-2" />
              <p className="text-slate-500 text-xs text-center">
                No photos for this vehicle
              </p>
            </div>
          )}

          {/* Add Photo actions */}
          <div className="flex gap-2 pt-1">
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full bg-green-600 border-green-600 text-white hover:bg-green-700 text-xs"
                disabled={uploading}
                onClick={(e) => e.currentTarget.previousElementSibling.click()}
              >
                {uploading ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3 mr-1" />
                )}
                Camera
              </Button>
            </label>
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full bg-rose-600 border-rose-600 text-white hover:bg-rose-700 text-xs"
                disabled={uploading}
                onClick={(e) => e.currentTarget.previousElementSibling.click()}
              >
                <Upload className="w-3 h-3 mr-1" />
                Gallery
              </Button>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={uploading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}