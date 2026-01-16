import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export function BankingIncompleteBanner({ settings, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (settings?.banking_banner_dismissed_until) {
      const dismissedUntil = new Date(settings.banking_banner_dismissed_until);
      if (dismissedUntil > new Date()) {
        setDismissed(true);
      }
    }
  }, [settings]);

  const handleDismiss = async () => {
    const dismissedUntil = new Date();
    dismissedUntil.setDate(dismissedUntil.getDate() + 3);
    
    try {
      await base44.entities.UserSetting.update(settings.id, {
        banking_banner_dismissed_until: dismissedUntil.toISOString()
      });
      setDismissed(true);
      if (onDismiss) onDismiss();
    } catch (err) {
      console.error("Failed to dismiss banner:", err);
    }
  };

  if (dismissed) return null;

  const isBankingComplete = settings?.bank_account_name && settings?.bank_account_number && settings?.bank_sort_code;
  if (isBankingComplete) return null;

  return (
    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4 flex items-start gap-3">
      <CreditCard className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-blue-200 font-medium">Complete your bank details</p>
        <p className="text-blue-300 text-sm mt-1">Add your banking information to receive payments via invoices.</p>
        <Link to={createPageUrl('Settings')}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white mt-3 text-sm h-8">
            Complete Setup
          </Button>
        </Link>
      </div>
      <button onClick={handleDismiss} className="text-blue-400 hover:text-blue-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function SkillsIncompleteBanner({ settings }) {
  const configuredSkills = settings?.specialized_damage_skills?.filter(s => s.level !== "Don't do this type") || [];
  const isSkillsComplete = configuredSkills.length >= 3;

  if (isSkillsComplete) return null;

  return (
    <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4 mb-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-orange-200 font-medium">Your confidence scores are inaccurate</p>
        <p className="text-orange-300 text-sm mt-1">Complete your technician skills in Settings to improve quote accuracy.</p>
        <Link to={createPageUrl('Settings')}>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white mt-3 text-sm h-8">
            Complete Setup
          </Button>
        </Link>
      </div>
    </div>
  );
}