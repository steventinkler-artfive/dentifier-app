import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Loader2, Calendar, CreditCard, Zap, Check } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const getTrialDaysRemaining = () => {
    if (!user?.trial_end_date) return null;
    const trialEnd = new Date(user.trial_end_date);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 ? daysRemaining : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const planName = user?.subscription_plan === 'professional' ? 'Professional' : 'Starter';
  const trialDays = getTrialDaysRemaining();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <Card className="bg-slate-900 border-slate-800 max-w-2xl w-full">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to Dentifier!
            </h1>
            <p className="text-xl text-green-400 font-semibold">
              Your 14-day free trial has started
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 mb-8 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Zap className="w-5 h-5 text-rose-400" />
              <p className="text-white font-semibold text-lg">
                {planName} Plan
              </p>
            </div>

            {user?.trial_end_date && (
              <div className="flex items-center justify-center gap-3 text-slate-300">
                <Calendar className="w-5 h-5 text-blue-400" />
                <p>
                  Trial ends on <span className="font-semibold">{formatDate(user.trial_end_date)}</span>
                  {trialDays !== null && ` (${trialDays} days)`}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 text-slate-300">
              <CreditCard className="w-5 h-5 text-green-400" />
              <p>
                You won't be charged until {user?.trial_end_date ? formatDate(user.trial_end_date) : 'your trial ends'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-white font-semibold mb-3">Next Steps:</h3>
              <div className="space-y-2 text-left text-slate-300 text-sm">
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Complete your business profile in Settings
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Set up your pricing matrix
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Create your first customer and vehicle assessment
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  Generate and send your first professional quote
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                localStorage.setItem('just_subscribed', 'true');
                // Small delay to ensure localStorage is set before navigation triggers Layout re-check
                setTimeout(() => navigate(createPageUrl("Dashboard")), 50);
              }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-6 text-lg"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <p className="text-slate-500 text-sm">
              Need help getting started? Visit Settings for guidance and support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}