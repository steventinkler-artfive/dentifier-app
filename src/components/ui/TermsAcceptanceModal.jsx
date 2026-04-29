import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function TermsAcceptanceModal({ isOpen, onClose, onAccepted, selectedPlan, currentUser, userSettings }) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    if (loading) return;
    setAgreed(false);
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!agreed || !currentUser) return;

    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const updateData = {
        terms_accepted: true,
        terms_accepted_at: now,
        terms_version: "1.0",
      };

      if (userSettings?.id) {
        await base44.entities.UserSetting.update(userSettings.id, updateData);
      } else {
        await base44.entities.UserSetting.create({
          user_email: currentUser.email,
          ...updateData,
        });
      }

      setAgreed(false);
      onAccepted(selectedPlan);
      onClose();
    } catch (err) {
      console.error("Failed to record terms acceptance:", err);
      setError("We couldn't save your acceptance. Please try again before proceeding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-md bg-slate-900 text-white border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Before you start your free trial</DialogTitle>
          <DialogDescription className="text-slate-400">
            Please read and accept our terms to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <p className="text-slate-300 text-sm">
            By proceeding, you agree to Dentifier's:
          </p>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a
                href="https://dentifier.com/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-400 hover:text-rose-300 underline"
              >
                Terms &amp; Conditions
              </a>
            </li>
            <li>
              <a
                href="https://dentifier.com/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-rose-400 hover:text-rose-300 underline"
              >
                Data Processing Agreement
              </a>
            </li>
          </ul>

          <div className="flex items-start gap-3 pt-1">
            <Checkbox
              id="terms-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(!!checked)}
              className="mt-0.5 border-slate-500 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
            />
            <Label htmlFor="terms-agree" className="text-sm text-slate-300 leading-snug cursor-pointer">
              I have read and agree to the Terms &amp; Conditions and Data Processing Agreement.
            </Label>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/30 border border-red-800 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!agreed || loading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              "Confirm & Start Trial"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}