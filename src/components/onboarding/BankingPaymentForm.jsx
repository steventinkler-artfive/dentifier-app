import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BankingPaymentForm({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Banking Details</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Account Name *</Label>
            <Input
              value={formData.bank_account_name || ''}
              onChange={e => onChange('bank_account_name', e.target.value)}
              placeholder="Business Account Name"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Account Number *</Label>
              <Input
                value={formData.bank_account_number || ''}
                onChange={e => onChange('bank_account_number', e.target.value)}
                placeholder="12345678"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Sort Code *</Label>
              <Input
                value={formData.bank_sort_code || ''}
                onChange={e => onChange('bank_sort_code', e.target.value)}
                placeholder="12-34-56"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-white">IBAN (Optional)</Label>
            <Input
              value={formData.bank_iban || ''}
              onChange={e => onChange('bank_iban', e.target.value)}
              placeholder="GB29 NWBK 6016 1331 9268 19"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white">SWIFT/BIC Code (Optional)</Label>
            <Input
              value={formData.bank_swift_code || ''}
              onChange={e => onChange('bank_swift_code', e.target.value)}
              placeholder="NWBKGB2L"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Payment Integration</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Payment Method</Label>
            <Select
              value={formData.payment_method_preference || 'Bank Transfer Only'}
              onValueChange={(value) => onChange('payment_method_preference', value)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="Bank Transfer Only" className="text-white">Bank Transfer</SelectItem>
                <SelectItem value="Payment Links Only" className="text-white">Payment Links</SelectItem>
                <SelectItem value="Both" className="text-white">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Payment Provider</Label>
            <Select
              value={formData.payment_provider || 'None'}
              onValueChange={(value) => onChange('payment_provider', value)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="None" className="text-white">None</SelectItem>
                <SelectItem value="Stripe" className="text-white">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.payment_provider === 'Stripe' && (
            <div className="space-y-2">
              <Label className="text-white">Stripe Secret Key</Label>
              <Input
                type="password"
                value={formData.stripe_secret_key || ''}
                onChange={e => onChange('stripe_secret_key', e.target.value)}
                placeholder="sk_live_..."
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-slate-400 text-xs">Get from Stripe Dashboard → Developers → API keys</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}