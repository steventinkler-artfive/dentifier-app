import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, CreditCard, Smartphone, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useInstallPrompt } from "./InstallPromptProvider";
import InstallInstructions from "./InstallInstructions";

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

export function PWAInstallBanner({ settings }) {
  const { deferredPrompt, isStandalone, isMobile, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (settings?.pwa_banner_dismissed_at) {
      const dismissedAt = new Date(settings.pwa_banner_dismissed_at);
      const threeDaysLater = new Date(dismissedAt);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      if (threeDaysLater > new Date()) {
        setDismissed(true);
      }
    }
  }, [settings]);

  if (!isMobile || isStandalone || settings?.pwa_status === "installed" || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await promptInstall();
    setInstalling(false);
    if (outcome === "accepted") {
      try {
        await base44.entities.UserSetting.update(settings.id, {
          pwa_status: "installed",
        });
      } catch (err) {
        console.error("Failed to update PWA status:", err);
      }
    }
  };

  const handleDismiss = async () => {
    try {
      const now = new Date().toISOString();
      await base44.entities.UserSetting.update(settings.id, {
        pwa_banner_dismissed_at: now,
      });
      setDismissed(true);
    } catch (err) {
      console.error("Failed to dismiss PWA banner:", err);
    }
  };

  return (
    <div className="bg-rose-900/20 border border-rose-800 rounded-lg p-4 mb-4 flex items-start gap-3">
      <Smartphone className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-rose-200 font-medium">Get quicker access — add Dentifier to your home screen</p>
        <p className="text-rose-300 text-sm mt-1">
          Takes 10 seconds. Opens straight to your dashboard, full screen, ready when you are.
        </p>
        {deferredPrompt ? (
          <Button
            onClick={handleInstall}
            disabled={installing}
            className="bg-rose-600 hover:bg-rose-700 text-white mt-3 text-sm h-8"
          >
            {installing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Smartphone className="w-4 h-4 mr-1" />
            )}
            Install App
          </Button>
        ) : (
          <div className="mt-3">
            <InstallInstructions />
          </div>
        )}
      </div>
      <button onClick={handleDismiss} className="text-rose-400 hover:text-rose-300">
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