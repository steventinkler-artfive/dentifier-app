import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Save, Search, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import toast from "react-hot-toast";

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
].sort((a, b) => {
  const aNorm = a.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const bNorm = b.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return aNorm.localeCompare(bNorm);
});

VEHICLE_MAKES.push("OTHER");

const VEHICLE_COLORS = [
  "Beige", "Black", "Blue", "Brown", "Bronze", "Burgundy", "Charcoal", "Cream",
  "Gold", "Grey", "Green", "Maroon", "Navy", "Orange", "Pink", "Purple", 
  "Red", "Silver", "Tan", "Turquoise", "White", "Yellow"
].sort();

// Generate years from 1950 to current year + 1
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear + 1; year >= 1950; year--) {
    years.push(year);
  }
  return years;
};

const VEHICLE_YEARS = generateYears();

export default function VehicleForm({ customer, vehicle, onVehicleSubmit }) {
  const [formData, setFormData] = useState({
    make: vehicle?.make || "",
    model: vehicle?.model || "",
    year: vehicle?.year || new Date().getFullYear(),
    color: vehicle?.color || "",
    vin: vehicle?.vin || "",
    license_plate: vehicle?.license_plate || ""
  });
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [vehicleMakes, setVehicleMakes] = useState(VEHICLE_MAKES);
  const [vehicleColors, setVehicleColors] = useState(VEHICLE_COLORS);

  const handleDvlaLookup = async () => {
    if (!formData.license_plate || formData.license_plate.length < 2) {
      toast.error('Please enter a licence plate first');
      return;
    }

    setLookingUp(true);
    
    try {
      const response = await base44.functions.invoke('dvlaLookup', {
        registrationNumber: formData.license_plate
      });

      if (response.data.success) {
        const dvlaData = response.data.data;
        
        // Convert to title case
        const toTitleCase = (str) => {
          return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        };

        const make = toTitleCase(dvlaData.make);
        const color = toTitleCase(dvlaData.colour);
        const model = dvlaData.model ? toTitleCase(dvlaData.model) : '';

        // Add to dropdowns if not present, then update form
        setVehicleMakes(prev => prev.includes(make) ? prev : [...prev, make].sort());
        setVehicleColors(prev => prev.includes(color) ? prev : [...prev, color].sort());
        setFormData(prev => ({
          ...prev,
          make: make,
          model: model || prev.model,
          year: dvlaData.yearOfManufacture,
          color: color
        }));

        toast.success('✓ Vehicle details found');
      } else {
        // Handle errors
        const errorMessage = response.data.message || 'Lookup failed';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('DVLA lookup error:', error);
      toast.error('⚠️ Lookup temporarily unavailable. Please enter details manually.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const vehicleData = {
        ...formData,
        customer_id: customer?.id || 'draft'
      };
      
      let savedVehicle;
      if (vehicle) {
        const updatedVehicle = await base44.entities.Vehicle.update(vehicle.id, vehicleData);
        savedVehicle = { ...vehicle, ...updatedVehicle };
      } else {
        savedVehicle = await base44.entities.Vehicle.create(vehicleData);
      }
      
      onVehicleSubmit(savedVehicle);
    } catch (error) {
      console.error('Error saving vehicle:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canSubmit = formData.make && formData.year && formData.color;

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          Vehicle Information
        </CardTitle>
        <p className="text-slate-400 text-sm">
          {customer ? `for ${customer.name}` : 'for draft assessment'}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Registration Plate</Label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={formData.license_plate}
                onChange={(e) => handleInputChange('license_plate', e.target.value.toUpperCase())}
                placeholder="AB12CDE"
                className="bg-[#f4c500] border-[#f4c500] text-slate-900 placeholder:text-slate-600 font-semibold"
              />
              <Button
                type="button"
                onClick={handleDvlaLookup}
                disabled={lookingUp || !formData.license_plate || formData.license_plate.length < 2}
                variant="outline"
                className="bg-blue-900 border-blue-700 text-blue-300 hover:bg-blue-800 hover:text-white hover:border-blue-600"
              >
                {lookingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Look Up
                  </>
                )}
              </Button>
            </div>
            <p className="text-slate-400 text-xs">Enter a UK reg and click "Look Up" to auto-fill details</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Make *</Label>
              <Select 
                value={formData.make} 
                onValueChange={(value) => handleInputChange('make', value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select make" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                  {(formData.make && !vehicleMakes.includes(formData.make)
                    ? [...vehicleMakes, formData.make].sort()
                    : vehicleMakes
                  ).map(make => (
                    <SelectItem key={make} value={make} className="text-white hover:!bg-slate-700 focus:bg-slate-700">
                      {make}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Year *</Label>
              <Select 
                value={formData.year.toString()} 
                onValueChange={(value) => handleInputChange('year', parseInt(value))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                  {VEHICLE_YEARS.map(year => (
                    <SelectItem key={year} value={year.toString()} className="text-white hover:!bg-slate-700 focus:bg-slate-700">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Colour *</Label>
            <Select 
              value={formData.color} 
              onValueChange={(value) => handleInputChange('color', value)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select colour" />
              </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                  {(formData.color && !vehicleColors.includes(formData.color)
                    ? [...vehicleColors, formData.color].sort()
                    : vehicleColors
                  ).map(color => (
                    <SelectItem key={color} value={color} className="text-white hover:!bg-slate-700 focus:bg-slate-700">
                      {color}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Model (recommended)</Label>
            <Input
              value={formData.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
              placeholder="e.g., 3 Series, Golf, Corsa..."
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
            <p className="text-slate-400 text-xs flex items-start gap-1">
              <span className="text-blue-400 mt-0.5">ℹ️</span>
              <span>Model helps create more professional quotes but you can add it later if needed (DVLA doesn't specify model on look up)</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white">VIN (Optional)</Label>
            <Input
              value={formData.vin}
              onChange={(e) => handleInputChange('vin', e.target.value)}
              placeholder="17-digit VIN number"
              maxLength={17}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !canSubmit}
            className="w-full pink-gradient text-white font-semibold"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Vehicle & Continue
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}