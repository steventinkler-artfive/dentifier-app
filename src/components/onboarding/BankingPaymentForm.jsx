import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BankingDetailsForm from "@/components/settings/BankingDetailsForm";

export default function BankingPaymentForm({ formData, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Banking Details</h3>
        <BankingDetailsForm formData={formData} onChange={onChange} />
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
                <SelectItem value="Square" className="text-white">Square</SelectItem>
                <SelectItem value="PayPal" className="text-white">PayPal</SelectItem>
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

          {formData.payment_provider === 'Square' && (
            <div className="space-y-2">
              <Label className="text-white">Square Access Token</Label>
              <Input
                type="password"
                value={formData.square_access_token || ''}
                onChange={e => onChange('square_access_token', e.target.value)}
                placeholder="EAAAl..."
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-slate-400 text-xs">Get from Square Developer Dashboard → Applications → Access Token</p>
            </div>
          )}

          {formData.payment_provider === 'PayPal' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">PayPal Client ID</Label>
                <Input
                  type="password"
                  value={formData.paypal_client_id || ''}
                  onChange={e => onChange('paypal_client_id', e.target.value)}
                  placeholder="AZ..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">PayPal Client Secret</Label>
                <Input
                  type="password"
                  value={formData.paypal_client_secret || ''}
                  onChange={e => onChange('paypal_client_secret', e.target.value)}
                  placeholder="EG..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <p className="text-slate-400 text-xs">Get from PayPal Developer Dashboard → My Apps & Credentials</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}