import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut, Crown, Zap, Loader2, ExternalLink } from "lucide-react";
import { createStripePortalSession } from "@/functions/createStripePortalSession";

export default function UserMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const response = await createStripePortalSession({});
      
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        alert('Failed to open subscription portal');
        setLoadingPortal(false);
      }
    } catch (error) {
      console.error('Error opening portal:', error);
      alert('Failed to open subscription portal');
      setLoadingPortal(false);
    }
  };

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getSubscriptionStatus = () => {
    if (!user) return null;

    if (user.is_beta_tester) {
      return { label: 'Beta Access', color: 'text-purple-400', icon: Zap };
    }

    if (user.subscription_status === 'trialing' && user.trial_end_date) {
      const trialEnd = new Date(user.trial_end_date);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      return { 
        label: `Trial - ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`, 
        color: 'text-blue-400',
        icon: Zap
      };
    }

    if (user.subscription_status === 'active') {
      const planName = user.subscription_plan === 'professional' ? 'Professional' : 'Starter';
      return { 
        label: `${planName} Plan`, 
        color: 'text-green-400',
        icon: Crown
      };
    }

    return null;
  };

  const subscriptionStatus = getSubscriptionStatus();
  const showManageSubscription = user && (user.subscription_status === 'trialing' || user.subscription_status === 'active');

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center text-white font-semibold text-sm transition-colors"
      >
        {getInitials(user.full_name, user.email)}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 overflow-hidden">
            {/* User Info */}
            <div className="p-4 border-b border-slate-800">
              <p className="text-white font-semibold text-sm truncate">
                {user.full_name || 'User'}
              </p>
              <p className="text-slate-400 text-xs truncate">
                {user.email}
              </p>
              {subscriptionStatus && (
                <div className={`flex items-center gap-1 mt-2 ${subscriptionStatus.color}`}>
                  <subscriptionStatus.icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{subscriptionStatus.label}</span>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {showManageSubscription && (
                <button
                  onClick={handleManageSubscription}
                  disabled={loadingPortal}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                  {loadingPortal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Manage Subscription
                </button>
              )}

              <Link to={createPageUrl("Settings")} onClick={() => setIsOpen(false)}>
                <button className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-800 transition-colors flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </Link>

              <div className="border-t border-slate-800 my-2" />

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}