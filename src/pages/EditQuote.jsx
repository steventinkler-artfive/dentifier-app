
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Assessment, Vehicle, Customer, UserSetting, User } from "@/entities/all";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

// Image Modal Component
function ImageModal({ isOpen, onClose, imageUrl }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white dark:bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-100 dark:text-slate-200 hover:text-slate-400 dark:hover:text-slate-400 z-10 p-2 rounded-full bg-slate-700 hover:bg-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Full size"
            className="object-contain w-full h-full max-h-[80vh]"
          />
        ) : (
          <div className="flex items-center justify-center h-full p-8 text-slate-500">
            No image available.
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditQuotePage() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('id');
  const vehicleIndex = searchParams.get('vehicle'); // For multi-vehicle editing
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currency, setCurrency] = useState('GBP');
  const [notes, setNotes] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isMultiVehicleEdit, setIsMultiVehicleEdit] = useState(false);

  // State for image modal
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const calculateTotalPrice = useCallback((currentItems) => {
    const total = currentItems.reduce((acc, item) => {
      const quantity = parseFloat(item.quantity || 0);
      const unitPrice = parseFloat(item.unit_price || 0);
      const itemTotal = quantity * unitPrice;
      return acc + itemTotal;
    }, 0);
    setTotalPrice(total);
  }, []);

  // Fetch assessment and related data
  const fetchAssessmentAndQuote = useCallback(async () => {
    if (!assessmentId || assessmentId === 'undefined' || assessmentId === 'null') {
      setError("Invalid assessment ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Fetch the assessment
      const fetchedAssessment = await Assessment.get(assessmentId);
      
      if (!fetchedAssessment) {
        throw new Error("Assessment not found");
      }

      setAssessment(fetchedAssessment);

      // Check if editing a specific vehicle in multi-vehicle assessment
      const isMultiEdit = fetchedAssessment.is_multi_vehicle && vehicleIndex !== null && vehicleIndex !== undefined;
      setIsMultiVehicleEdit(isMultiEdit);

      let vehicleData, damagePhotos, lineItems, vehicleNotes;

      if (isMultiEdit) {
        // Editing a specific vehicle in multi-vehicle assessment
        const vIndex = parseInt(vehicleIndex);
        vehicleData = fetchedAssessment.vehicles[vIndex];
        
        if (!vehicleData) {
          throw new Error("Vehicle not found in assessment");
        }

        // Fetch the vehicle details
        const fetchedVehicle = await Vehicle.get(vehicleData.vehicle_id);
        setVehicle(fetchedVehicle);
        
        lineItems = vehicleData.line_items || [];
        damagePhotos = vehicleData.damage_photos || [];
        vehicleNotes = vehicleData.notes || "";
        
      } else {
        // Editing single vehicle assessment
        if (fetchedAssessment.vehicle_id) {
          const fetchedVehicle = await Vehicle.get(fetchedAssessment.vehicle_id);
          setVehicle(fetchedVehicle);
        }
        
        lineItems = fetchedAssessment.line_items || [];
        damagePhotos = fetchedAssessment.damage_photos || [];
        vehicleNotes = fetchedAssessment.notes || "";
      }

      // Fetch customer if exists
      if (fetchedAssessment.customer_id) {
        const fetchedCustomer = await Customer.get(fetchedAssessment.customer_id);
        setCustomer(fetchedCustomer);
      }

      // Fetch user settings for currency
      const currentUser = await User.me();
      if (currentUser && currentUser.email) {
        const settings = await UserSetting.filter({ user_email: currentUser.email });
        const fetchedSettings = settings.length > 0 ? settings[0] : null;
        setUserSettings(fetchedSettings);
        
        // Set currency
        const assessmentCurrency = fetchedAssessment.currency || fetchedSettings?.currency || 'GBP';
        setCurrency(assessmentCurrency);
      } else {
        setCurrency(fetchedAssessment.currency || 'GBP');
      }

      // Set up line items
      setItems(lineItems);
      setNotes(vehicleNotes);

      // Calculate total
      calculateTotalPrice(lineItems);

    } catch (err) {
      console.error("Error fetching assessment:", err);
      setError("Failed to load assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [assessmentId, vehicleIndex, calculateTotalPrice]);

  useEffect(() => {
    fetchAssessmentAndQuote();
  }, [fetchAssessmentAndQuote]);

  useEffect(() => {
    calculateTotalPrice(items);
  }, [items, calculateTotalPrice]);

  const handleItemChange = useCallback((index, field, value) => {
    const newItems = [...items];
    
    if (field === 'description') {
      newItems[index] = { ...newItems[index], [field]: value };
    } else if (field === 'quantity' || field === 'unit_price') {
      const parsedValue = value === '' ? 0 : parseFloat(value) || 0;
      newItems[index] = { ...newItems[index], [field]: parsedValue };
      
      // Recalculate item total
      const quantity = newItems[index].quantity;
      const unitPrice = newItems[index].unit_price;
      newItems[index].total_price = quantity * unitPrice;
    }

    setItems(newItems);
  }, [items]);

  const handleAddItem = useCallback(() => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: "", quantity: 1, unit_price: 0, total_price: 0 },
    ]);
  }, [items]);

  const handleRemoveItem = useCallback((index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  }, [items]);

  const handleSave = async () => {
    if (!assessment) {
      setError("No assessment data to save");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isMultiVehicleEdit) {
        // Update specific vehicle in multi-vehicle assessment
        const vIndex = parseInt(vehicleIndex);
        const updatedVehicles = assessment.vehicles.map((v, idx) => {
          if (idx === vIndex) {
            return {
              ...v,
              line_items: items,
              quote_amount: totalPrice,
              notes: notes
            };
          }
          return v;
        });

        // Recalculate total assessment amount
        const newSubtotal = updatedVehicles.reduce((sum, v) => sum + (v.quote_amount || 0), 0);
        const discount = (newSubtotal * (assessment.discount_percentage || 0)) / 100;
        const newTotal = newSubtotal - discount;

        await Assessment.update(assessmentId, {
          vehicles: updatedVehicles,
          quote_amount: newTotal
        });

        // Navigate back to the specific vehicle view
        navigate(createPageUrl(`AssessmentDetail?id=${assessmentId}&vehicle=${vehicleIndex}`));
      } else {
        // Update single vehicle assessment
        await Assessment.update(assessmentId, {
          line_items: items,
          quote_amount: totalPrice,
          currency: currency,
          notes: notes
        });

        // Navigate back to assessment detail
        navigate(createPageUrl(`AssessmentDetail?id=${assessmentId}`));
      }
    } catch (err) {
      console.error('Error saving quote:', err);
      setError("Failed to save quote. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Image Modal Handlers
  const handleImageClick = useCallback((imageUrl) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  }, []);

  const handleCloseImageModal = useCallback(() => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  }, []);

  const getCurrencySymbol = (curr) => {
    const symbols = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[curr] || '£';
  };

  const formatPrice = (amount, curr) => {
    const symbol = getCurrencySymbol(curr);
    return `${symbol}${Math.round(amount)}`;
  };

  const getBackUrl = () => {
    if (isMultiVehicleEdit) {
      return createPageUrl(`AssessmentDetail?id=${assessmentId}&vehicle=${vehicleIndex}`);
    }
    return createPageUrl(`AssessmentDetail?id=${assessmentId}`);
  };

  const getDisplayIdentifier = (assessment) => {
    return assessment.invoice_number || assessment.quote_number || `#${assessment.id.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-4" />
            <p className="text-slate-400">Loading quote...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="text-center text-red-400 my-8">
          <p className="mb-4">{error || "Assessment not found"}</p>
          <Link to={createPageUrl("Quotes")}>
            <Button className="pink-gradient text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quotes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const damagePhotos = isMultiVehicleEdit 
    ? assessment.vehicles[parseInt(vehicleIndex)]?.damage_photos || []
    : assessment.damage_photos || [];

  const displayIdentifier = getDisplayIdentifier(assessment);

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 bg-slate-950 min-h-screen text-slate-100">
      {/* Back button */}
      <div className="mb-4 flex items-center justify-between">
        <Link to={getBackUrl()}>
          <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isMultiVehicleEdit ? 'Vehicle' : 'Assessment'}
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Edit Quote</h1>
        <p className="text-slate-300 text-sm">
          {displayIdentifier}
          {isMultiVehicleEdit ? (
            <> - Vehicle in {assessment.assessment_name || 'Multi-Vehicle Assessment'}</>
          ) : null}
          {vehicle && ` - ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        </p>
      </div>

      {/* Main Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Edit Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Vehicle Summary */}
          {vehicle && (
            <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-3">Vehicle Summary</h2>
              <div className="grid grid-cols-1 gap-3 text-slate-200">
                <div>
                  <p><span className="font-medium">Make:</span> {vehicle.make}</p>
                  <p><span className="font-medium">Model:</span> {vehicle.model}</p>
                  <p><span className="font-medium">Year:</span> {vehicle.year}</p>
                  {vehicle.color && <p><span className="font-medium">Colour:</span> {vehicle.color}</p>}
                  {vehicle.license_plate && <p><span className="font-medium">License:</span> {vehicle.license_plate}</p>}
                  {vehicle.vin && <p><span className="font-medium">VIN:</span> {vehicle.vin}</p>}
                </div>
              </div>
              {damagePhotos.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-white mb-2">Vehicle Images</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {damagePhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Damage photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleImageClick(photo)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quote Items */}
          <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-3">Quote Items</h2>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id || index} className="bg-slate-800 p-3 rounded-md relative border border-slate-700">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="col-span-full">
                      <Label htmlFor={`description-${index}`} className="text-slate-200 text-sm">Description</Label>
                      <Input
                        id={`description-${index}`}
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        className="w-full bg-slate-700 text-white border-slate-600 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`quantity-${index}`} className="text-slate-200 text-sm">Qty</Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        className="w-full bg-slate-700 text-white border-slate-600 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`unitPrice-${index}`} className="text-slate-200 text-sm">Unit Price ({currency})</Label>
                      <Input
                        id={`unitPrice-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price === 0 ? '' : item.unit_price}
                        onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                        className="w-full bg-slate-700 text-white border-slate-600 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-base font-semibold text-slate-100">Total: {formatPrice(item.total_price, currency)}</p>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      onClick={() => handleRemoveItem(index)}
                      className="absolute top-1 right-1 text-red-400 hover:text-red-500 p-0.5 h-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button onClick={handleAddItem} className="mt-3 bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 px-3 h-auto">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Item
            </Button>
            <div className="mt-4 flex justify-between items-center bg-slate-800 p-3 rounded-md">
              <h3 className="text-lg font-bold text-white">{isMultiVehicleEdit ? 'Vehicle Total:' : 'Grand Total:'}</h3>
              <p className="text-xl font-bold text-blue-400">{formatPrice(totalPrice, currency)}</p>
            </div>
          </div>

          {/* Quote Notes */}
          <div className="bg-slate-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-3">Notes</h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes for the quote..."
              className="w-full bg-slate-700 text-white border-slate-600 min-h-[100px] text-sm"
            />
          </div>

          {/* Save and Cancel Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-700">
            <Link to={getBackUrl()} className="w-full">
              <Button variant="outline" className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white">
                Cancel
              </Button>
            </Link>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Image Modal */}
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={handleCloseImageModal}
        imageUrl={selectedImage}
      />
    </div>
  );
}
