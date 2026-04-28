import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, X } from "lucide-react";

const CAR_PANELS = [
  "Bonnet/Hood", "Front Wing/Fender (Left)", "Front Wing/Fender (Right)",
  "Front Door (Left)", "Front Door (Right)", "Rear Door (Left)", "Rear Door (Right)",
  "Rear Quarter Panel (Left)", "Rear Quarter Panel (Right)", "Boot Lid/Trunk",
  "Roof", "A-Pillar", "B-Pillar", "C-Pillar", "Tailgate", "Other"
];

const VEHICLE_MAKES = [
  "Abarth", "AC", "Acura", "AK", "Alfa Romeo", "Allard", "Alpina", "Alpine", 
  "Alvis", "Ariel", "Aston Martin", "Audi", "Austin", "BAC", "Banham", 
  "Beauford", "Bentley", "BMW", "Bowler", "Bramwith", "Bugatti", "Buick", 
  "BYD", "Cadillac", "Caterham", "CFMOTO", "Changan", "Chery", "Chesil", 
  "Chevrolet", "Chrysler", "Citroen", "Corbin", "Corvette", "Cupra", "Dacia", 
  "Daewoo", "Daihatsu", "Daimler", "Datsun", "David Brown", "Dax", "Dodge", 
  "DS Automobiles", "E-COBRA", "Ferrari", "Fiat", "Fisker", "Ford", 
  "Gardner Douglas", "GBS", "Genesis", "GMC", "Great Wall", "GWM", "Hillman", 
  "Honda", "Humber", "Hummer", "Hyundai", "INEOS", "Infiniti", "ISO", "Isuzu", 
  "Iveco", "JAECOO", "Jaguar", "JBA", "Jeep", "Jensen", "KGM", "Kia", 
  "Koenigsegg", "KTM", "Lada", "Lagonda", "Lamborghini", "Lancia", 
  "Land Rover", "LDV", "Leapmotor", "LEVC", "Lexus", "Leyland", "Lincoln", 
  "Lister", "Locust", "London Taxis International", "Lotus", "Mahindra", 
  "Maserati", "MAXUS", "Maybach", "Mazda", "McLaren", "Mercedes-Benz", "MEV", 
  "MG", "Micro", "Mini", "Mitsubishi", "Mitsuoka", "MK", "MOKE", "Morgan", 
  "Morris", "Nardini", "Nissan", "Noble", "Omoda", "Opel", "Pagani", 
  "Panther", "Perodua", "Peugeot", "PGO", "Pilgrim", "Plymouth", "Polestar", 
  "Pontiac", "Porsche", "Porsche Singer", "Proton", "Quantum", "Radical", 
  "Ram", "RBW", "Reliant", "Renault", "Reva", "Rivian", "Robin Hood", 
  "Rolls-Royce", "Rover", "RUF", "Saab", "Seat", "Shelby", "Skoda", 
  "Skywell", "Smart", "SsangYong", "Standard", "Subaru", "Sunbeam", "Suzuki", 
  "Tesla", "Tiger", "Tornado", "Toyota", "Triumph", "TVR", "Ultima", 
  "Vauxhall", "Volkswagen", "Volvo", "VRS", "Westfield", "XPENG", "Zenos"
].sort();

const VEHICLE_COLORS = [
  "Beige", "Black", "Blue", "Brown", "Bronze", "Burgundy", "Charcoal", "Cream",
  "Gold", "Grey", "Green", "Maroon", "Navy", "Orange", "Pink", "Purple", 
  "Red", "Silver", "Tan", "Turquoise", "White", "Yellow"
].sort();

const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear + 1; year >= 1950; year--) {
    years.push(year);
  }
  return years;
};

const VEHICLE_YEARS = generateYears();

const createEmptyPanel = () => ({ panel: '', notes: '' });

export default function AddVehicleForm({ customerId, onSave, onCancel, defaultPanelPrice = 60 }) {
  const [newVehicle, setNewVehicle] = useState({
    make: '',
    year: new Date().getFullYear(),
    colour: '',
    registration: '',
    notes: '',
    panels: [createEmptyPanel()]
  });
  const [isSaving, setIsSaving] = useState(false);
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

  const handleSave = async () => {
    setError('');
    const validPanels = newVehicle.panels.filter(p => p.panel);
    if (validPanels.length === 0) {
      setError('Add at least one panel to the new vehicle.');
      return;
    }

    if (!newVehicle.make || !newVehicle.year || !newVehicle.colour) {
      setError('Make, year, and colour are required.');
      return;
    }

    setIsSaving(true);
    try {
      const createdVehicle = await base44.entities.Vehicle.create({
        customer_id: customerId,
        make: newVehicle.make,
        year: newVehicle.year,
        color: newVehicle.colour,
        license_plate: newVehicle.registration,
      });

      const lineItems = newVehicle.panels.map(p => ({
        description: `PDR Labour - ${p.panel}${p.notes ? `: ${p.notes}` : ""}`,
        quantity: 1,
        unit_price: defaultPanelPrice,
        total_price: defaultPanelPrice,
      }));

      const newVehicleData = {
        vehicle_id: createdVehicle.id,
        registration: newVehicle.registration,
        colour: newVehicle.colour,
        notes: newVehicle.notes,
        damage_photos: [],
        line_items: lineItems,
        quote_amount: lineItems.reduce((sum, item) => sum + item.total_price, 0),
        include_notes_in_quote: false
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
            <Label className="text-white text-sm">Make *</Label>
            <select
              value={newVehicle.make}
              onChange={e => updateNewVehicle('make', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: newVehicle.make ? 'white' : '#94a3b8',
                fontSize: '14px'
              }}
            >
              <option value="" disabled>Select make</option>
              {VEHICLE_MAKES.map(make => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white text-sm">Year *</Label>
            <Select
              value={newVehicle.year.toString()}
              onValueChange={v => updateNewVehicle('year', parseInt(v))}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                {VEHICLE_YEARS.map(year => (
                  <SelectItem key={year} value={year.toString()} className="text-white hover:!bg-slate-700">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white text-sm">Colour *</Label>
            <Select
              value={newVehicle.colour}
              onValueChange={v => updateNewVehicle('colour', v)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                {VEHICLE_COLORS.map(color => (
                  <SelectItem key={color} value={color} className="text-white hover:!bg-slate-700">
                    {color}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white text-sm">Reg</Label>
            <Input
              value={newVehicle.registration}
              onChange={e => updateNewVehicle('registration', e.target.value.toUpperCase())}
              placeholder="e.g. KP24 XXX"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white text-sm">Notes</Label>
            <Input
              value={newVehicle.notes}
              onChange={e => updateNewVehicle('notes', e.target.value)}
              placeholder="e.g. nearside rear door, light crease"
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

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving || newVehicle.panels.filter(p => p.panel).length === 0 || !newVehicle.make || !newVehicle.colour}
          className="w-full pink-gradient text-white font-semibold h-10"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Plus className="w-4 h-4 mr-2" />Add Vehicle</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}