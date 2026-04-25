import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function LogoUploader({ logoUrl, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch (err) {
      setError("Upload failed. Please try again.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {logoUrl && (
        <div className="w-64 h-32 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden mx-auto">
          <img src={logoUrl} alt="Business Logo" className="max-w-full max-h-full object-contain" />
        </div>
      )}
      <div className="flex gap-2 justify-center">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300"
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" />{logoUrl ? "Change Logo" : "Upload Logo"}</>
          )}
        </Button>
        {logoUrl && (
          <Button
            type="button"
            onClick={() => onChange("")}
            variant="outline"
            className="bg-red-900 border-red-700 text-red-300 hover:bg-red-800 hover:text-white hover:border-red-600"
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
        onChange={handleUpload}
      />
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      <p className="text-slate-400 text-sm text-center">
        Recommended: PNG with transparent background. Also accepts JPG/JPEG.
      </p>
    </div>
  );
}