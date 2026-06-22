import React, { useState, useEffect } from "react";
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
import { Save, X, ImageOff } from "lucide-react";

export default function VehicleEditModal({ vehicle, open, onSave, onCancel }) {
  const [form, setForm] = useState({
    registration: "",
    make: "",
    model: "",
    colour: "",
  });

  useEffect(() => {
    if (vehicle) {
      setForm({
        registration: vehicle.registration || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        colour: vehicle.colour || "",
      });
    }
  }, [vehicle, open]);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      ...vehicle,
      registration: form.registration.toUpperCase().trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      colour: form.colour.trim(),
    });
  };

  const photos = vehicle?.damage_photos || [];

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
            Photos ({photos.length})
          </Label>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={url}
                    alt={`Vehicle photo ${idx + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border border-slate-700 hover:opacity-80 transition-opacity"
                  />
                </a>
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