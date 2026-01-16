import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

export default function PricingQuotingForm({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Quote & Invoice Numbering</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Quote Prefix</Label>
              <Input
                value={formData.quote_prefix || 'Q-'}
                onChange={e => onChange('quote_prefix', e.target.value)}
                placeholder="Q-"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Next Quote Number</Label>
              <Input
                type="number"
                min="1"
                value={formData.next_quote_number || 1}
                onChange={e => onChange('next_quote_number', parseInt(e.target.value) || 1)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Invoice Prefix</Label>
              <Input
                value={formData.invoice_prefix || 'INV-'}
                onChange={e => onChange('invoice_prefix', e.target.value)}
                placeholder="INV-"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Next Invoice Number</Label>
              <Input
                type="number"
                min="1"
                value={formData.next_invoice_number || 1}
                onChange={e => onChange('next_invoice_number', parseInt(e.target.value) || 1)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Invoice Footer</Label>
            <Textarea
              value={formData.invoice_footer || ''}
              onChange={e => onChange('invoice_footer', e.target.value)}
              placeholder="Please pay within 7 days of receipt of invoice."
              rows={2}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Pricing & Tax</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Hourly Rate (£)</Label>
              <Input
                type="number"
                value={formData.hourly_rate || 70}
                onChange={e => onChange('hourly_rate', parseFloat(e.target.value))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Base Cost / Call-out (£)</Label>
              <Input
                type="number"
                value={formData.base_cost || 80}
                onChange={e => onChange('base_cost', parseFloat(e.target.value))}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-slate-400 text-xs">Can be removed on quote</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-white">Default Panel Price * (£)</Label>
            <Input
              type="number"
              value={formData.default_panel_price || 120}
              onChange={e => onChange('default_panel_price', parseFloat(e.target.value))}
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Currency</Label>
            <Select
              value={formData.currency || 'GBP'}
              onValueChange={value => onChange('currency', value)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="GBP" className="text-white">GBP (£)</SelectItem>
                <SelectItem value="USD" className="text-white">USD ($)</SelectItem>
                <SelectItem value="EUR" className="text-white">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="vat-registered"
              checked={formData.is_vat_registered || false}
              onCheckedChange={checked => onChange('is_vat_registered', checked)}
              className="data-[state=checked]:bg-green-600"
            />
            <Label htmlFor="vat-registered" className="text-white">I am VAT/Tax registered</Label>
          </div>
          
          {formData.is_vat_registered && (
            <div className="space-y-2">
              <Label className="text-white">Tax Rate (%)</Label>
              <Input
                type="number"
                value={formData.tax_rate || 20}
                onChange={e => onChange('tax_rate', parseFloat(e.target.value))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          )}
        </div>
      </div>

      <Card className="bg-blue-900/20 border-blue-800">
        <CardContent className="p-4">
          <p className="text-blue-200 text-sm">
            💡 Matrix prices are for steel panels (market rate). Aluminium calculated at 1.5x automatically.
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Quick Pricing Matrix (3 most common)</h3>
        <div className="space-y-3">
          {['26mm - 50mm', '51mm - 80mm', '81mm - 120mm'].map((size, idx) => (
            <div key={size} className="grid grid-cols-3 gap-3 items-center">
              <Label className="text-slate-300 text-sm">Standard Dent {size}</Label>
              <Input
                type="number"
                value={formData.pricing_matrix?.find(p => p.size_range === size && p.damage_type === 'Standard Dent')?.base_price || [120, 180, 240][idx]}
                onChange={e => {
                  const newMatrix = [...(formData.pricing_matrix || [])];
                  const existingIdx = newMatrix.findIndex(p => p.size_range === size && p.damage_type === 'Standard Dent');
                  if (existingIdx > -1) {
                    newMatrix[existingIdx].base_price = parseFloat(e.target.value);
                  } else {
                    newMatrix.push({ damage_type: 'Standard Dent', size_range: size, base_price: parseFloat(e.target.value) });
                  }
                  onChange('pricing_matrix', newMatrix);
                }}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="£"
              />
              <span className="text-slate-400 text-sm">£{formData.pricing_matrix?.find(p => p.size_range === size && p.damage_type === 'Standard Dent')?.base_price || [120, 180, 240][idx]}</span>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-3">Configure full pricing matrix in Settings after onboarding</p>
      </div>
    </div>
  );
}