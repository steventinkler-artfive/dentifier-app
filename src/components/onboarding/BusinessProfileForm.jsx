import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BusinessProfileForm({ formData, onChange, user }) {
  const fileInputRef = useRef(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange('business_logo_url', file_url);
    } catch (err) {
      console.error("Logo upload failed:", err);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setLogoUploading(false);
    }
  };

  const isProfessional = ['professional', 'founder', 'early_bird'].includes(user?.subscription_tier);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white">Business Name *</Label>
        <Input
          value={formData.business_name || ''}
          onChange={e => onChange('business_name', e.target.value)}
          placeholder="e.g., Acme PDR"
          className="bg-slate-800 border-slate-700 text-white"
          required
        />
      </div>

      {isProfessional && (
        <div className="space-y-2">
          <Label className="text-white">Business Logo</Label>
          {formData.business_logo_url && (
            <div className="relative w-48 h-24 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden mb-2">
              <img src={formData.business_logo_url} alt="Business Logo" className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black"
              disabled={logoUploading}
            >
              {logoUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {formData.business_logo_url ? 'Change Logo' : 'Upload Logo'}
                </>
              )}
            </Button>
            {formData.business_logo_url && (
              <Button
                type="button"
                onClick={() => onChange('business_logo_url', '')}
                variant="outline"
                className="bg-red-900 border-red-700 text-red-300 hover:bg-red-800 hover:text-white"
              >
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <p className="text-slate-400 text-xs">Recommended: PNG with transparent background. Max 2MB</p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-white">Business Address *</Label>
        <Textarea
          value={formData.business_address || ''}
          onChange={e => onChange('business_address', e.target.value)}
          placeholder="123 Main Street&#10;City, Postcode&#10;United Kingdom"
          rows={3}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-white">Contact Email *</Label>
        <Input
          type="email"
          value={formData.contact_email || ''}
          onChange={e => onChange('contact_email', e.target.value)}
          placeholder="contact@yourbusiness.co.uk"
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
          required
        />
      </div>
    </div>
  );
}