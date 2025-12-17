import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Camera, Upload, X, Loader2, Image as ImageIcon, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import { compressMultipleImages } from "../utils/imageCompression";
import { useAlert } from "@/components/ui/CustomAlert";

// Car panels
const CAR_PANELS = [
  "Bonnet/Hood", "Front Wing/Fender (Left)", "Front Wing/Fender (Right)",
  "Front Door (Left)", "Front Door (Right)", "Rear Door (Left)", "Rear Door (Right)",
  "Rear Quarter Panel (Left)", "Rear Quarter Panel (Right)", "Boot Lid/Trunk",
  "Roof", "A-Pillar", "B-Pillar", "C-Pillar", "Tailgate", "Other"
];

// Base damage types - will be augmented with custom types from user's pricing matrix
const BASE_DAMAGE_TYPES = ["Standard Dent", "Crease"];

// Default size ranges - will be replaced with user's pricing matrix sizes
const DEFAULT_SIZE_RANGES = [
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

// Materials
const MATERIALS = ["Steel", "Aluminum", "Unsure"];

// Repair methods
const REPAIR_METHODS = [
  "Good Tool Access",
  "Limited Tool Access",
  "Glue Pull Only",
  "Strip & Re-fit",
  "Unsure"
];

// Dent depth
const DENT_DEPTH = ["Shallow", "Medium", "Deep/Sharp", "Unsure"];

export default function PhotoCapture({ initialPhotos = [], initialDamageItems = [], initialChargePerPanel = false, onPhotosCapture }) {
  const [uploadedPhotos, setUploadedPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [chargePerPanel, setChargePerPanel] = useState(initialChargePerPanel);
  const [damageItems, setDamageItems] = useState(initialDamageItems.length > 0 ? initialDamageItems : []);
  const [damageTypes, setDamageTypes] = useState(BASE_DAMAGE_TYPES);
  const [sizeRanges, setSizeRanges] = useState(DEFAULT_SIZE_RANGES);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { showAlert } = useAlert();

  // Load damage types and size ranges from user's pricing matrix
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
          
          // Extract unique damage types from pricing matrix
          const matrixDamageTypes = [...new Set(pricingMatrix.map(entry => entry.damage_type))];
          // Combine with custom types, ensuring base types are included
          const allDamageTypes = [...new Set([...BASE_DAMAGE_TYPES, ...matrixDamageTypes, ...customTypes])];
          setDamageTypes(allDamageTypes);
          
          // Extract unique size ranges from pricing matrix and combine with custom sizes
          const matrixSizeRanges = [...new Set(pricingMatrix.map(entry => entry.size_range))];
          // Combine default, matrix, and custom size ranges
          const allSizeRanges = [...new Set([...DEFAULT_SIZE_RANGES, ...matrixSizeRanges, ...customSizes])];
          
          // Sort size ranges by extracting the first number
          const sortedSizeRanges = allSizeRanges.sort((a, b) => {
            const getFirstNumber = (str) => {
              const match = str.match(/(\d+)/);
              return match ? parseInt(match[1]) : 0;
            };
            return getFirstNumber(a) - getFirstNumber(b);
          });
          setSizeRanges(sortedSizeRanges);
        }
        setSettingsLoaded(true);
      } catch (error) {
        console.error("Error loading pricing options:", error);
        setSettingsLoaded(true);
      }
    };

    loadPricingOptions();
  }, []);

  const handleFileSelect = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      console.log("Starting upload process for", files.length, "files");
      
      // Compress images first
      const compressedFiles = await compressMultipleImages(files);
      console.log("Images compressed, uploading...");
      
      // Upload each compressed file
      const uploadPromises = compressedFiles.map(async (file) => {
        const result = await base44.integrations.Core.UploadFile({ file });
        return result.file_url;
      });
      
      const newPhotoUrls = await Promise.all(uploadPromises);
      console.log("Upload successful, URLs:", newPhotoUrls);
      
      setUploadedPhotos(prev => [...prev, ...newPhotoUrls]);
    } catch (error) {
      console.error("Upload failed:", error);
      showAlert("Failed to upload photos. Please try again.", "Upload Error");
    } finally {
      setUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove) => {
    setUploadedPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    // Also remove this photo from any damage items that reference it
    setDamageItems(prev => prev.map(item => ({
      ...item,
      associated_photos_urls: (item.associated_photos_urls || []).filter(url => url !== uploadedPhotos[indexToRemove])
    })));
  };

  const handleAddDamageItem = () => {
    // Use first available options from loaded settings
    const defaultDamageType = damageTypes[0] || "Standard Dent";
    const defaultSizeRange = sizeRanges[2] || sizeRanges[0] || "26mm - 50mm"; // Try to default to a mid-size
    
    const newItem = {
      panel: "",
      damage_type: defaultDamageType,
      size_range: defaultSizeRange,
      material: "Steel",
      repair_method: "Good Tool Access",
      depth: "Shallow",
      has_stretched_metal: false,
      affects_body_line: false,
      dent_count: 1,
      notes: "",
      associated_photos_urls: []
    };
    setDamageItems(prev => [...prev, newItem]);
  };

  const handleRemoveDamageItem = (indexToRemove) => {
    setDamageItems(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDamageItemChange = (itemIndex, field, value) => {
    setDamageItems(prev => {
      const updated = [...prev];
      updated[itemIndex] = { ...updated[itemIndex], [field]: value };
      return updated;
    });
  };

  const togglePhotoAssociation = (itemIndex, photoUrl) => {
    setDamageItems(prev => {
      const updated = [...prev];
      const currentPhotos = updated[itemIndex].associated_photos_urls || [];
      if (currentPhotos.includes(photoUrl)) {
        updated[itemIndex].associated_photos_urls = currentPhotos.filter(url => url !== photoUrl);
      } else {
        updated[itemIndex].associated_photos_urls = [...currentPhotos, photoUrl];
      }
      return updated;
    });
  };

  const handleContinue = async () => {
    // Only require photos for detailed pricing mode
    if (uploadedPhotos.length === 0 && !chargePerPanel) {
      await showAlert("Please upload at least one photo before continuing.", "Photos Required");
      return;
    }

    if (!chargePerPanel) {
      // Validate damage items for detailed pricing
      if (damageItems.length === 0) {
        await showAlert("Please add at least one damage item or enable 'Charge Per Panel' mode.", "Damage Items Required");
        return;
      }

      // Check that all damage items have required fields
      for (let i = 0; i < damageItems.length; i++) {
        const item = damageItems[i];
        if (!item.panel || !item.damage_type || !item.size_range) {
          await showAlert(`Damage item ${i + 1} is incomplete. Please fill in Panel, Damage Type, and Size Range.`, "Incomplete Entry");
          return;
        }
      }
    } else {
      // For charge per panel mode, validate that damage items have at least panel and notes
      if (damageItems.length === 0) {
        await showAlert("Please add at least one panel/damage entry.", "Panel Required");
        return;
      }

      for (let i = 0; i < damageItems.length; i++) {
        const item = damageItems[i];
        if (!item.panel) {
          await showAlert(`Entry ${i + 1} needs a panel specified.`, "Panel Required");
          return;
        }
      }
    }

    onPhotosCapture({
      photos: uploadedPhotos,
      damageItems: damageItems,
      chargePerPanel: chargePerPanel
    });
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
        {/* Photo Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-white">Damage Photos</Label>
            <span className="text-slate-400 text-sm">{uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Photo Grid */}
          {uploadedPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {uploadedPhotos.map((photoUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photoUrl}
                    alt={`Damage ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <button
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Buttons - Full Width Buttons */}
          <div className="space-y-2">
            <label className="block">
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
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold h-12"
                disabled={uploading}
                onClick={(e) => e.currentTarget.previousElementSibling.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Take Photo
                  </>
                )}
              </Button>
            </label>

            <label className="block">
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
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 h-12"
                disabled={uploading}
                onClick={(e) => e.currentTarget.previousElementSibling.click()}
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload from Gallery
              </Button>
            </label>
          </div>
        </div>

        {/* Charge Per Panel Toggle */}
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="charge-per-panel" className="text-white font-medium">Charge Per Panel</Label>
              <p className="text-slate-400 text-xs mt-1">
                Use simplified pricing instead of detailed analysis
              </p>
            </div>
            <Switch
              id="charge-per-panel"
              checked={chargePerPanel}
              onCheckedChange={setChargePerPanel}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600"
            />
          </div>
        </div>

        {/* Damage Items Section - Only show when photos are uploaded */}
        {!chargePerPanel && uploadedPhotos.length > 0 && (
          <div className="space-y-4">
            <Label className="text-white">Detailed Damage Items</Label>

            {damageItems.length === 0 && (
              <div className="text-center p-6 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700">
                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm mb-3">No damage items added yet</p>
                <Button
                  onClick={handleAddDamageItem}
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Add First Damage Item
                </Button>
              </div>
            )}

            {damageItems.map((item, itemIndex) => (
              <div key={itemIndex} className="bg-slate-800 rounded-lg p-4 space-y-4 border border-slate-700">
                {/* Photo Association */}
                {uploadedPhotos.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Associated Photos (Optional)</Label>
                    <div className="flex flex-wrap gap-2">
                      {uploadedPhotos.map((photoUrl, photoIndex) => (
                        <div
                          key={photoIndex}
                          onClick={() => togglePhotoAssociation(itemIndex, photoUrl)}
                          className={`relative w-16 h-16 rounded cursor-pointer border-2 transition-all ${
                            (item.associated_photos_urls || []).includes(photoUrl)
                              ? 'border-green-500 ring-2 ring-green-500/50'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <img src={photoUrl} alt={`Photo ${photoIndex + 1}`} className="w-full h-full object-cover rounded" />
                          {(item.associated_photos_urls || []).includes(photoUrl) && (
                            <div className="absolute inset-0 bg-green-500/20 rounded flex items-center justify-center">
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Damage Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white">Panel <span className="text-red-400">*</span></Label>
                    <Select
                      value={item.panel}
                      onValueChange={(value) => handleDamageItemChange(itemIndex, 'panel', value)}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Select panel" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {CAR_PANELS.map(panel => (
                          <SelectItem key={panel} value={panel} className="text-white hover:bg-slate-700">
                            {panel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Damage Type <span className="text-red-400">*</span></Label>
                    <Select
                      value={item.damage_type}
                      onValueChange={(value) => handleDamageItemChange(itemIndex, 'damage_type', value)}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {damageTypes.map(type => (
                          <SelectItem key={type} value={type} className="text-white hover:bg-slate-700">
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Size Range <span className="text-red-400">*</span></Label>
                    <Select
                      value={item.size_range}
                      onValueChange={(value) => handleDamageItemChange(itemIndex, 'size_range', value)}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {sizeRanges.map(range => (
                          <SelectItem key={range} value={range} className="text-white hover:bg-slate-700">
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Material</Label>
                    <Select
                      value={item.material}
                      onValueChange={(value) => handleDamageItemChange(itemIndex, 'material', value)}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {MATERIALS.map(material => (
                          <SelectItem key={material} value={material} className="text-white hover:bg-slate-700">
                            {material}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Repair Method</Label>
                    <Select
                      value={item.repair_method}
                      onValueChange={(value) => handleDamageItemChange(itemIndex, 'repair_method', value)}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {REPAIR_METHODS.map(method => (
                          <SelectItem key={method} value={method} className="text-white hover:bg-slate-700">
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Depth</Label>
                    <Select
                      value={item.depth}
                      onValueChange={(value) => handleDamageItemChange(itemIndex, 'depth', value)}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {DENT_DEPTH.map(depth => (
                          <SelectItem key={depth} value={depth} className="text-white hover:bg-slate-700">
                            {depth}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Warning for Glue Pull Only on complex damage */}
                {item.repair_method === "Glue Pull Only" && (item.depth === "Deep/Sharp" || item.affects_body_line || item.has_stretched_metal) && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-300 text-xs">
                      Warning: Glue pull only may not be suitable for deep dents, body lines, or stretched metal. Consider alternative repair methods.
                    </p>
                  </div>
                )}

                {/* Toggles */}
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`stretched-${itemIndex}`}
                      checked={item.has_stretched_metal}
                      onCheckedChange={(checked) => handleDamageItemChange(itemIndex, 'has_stretched_metal', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600"
                    />
                    <Label htmlFor={`stretched-${itemIndex}`} className="text-white text-sm">Stretched Metal</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`bodyline-${itemIndex}`}
                      checked={item.affects_body_line}
                      onCheckedChange={(checked) => handleDamageItemChange(itemIndex, 'affects_body_line', checked)}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600"
                    />
                    <Label htmlFor={`bodyline-${itemIndex}`} className="text-white text-sm">Affects Body Line</Label>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-white">Additional Notes</Label>
                  <Input
                    value={item.notes}
                    onChange={(e) => handleDamageItemChange(itemIndex, 'notes', e.target.value)}
                    placeholder="e.g., near fuel door, double skin panel, matte paint finish..."
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>

                {/* Remove Button */}
                <Button
                  onClick={() => handleRemoveDamageItem(itemIndex)}
                  variant="outline"
                  size="sm"
                  className="w-full border-red-700 text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove this Damage Item
                </Button>
              </div>
            ))}

            {damageItems.length > 0 && (
              <Button
                onClick={handleAddDamageItem}
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add more Damage
              </Button>
            )}
          </div>
        )}

        {/* Simplified damage items for charge per panel */}
        {chargePerPanel && (
          <div className="space-y-4">
            <Label className="text-white">Panel List (Simplified)</Label>

            {damageItems.length === 0 && (
              <div className="text-center p-6 bg-slate-800 rounded-lg border-2 border-dashed border-slate-700">
                <p className="text-slate-400 text-sm mb-3">No panels added yet</p>
                <Button
                  onClick={handleAddDamageItem}
                  variant="outline"
                  size="sm"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                >
                  Add First Panel
                </Button>
              </div>
            )}

            {damageItems.map((item, itemIndex) => (
              <div key={itemIndex} className="bg-slate-800 rounded-lg p-4 space-y-3 border border-slate-700">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label className="text-white">Panel <span className="text-red-400">*</span></Label>
                    <Select
                      value={item.panel}
                      onValueChange={(value) => handleDamageItemChange(itemIndex, 'panel', value)}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                        <SelectValue placeholder="Select panel" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {CAR_PANELS.map(panel => (
                          <SelectItem key={panel} value={panel} className="text-white hover:bg-slate-700">
                            {panel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Notes/Description</Label>
                    <Input
                      value={item.notes}
                      onChange={(e) => handleDamageItemChange(itemIndex, 'notes', e.target.value)}
                      placeholder="Brief description of damage..."
                      className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleRemoveDamageItem(itemIndex)}
                  variant="outline"
                  size="sm"
                  className="w-full border-red-700 text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove Panel
                </Button>
              </div>
            ))}

            {damageItems.length > 0 && (
              <Button
                onClick={handleAddDamageItem}
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add a Panel
              </Button>
            )}
          </div>
        )}

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={(uploadedPhotos.length === 0 && !chargePerPanel) || uploading}
          className="w-full pink-gradient text-white font-semibold"
        >
          Continue to {chargePerPanel ? 'Quote' : 'Analysis'}
        </Button>
      </CardContent>
    </Card>
  );
}