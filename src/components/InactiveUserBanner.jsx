import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function InactiveUserBanner({ user }) {
  if (!user || user.subscription_status !== 'cancelled') {
    return null;
  }

  return (
    <Alert className="bg-amber-900/20 border-amber-700 mb-4 mx-4 mt-4">
      <AlertCircle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="text-amber-200 flex items-center justify-between">
        <span>Your subscription has ended. Reactivate to continue using Dentifier.</span>
        <Link to={createPageUrl("Settings")}>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white ml-4">
            Reactivate Subscription
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}