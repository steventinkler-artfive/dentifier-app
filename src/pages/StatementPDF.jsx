import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import ClientStatementPDF from "@/components/reports/ClientStatementPDF";
import { base44 } from "@/api/base44Client";

export default function StatementPDF() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customer_id");
  const periodLabel = searchParams.get("period") || "All dates";
  const assessmentIds = (searchParams.get("ids") || "").split(",").filter(Boolean);

  const [assessments, setAssessments] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [logoDisplayUrl, setLogoDisplayUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let blobUrl = null;

    const load = async () => {
      try {
        const user = await base44.auth.me();

        const [allAssessments, allCustomers, settings] = await Promise.all([
          base44.entities.Assessment.filter({ created_by: user.email }),
          base44.entities.Customer.filter({ created_by: user.email }),
          base44.entities.UserSetting.filter({ user_email: user.email }),
        ]);

        if (!isMounted) return;

        const filtered = allAssessments.filter((a) => assessmentIds.includes(a.id));
        const cust = allCustomers.find((c) => c.id === customerId) || null;
        const s = settings[0] || null;

        setAssessments(filtered);
        setCustomer(cust);
        setUserSettings(s);

        // Fetch logo as blob for cross-origin safety (same as QuotePDF page)
        if (s?.business_logo_url) {
          try {
            const r = await fetch(s.business_logo_url);
            if (r.ok) {
              const blob = await r.blob();
              blobUrl = URL.createObjectURL(blob);
              if (isMounted) setLogoDisplayUrl(blobUrl);
            }
          } catch (_) {}
        }

        // Set document title for print filename
        const bizName = (s?.business_name || "Statement").replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").toUpperCase().substring(0, 20);
        document.title = `Statement_${bizName}_${periodLabel.replace(/\s+/g, "_")}`;
      } catch (e) {
        console.error("StatementPDF load error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="bg-white text-black p-8">Loading...</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8 print:bg-white print:p-0 print:min-h-0">
      <div className="max-w-4xl mx-auto print:max-w-none">
        {/* Action Buttons (hidden on print) */}
        <div className="mb-6 flex justify-between gap-3 print:hidden">
          <Link to={createPageUrl("Reports")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
          <Button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-white border-slate-700 text-white hover:text-black hover:border-gray-300"
            variant="outline"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Save PDF
          </Button>
        </div>

        <ClientStatementPDF
          assessments={assessments}
          customer={customer}
          userSettings={userSettings}
          periodLabel={periodLabel}
          currency={userSettings?.currency || "GBP"}
          logoDisplayUrl={logoDisplayUrl}
        />
      </div>
    </div>
  );
}