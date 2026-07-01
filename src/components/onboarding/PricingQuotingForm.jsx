import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";

export default function PricingQuotingForm({ formData, onChange }) {
  const [buffer, setBuffer] = useState({ field: null, value: '', original: null });
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
                type="tel"
                min="1"
                value={buffer.field === 'next_quote_number' ? buffer.value : (formData.next_quote_number || 1)}
                onFocus={() => setBuffer({ field: 'next_quote_number', value: String(formData.next_quote_number ?? ''), original: formData.next_quote_number ?? 1 })}
                onChange={(e) => setBuffer(prev => ({ ...prev, value: e.target.value }))}
                onBlur={() => {
                  const parsed = parseInt(buffer.value);
                  if (buffer.value === '' || isNaN(parsed)) {
                    onChange('next_quote_number', buffer.original);
                  } else {
                    onChange('next_quote_number', parsed);
                  }
                  setBuffer({ field: null, value: '', original: null });
                }}
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
                type="tel"
                value={buffer.field === 'hourly_rate' ? buffer.value : (formData.hourly_rate || 60)}
                onFocus={() => setBuffer({ field: 'hourly_rate', value: String(formData.hourly_rate ?? ''), original: formData.hourly_rate ?? 60 })}
                onChange={(e) => setBuffer(prev => ({ ...prev, value: e.target.value }))}
                onBlur={() => {
                  const parsed = parseFloat(buffer.value);
                  if (buffer.value === '' || isNaN(parsed)) {
                    onChange('hourly_rate', buffer.original);
                  } else {
                    onChange('hourly_rate', parsed);
                  }
                  setBuffer({ field: null, value: '', original: null });
                }}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Base Cost / Call-out (£)</Label>
              <Input
                type="tel"
                value={buffer.field === 'base_cost' ? buffer.value : (formData.base_cost || 40)}
                onFocus={() => setBuffer({ field: 'base_cost', value: String(formData.base_cost ?? ''), original: formData.base_cost ?? 40 })}
                onChange={(e) => setBuffer(prev => ({ ...prev, value: e.target.value }))}
                onBlur={() => {
                  const parsed = parseFloat(buffer.value);
                  if (buffer.value === '' || isNaN(parsed)) {
                    onChange('base_cost', buffer.original);
                  } else {
                    onChange('base_cost', parsed);
                  }
                  setBuffer({ field: null, value: '', original: null });
                }}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-slate-400 text-xs">Can be removed on quote</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-white">Default Panel Price * (£)</Label>
            <Input
              type="tel"
              value={buffer.field === 'default_panel_price' ? buffer.value : (formData.default_panel_price || 60)}
              onFocus={() => setBuffer({ field: 'default_panel_price', value: String(formData.default_panel_price ?? ''), original: formData.default_panel_price ?? 60 })}
              onChange={(e) => setBuffer(prev => ({ ...prev, value: e.target.value }))}
              onBlur={() => {
                const parsed = parseFloat(buffer.value);
                if (buffer.value === '' || isNaN(parsed)) {
                  onChange('default_panel_price', buffer.original);
                } else {
                  onChange('default_panel_price', parsed);
                }
                setBuffer({ field: null, value: '', original: null });
              }}
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
                type="tel"
                value={buffer.field === 'tax_rate' ? buffer.value : (formData.tax_rate || 20)}
                onFocus={() => setBuffer({ field: 'tax_rate', value: String(formData.tax_rate ?? ''), original: formData.tax_rate ?? 20 })}
                onChange={(e) => setBuffer(prev => ({ ...prev, value: e.target.value }))}
                onBlur={() => {
                  const parsed = parseFloat(buffer.value);
                  if (buffer.value === '' || isNaN(parsed)) {
                    onChange('tax_rate', buffer.original);
                  } else {
                    onChange('tax_rate', parsed);
                  }
                  setBuffer({ field: null, value: '', original: null });
                }}
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

      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-white mb-2">Pricing Matrix Setup</h3>
          <p className="text-slate-300 text-sm mb-4">
            You can configure your detailed pricing matrix now or skip and set it up later in Settings.
          </p>
          <p className="text-slate-400 text-xs">
            The pricing matrix allows you to set specific prices for different dent sizes and types. You can fully customize this in Settings at any time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}