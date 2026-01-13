import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Upgrade() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Upgrade to Professional</h1>
          <p className="text-slate-400 text-lg">Unlock powerful features to grow your PDR business</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Starter Plan */}
          <Card className="bg-slate-900/50 border-slate-800 relative">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl text-white">Starter</CardTitle>
                <Badge className="bg-slate-700 text-slate-300">Current Plan</Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">£20</span>
                <span className="text-slate-400">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Unlimited quotes & invoices</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Dentifier branding on quotes</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">All core features</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Customer management</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">Photo damage analysis</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Plan */}
          <Card className="bg-gradient-to-br from-rose-900/30 to-purple-900/30 border-rose-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-br from-rose-600 to-rose-700 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
              RECOMMENDED
            </div>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-2xl text-white">Professional</CardTitle>
                <Crown className="w-6 h-6 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">£35</span>
                <span className="text-slate-300">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-rose-200 font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Everything in Starter, plus:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Upload your business logo</span>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Remove Dentifier header branding</span>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Advanced reports with filters</span>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">CSV export for all data</span>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Priority support</span>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-white font-medium">Early access to new features</span>
                </div>
              </div>
              
              <Button className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold py-6 text-lg mt-6">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ / Additional Info */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl text-white">Why upgrade?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-white font-semibold mb-2">Professional Branding</h3>
              <p className="text-slate-400 text-sm">
                Replace the Dentifier header logo with your own business logo to create fully branded quotes and invoices that reflect your business identity.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-slate-400 text-sm">
                Get detailed insights into your business performance with advanced filtering, date ranges, and CSV exports for further analysis.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Priority Support</h3>
              <p className="text-slate-400 text-sm">
                Get faster responses and dedicated support to help you make the most of Dentifier for your PDR business.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link to={createPageUrl("Settings")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              ← Back to Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}