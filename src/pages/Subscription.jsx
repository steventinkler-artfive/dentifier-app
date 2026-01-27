import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Zap } from "lucide-react";
import { createStripeCheckoutSession } from "@/functions/createStripeCheckoutSession";

export default function Subscription() {
  const [loading, setLoading] = useState({ starter: false, professional: false });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };
    loadUser();
  }, []);

  const handleSubscribe = async (plan) => {
    setLoading({ ...loading, [plan]: true });
    try {
      const response = await createStripeCheckoutSession({ subscription_plan: plan });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        alert('Failed to create checkout session');
        setLoading({ ...loading, [plan]: false });
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading({ ...loading, [plan]: false });
    }
  };

  const starterFeatures = [
    "Unlimited quotes & invoices",
    "Detailed or per-panel pricing",
    "Multiple vehicles per quote",
    "Custom services & line items",
    "Customisable pricing matrix",
    "Payment integration",
    "Basic reporting",
    "Includes Dentifier branding"
  ];

  const professionalFeatures = [
    "Everything in Starter, plus:",
    "Your logo, remove Dentifier branding",
    "Advanced reports (client filters, date ranges, trends)",
    "CSV export for accounting software",
    "Save custom line items",
    "Priority email support",
    "Early access to new features"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-rose-600 text-white">
            14-Day Free Trial
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-slate-400 text-lg">
            Start your 14-day free trial. No charges for 14 days. Cancel anytime.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            You'll enter payment details at checkout, but won't be charged until day 15.
          </p>
        </div>

        {/* Current Status */}
        {currentUser && (
          <div className="mb-8 text-center">
            {currentUser.subscription_status === 'trialing' && (
              <Badge className="bg-blue-600 text-white">
                Trial Active
              </Badge>
            )}
            {currentUser.subscription_status === 'active' && (
              <Badge className="bg-green-600 text-white">
                {currentUser.subscription_plan === 'professional' ? 'Professional' : 'Starter'} Plan Active
              </Badge>
            )}
            {currentUser.is_beta_tester && (
              <Badge className="bg-purple-600 text-white">
                Beta Tester
              </Badge>
            )}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Starter Tier */}
          <Card className="bg-slate-900 border-slate-800 hover:border-rose-600 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Starter</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">£20</span>
                <span className="text-slate-400">/month</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                after your 14-day free trial
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                onClick={() => handleSubscribe('starter')}
                disabled={loading.starter || currentUser?.subscription_status === 'active'}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-6 text-lg"
              >
                {loading.starter ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Start 14-Day Free Trial'
                )}
              </Button>
              
              <div className="space-y-3">
                {starterFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Professional Tier */}
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-rose-600 border-2 relative overflow-hidden hover:shadow-2xl hover:shadow-rose-600/20 transition-all duration-300">
            <div className="absolute top-4 right-4">
              <Badge className="bg-rose-600 text-white">
                <Zap className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-white text-2xl">Professional</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">£35</span>
                <span className="text-slate-400">/month</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                after your 14-day free trial
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Button
                onClick={() => handleSubscribe('professional')}
                disabled={loading.professional || currentUser?.subscription_status === 'active'}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-6 text-lg"
              >
                {loading.professional ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Start 14-Day Free Trial'
                )}
              </Button>
              
              <div className="space-y-3">
                {professionalFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className={`text-slate-300 text-sm ${index === 0 ? 'font-semibold' : ''}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trial Info */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-slate-400">
            <Check className="w-4 h-4 inline text-green-400 mr-2" />
            No credit card required for trial
          </p>
          <p className="text-slate-400">
            <Check className="w-4 h-4 inline text-green-400 mr-2" />
            Cancel anytime, no questions asked
          </p>
          <p className="text-slate-400">
            <Check className="w-4 h-4 inline text-green-400 mr-2" />
            Full access to all features during trial
          </p>
        </div>
      </div>
    </div>
  );
}