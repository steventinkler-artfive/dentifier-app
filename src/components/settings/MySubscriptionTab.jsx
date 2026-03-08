import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Crown, Zap, Loader2, AlertTriangle } from "lucide-react";
import { createStripePortalSession } from "@/functions/createStripePortalSession";
import { createStripeCheckoutSession } from "@/functions/createStripeCheckoutSession";

// NOTE: Plan feature lists are hardcoded — there is no DB source for them.
// Keep in sync with pages/Subscription.jsx if features change.
const STARTER_FEATURES = [
  "Unlimited quotes & invoices",
  "Detailed or per-panel pricing",
  "Multiple vehicles per quote",
  "Custom services & line items",
  "Customisable pricing matrix",
  "Payment integration (Stripe, Square, PayPal)",
  "Basic reporting",
  "Customer & vehicle management",
  "DVLA vehicle lookup",
  "AI-enhanced damage assessment",
  "Professional PDF generation",
  "Quote delivery (PDF, email, WhatsApp)",
  "Job tracking and status management",
  "Includes Dentifier branding on quotes and invoices",
];

const PROFESSIONAL_FEATURES = [
  "Everything in Starter, plus:",
  "Upload your own logo",
  "Remove Dentifier branding from all customer-facing documents",
  "Advanced reports (filter by client, date range, payment status, view trends)",
  "CSV export for accounting software",
  "Save custom line items for quick re-use",
  "Priority email support",
  "Early access to new features",
];

const openPortal = async (setLoading) => {
  setLoading(true);
  try {
    const response = await createStripePortalSession({});
    if (response.data.url) {
      window.location.href = response.data.url;
    } else {
      alert("Failed to open subscription portal. Please try again.");
      setLoading(false);
    }
  } catch (error) {
    console.error("Portal error:", error);
    alert("Failed to open subscription portal. Please try again.");
    setLoading(false);
  }
};

const openCheckout = async (plan, setLoading) => {
  setLoading(true);
  try {
    const response = await createStripeCheckoutSession({ tier: plan });
    if (response.data.checkout_url) {
      localStorage.setItem("selected_plan_tier", plan);
      window.location.href = response.data.checkout_url;
    } else {
      alert("Failed to start checkout. Please try again.");
      setLoading(false);
    }
  } catch (error) {
    console.error("Checkout error:", error);
    alert("Failed to start checkout. Please try again.");
    setLoading(false);
  }
};

function StatusBanner({ user }) {
  const status = user?.subscription_status;
  const plan = user?.subscription_plan;
  const isBeta = user?.is_beta_tester;

  const getPlanLabel = () => {
    if (isBeta) return "Beta Tester";
    if (!plan || plan === "starter") return "Starter";
    if (plan === "professional") return "Professional";
    return "Starter";
  };

  const getStatusBadge = () => {
    if (isBeta) return { label: "Beta Access", cls: "bg-purple-600 text-white" };
    if (status === "active") return { label: "Active", cls: "bg-green-600 text-white" };
    if (status === "trialing") {
      const daysLeft = user?.trial_end_date
        ? Math.max(0, Math.ceil((new Date(user.trial_end_date) - new Date()) / (1000 * 60 * 60 * 24)))
        : null;
      return {
        label: daysLeft !== null ? `Trial — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left` : "Trial",
        cls: "bg-blue-600 text-white",
      };
    }
    if (status === "past_due") return { label: "Past Due", cls: "bg-yellow-600 text-white" };
    if (status === "canceled" || status === "cancelled") return { label: "Cancelled", cls: "bg-red-600 text-white" };
    return { label: "Inactive", cls: "bg-slate-600 text-white" };
  };

  const badge = getStatusBadge();

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isBeta ? (
            <Zap className="w-6 h-6 text-purple-400 flex-shrink-0" />
          ) : (
            <Crown className="w-6 h-6 text-rose-400 flex-shrink-0" />
          )}
          <div>
            <p className="text-white font-semibold">{getPlanLabel()} Plan</p>
            {status === "trialing" && user?.trial_end_date && (
              <p className="text-slate-400 text-xs mt-0.5">
                Trial ends {new Date(user.trial_end_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
            {status === "active" && !user?.trial_end_date && (
              <p className="text-slate-400 text-xs mt-0.5">Renews automatically</p>
            )}
          </div>
        </div>
        <Badge className={badge.cls}>{badge.label}</Badge>
      </CardContent>
    </Card>
  );
}

function PlanCard({ title, price, features, isCurrent, isCurrentOnMobile, actionLabel, onAction, loading, isPro }) {
  const borderStyle = isCurrent
    ? { border: "2px solid #F2034D" }
    : {};

  return (
    <Card
      className={`bg-slate-900 border-slate-800 flex flex-col ${isCurrentOnMobile ? "order-first" : "order-last"} md:order-none`}
      style={isCurrent ? borderStyle : {}}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-white text-xl">{title}</CardTitle>
          {isCurrent && (
            <Badge style={{ backgroundColor: "#F2034D", color: "white" }} className="text-xs shrink-0">
              Your current plan
            </Badge>
          )}
        </div>
        <div className="mt-2">
          <span className="text-3xl font-bold text-white">£{price}</span>
          <span className="text-slate-400 text-sm">/month</span>
        </div>
        {isCurrent && <p className="text-slate-500 text-xs mt-1">after your trial period</p>}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        <div className="space-y-2 flex-1">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span className={`text-slate-300 text-sm ${i === 0 && isPro ? "font-semibold" : ""}`}>
                {feature}
              </span>
            </div>
          ))}
        </div>
        {!isCurrent && actionLabel && (
          <Button
            onClick={onAction}
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function MySubscriptionTab({ user }) {
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [loadingSwitch, setLoadingSwitch] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  const hasStripe = !!user?.stripe_customer_id;
  const currentPlan = user?.subscription_plan || "starter"; // defaults to starter
  const isOnProfessional = currentPlan === "professional";
  const isOnStarter = !isOnProfessional;

  const handleUpgrade = () => openCheckout("professional", setLoadingUpgrade);
  const handleSwitch = () => openPortal(setLoadingSwitch);
  const handleCancel = () => openPortal(setLoadingCancel);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Current Plan Banner */}
      <StatusBanner user={user} />

      {/* No Stripe Customer Warning */}
      {!hasStripe && !user?.is_beta_tester && (
        <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-300 text-sm">
            No billing account found. If you started a trial, please contact support.
          </p>
        </div>
      )}

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PlanCard
          title="Starter"
          price="20"
          features={STARTER_FEATURES}
          isCurrent={isOnStarter}
          isCurrentOnMobile={isOnStarter}
          actionLabel={isOnProfessional ? "Switch to Starter" : null}
          onAction={handleSwitch}
          loading={loadingSwitch}
          isPro={false}
        />
        <PlanCard
          title="Professional"
          price="35"
          features={PROFESSIONAL_FEATURES}
          isCurrent={isOnProfessional}
          isCurrentOnMobile={isOnProfessional}
          actionLabel={isOnStarter ? "Upgrade to Professional" : null}
          onAction={handleUpgrade}
          loading={loadingUpgrade}
          isPro={true}
        />
      </div>

      {/* Cancel / Manage Link */}
      {hasStripe && (
        <div className="text-center pt-2">
          <button
            onClick={handleCancel}
            disabled={loadingCancel}
            className="text-slate-500 hover:text-slate-400 text-sm transition-colors inline-flex items-center gap-1"
          >
            {loadingCancel ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : null}
            Need to cancel? Manage your cancellation →
          </button>
        </div>
      )}
    </div>
  );
}