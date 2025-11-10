import React, { useState, useEffect, useCallback } from "react";
import { Assessment, Customer, Vehicle } from "@/entities/all";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  PoundSterling,
  Loader2,
  AlertTriangle
} from "lucide-react";

const CURRENCIES = {
  GBP: { symbol: '£', name: 'British Pound' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' }
};

export default function EditQuote() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('id');
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadAssessmentData = useCallback(async () => {
    if (!assessmentId) {
      setError("No assessment ID provided");
      setLoading(false);
      return;
    }

    try {
      const foundAssessment = await Assessment.get(assessmentId);
      
      if (!foundAssessment) {
        setError("Assessment not found");
        setLoading(false);
        return;
      }
      setAssessment(foundAssessment);
      
      const [foundCustomer, foundVehicle] = await Promise.all([
        foundAssessment.customer_id ? Customer.get(foundAssessment.customer_id) : Promise.resolve(null),
        foundAssessment.vehicle_id ? Vehicle.get(foundAssessment.vehicle_id) : Promise.resolve(null),
      ]);
      
      setCustomer(foundCustomer);
      setVehicle(foundVehicle);

      if (foundAssessment.line_items && foundAssessment.line_items.length > 0) {
        setLineItems(foundAssessment.line_items);
      } else {
        setLineItems([{
          description: "PDR Service",
          quantity: 1,
          unit_price: foundAssessment.quote_amount || 0,
          total_price: foundAssessment.quote_amount || 0
        }]);
      }

      setNotes(foundAssessment.notes || "");
      setCurrency(foundAssessment.currency || "GBP");

    } catch (err) {
      console.error('Error loading assessment data:', err);
      setError("Failed to load assessment data");
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    loadAssessmentData();
  }, [loadAssessmentData]);

  const getCurrencySymbol = (curr) => {
    return CURRENCIES[curr]?.symbol || '£';
  };

  const formatPrice = (amount, curr) => {
    const symbol = getCurrencySymbol(curr);
    return `${symbol}${Math.round(amount)}`;
  };

  const calculateTotal = useCallback(() => {
    return lineItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }, [lineItems]);

  const addLineItem = () => {
    setLineItems([...lineItems, {
      description: "",
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }]);
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      item.total_price = quantity * unitPrice;
    }
    
    updated[index] = item;
    setLineItems(updated);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!assessment) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const updateData = {
        line_items: lineItems,
        quote_amount: calculateTotal(),
        currency: currency,
        notes: notes
      };
      
      await Assessment.update(assessment.id, updateData);
      navigate(createPageUrl(`AssessmentDetail?id=${assessmentId}`));
      
    } catch (err) {
      console.error('Error updating assessment:', err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
        <p className="mt-2 text-slate-400">Loading quote...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="mt-2 text-red-400">{error}</p>
        <Link to={createPageUrl("Quotes")}>
          <Button variant="outline" className="mt-4">Back to Quotes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl(`AssessmentDetail?id=${assessmentId}`)}>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Edit Quote</h1>
          <p className="text-slate-400 text-sm">
            Assessment #{assessment?.id?.slice(-6)}
          </p>
        </div>
      </div>

      {/* Vehicle Summary */}
      {vehicle && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <h4 className="text-white font-medium mb-2">Vehicle</h4>
            <p className="text-slate-300">
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.color && ` • ${vehicle.color}`}
            </p>
            {customer && (
              <p className="text-slate-400 text-sm mt-1">for {customer.name}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Quote Items</CardTitle>
            <Button onClick={addLineItem} size="sm" className="bg-slate-700 hover:bg-slate-600 text-white">
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={index} className="bg-slate-800 rounded-lg p-4 space-y-3">
              <div>
                <Label className="text-white text-sm">Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  placeholder="Service description"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-white text-sm">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white text-sm">Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(index, 'unit_price', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white text-sm">Total</Label>
                  <div className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white">
                    {formatPrice(item.total_price, currency)}
                  </div>
                </div>
              </div>
              {lineItems.length > 1 && (
                <Button
                  onClick={() => removeLineItem(index)}
                  variant="destructive"
                  size="sm"
                  className="w-fit"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          ))}

          {/* Total */}
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold text-lg">Total Quote</span>
              <span className="text-green-400 font-bold text-2xl">{formatPrice(calculateTotal(), currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Currency & Notes */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 space-y-4">
          <div>
            <Label className="text-white mb-2 block">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {Object.entries(CURRENCIES).map(([code, info]) => (
                  <SelectItem key={code} value={code} className="text-white hover:bg-slate-700">
                    {info.symbol} {info.name} ({code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white mb-2 block">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full pink-gradient text-white font-semibold"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Saving Changes...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Quote Changes
          </>
        )}
      </Button>
    </div>
  );
}