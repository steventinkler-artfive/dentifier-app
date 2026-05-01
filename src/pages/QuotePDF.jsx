import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Share2 } from "lucide-react";
import QuotePDFContent from "@/components/pdf/QuotePDFContent";
import { base44 } from "@/api/base44Client";

export default function QuotePDF() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('id');
  const includeNotesParam = searchParams.get('include_notes') === 'true';
  const [assessment, setAssessment] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [vehicles, setVehicles] = useState({});
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoDisplayUrl, setLogoDisplayUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isProfessionalTier, setIsProfessionalTier] = useState(false);

  const sanitizeBusinessName = (name) => {
    if (!name) return 'BUSINESS';
    return name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toUpperCase()
      .substring(0, 20);
  };

  const handlePrintPDF = () => {
    if (!assessment || !userSettings) {
      console.log('ERROR: Missing data - assessment:', assessment, 'userSettings:', userSettings);
      return;
    }
    
    const originalTitle = document.title;
    
    const isCompleted = assessment.status === 'completed';
    const refNum = isCompleted ? 
      (assessment.invoice_number || `INV-${assessment.id.slice(-6)}`) : 
      (assessment.quote_number || `Q-${assessment.id.slice(-6)}`);
    
    const docType = isCompleted ? 'Invoice' : 'Quote';
    const docNum = refNum.replace(/[^a-zA-Z0-9-]/g, '');
    const bizName = sanitizeBusinessName(userSettings.business_name);
    
    document.title = `${docType}_${docNum}_${bizName}`;
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  useEffect(() => {
    let isMounted = true;
    let currentLogoBlobUrl = null;

    const loadDetails = async () => {
      if (!assessmentId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await base44.functions.invoke('getQuotePDFData', { assessment_id: assessmentId });

        if (!isMounted) return;

        if (response.data && !response.data.error && response.data.assessment) {
          const foundAssessment = response.data.assessment;
          const foundCustomer = response.data.customer;
          const fetchedVehicleData = response.data.vehicle;
          const fetchedVehicles = response.data.vehicles || {};
          const settings = response.data.userSettings;

          // Determine Professional tier from backend response (works for public links too)
          const isPro = ['active', 'trialing'].includes(response.data.creatorSubscriptionStatus) && response.data.creatorSubscriptionPlan === 'professional';
          if (isMounted) setIsProfessionalTier(isPro);

          setAssessment(foundAssessment);
          setCustomer(foundCustomer);
          
          if (foundAssessment.is_multi_vehicle) {
            setVehicles(fetchedVehicles);
            setVehicle(null);
          } else {
            setVehicle(fetchedVehicleData);
            setVehicles({});
          }

          if (settings) {
            setUserSettings(settings);

            // Fetch logo as blob for cross-origin safe rendering (html2canvas / print)
            if (settings.business_logo_url) {
              try {
                const logoResponse = await fetch(settings.business_logo_url);
                if (logoResponse.ok) {
                  const blob = await logoResponse.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  currentLogoBlobUrl = blobUrl;
                  if (isMounted) setLogoDisplayUrl(blobUrl);
                }
              } catch (e) {
                if (isMounted) setLogoDisplayUrl(settings.business_logo_url);
              }
            }

            // Set document title
            const isCompletedForTitle = foundAssessment.status === 'completed';
            const refNum = isCompletedForTitle ? 
              (foundAssessment.invoice_number || `INV-${foundAssessment.id.slice(-6)}`) : 
              (foundAssessment.quote_number || `Q-${foundAssessment.id.slice(-6)}`);
            
            const docType = isCompletedForTitle ? 'Invoice' : 'Quote';
            const docNum = refNum.replace(/[^a-zA-Z0-9-]/g, '');
            const bizName = sanitizeBusinessName(settings.business_name);
            document.title = `${docType}_${docNum}_${bizName}`;
          }
        } else {
          console.error('Backend returned error or no data:', response.data);
          if (isMounted) {
            setAssessment(null);
            setCustomer(null);
            setVehicle(null);
            setVehicles({});
            setUserSettings(null);
          }
        }
      } catch (error) {
        console.error('Error loading details for PDF:', error);
        if (isMounted) {
          setAssessment(null);
          setCustomer(null);
          setVehicle(null);
          setVehicles({});
          setUserSettings(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDetails();

    return () => { 
      isMounted = false; 
      if (currentLogoBlobUrl) {
        URL.revokeObjectURL(currentLogoBlobUrl);
      }
    };
  }, [assessmentId]);

  const getCurrencySymbol = (currency) => {
    const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
    return symbols[currency] || '£';
  };

  const handleShare = async () => {
    if (!assessment) return;

    const ref = referenceNumber;
    const custName = customer?.business_name || customer?.name || "";
    const currencySymbol = getCurrencySymbol(assessment.currency || "GBP");
    const docType = isCompleted ? 'Invoice' : 'Quote';

    let shareText = `*${docType}: ${ref}*\n`;
    shareText += `*From:* ${businessName}\n`;
    if (custName) {
      shareText += `*Customer:* ${custName}\n`;
    }

    const isPerPanel = !assessment.vehicle_id && assessment.vehicles && assessment.vehicles.length > 0;

    if (isMultiVehicle || isPerPanel) {
      shareText += `\nVehicles & Line Items:\n\n`;
      assessment.vehicles.forEach((v) => {
        let vehicleLabel;
        if (isPerPanel) {
          vehicleLabel = [v.registration, v.colour].filter(Boolean).join(' · ');
          if (v.notes) vehicleLabel += ` — ${v.notes}`;
          if (!vehicleLabel) vehicleLabel = 'Vehicle';
        } else {
          const vInfo = vehicles[v.vehicle_id];
          vehicleLabel = vInfo ? `${vInfo.year} ${vInfo.make} ${vInfo.model}` : null;
        }
        if (!vehicleLabel) return;
        shareText += `*${vehicleLabel}*\n`;
        if (v.line_items && v.line_items.length > 0) {
          v.line_items.forEach(item => {
            shareText += `- ${item.description}: ${currencySymbol}${((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}\n`;
          });
        } else {
          shareText += `- Paintless Dent Repair Service: ${currencySymbol}${(v.quote_amount || 0).toFixed(2)}\n`;
        }
        shareText += `Subtotal: ${currencySymbol}${(v.quote_amount || 0).toFixed(2)}\n\n`;
      });
    } else {
      if (vehicle) {
        shareText += `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}\n`;
      }
      shareText += `\nLine Items:\n`;
      if (assessment.line_items && assessment.line_items.length > 0) {
        assessment.line_items.forEach(item => {
          shareText += `- ${item.description}: ${currencySymbol}${((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}\n`;
        });
      } else {
        shareText += `- Paintless Dent Repair Service: ${currencySymbol}${(assessment.quote_amount || 0).toFixed(2)}\n`;
      }
    }

    shareText += `\nTotal Amount: ${currencySymbol}${grandTotal.toFixed(2)}\n`;

    if (notesForCustomer) {
      shareText += `\nNotes: ${notesForCustomer}\n`;
    }

    if (isCompleted && userSettings) {
      const paymentPreference = userSettings.payment_method_preference;
      const showBankTransfer = paymentPreference === 'Bank Transfer Only' || paymentPreference === 'Both';
      const showPaymentLink = (paymentPreference === 'Payment Links Only' || paymentPreference === 'Both') && assessment.payment_link_url;

      if (showBankTransfer || showPaymentLink) {
        shareText += `\nPayment Details:\n`;

        if (showBankTransfer && (userSettings.bank_account_name || userSettings.bank_account_number)) {
          shareText += `\nBank Transfer:\n`;
          if (userSettings.bank_account_name) {
            shareText += `Account: ${userSettings.bank_account_name}\n`;
          }
          if (userSettings.bank_sort_code) {
            shareText += `Sort Code: ${userSettings.bank_sort_code}\n`;
          }
          if (userSettings.bank_account_number) {
            shareText += `Account: ${userSettings.bank_account_number}\n`;
          }
          shareText += `Reference: ${ref}\n`;
        }

        if (showPaymentLink) {
          shareText += `\nPay online: ${assessment.payment_link_url}\n`;
        }
      }

      if (userSettings.invoice_footer) {
        shareText += `\n${userSettings.invoice_footer}\n`;
      }
    }

    shareText += `\n\nPowered by Dentifier`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${docType} ${ref}`,
          text: shareText,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          navigator.clipboard.writeText(shareText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <div className="bg-white text-black p-8">Loading...</div>;
  }

  if (!assessment) {
    return (
      <div className="bg-white text-black p-8">
        <h1 className="text-xl font-bold mb-4">Error</h1>
        <p>Could not load quote details. Please check the browser console for details.</p>
        <p className="text-sm text-gray-600 mt-2">Assessment ID: {assessmentId}</p>
        <Link to={createPageUrl("Quotes")}>
          <Button variant="outline" className="mt-4">Back to Quotes</Button>
        </Link>
      </div>
    );
  }

  const shouldIncludeNotes = includeNotesParam || assessment.include_notes_in_quote;
  const isCompleted = assessment.status === 'completed';
  const isMultiVehicle = assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0;
  const businessName = userSettings?.business_name || "Dentifier PDR";
  const referenceNumber = isCompleted
    ? assessment.invoice_number || `INV-${assessment.id.slice(-6)}`
    : assessment.quote_number || `Q-${assessment.id.slice(-6)}`;
  const currencySymbol = getCurrencySymbol(assessment.currency || 'GBP');
  let grandTotal = 0;
  if (isMultiVehicle) {
    const subtotal = assessment.vehicles.reduce((sum, v) => sum + (v.quote_amount || 0), 0);
    grandTotal = subtotal - (subtotal * (assessment.discount_percentage || 0)) / 100;
  } else {
    grandTotal = assessment.quote_amount || 0;
  }
  const notesForCustomer = shouldIncludeNotes ? (assessment.notes || '') : '';

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-8 print:bg-white print:p-0 print:min-h-0">
      <div className="max-w-4xl mx-auto print:max-w-none">
        {/* Action Buttons (hidden on print) */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between gap-3 print:hidden">
          <Link to={createPageUrl(`AssessmentDetail?id=${assessmentId}`)}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Details
            </Button>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleShare}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Share'}
            </Button>
            <Button onClick={handlePrintPDF} className="bg-slate-800 hover:bg-white border-slate-700 text-white hover:text-black hover:border-gray-300" variant="outline">
              <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* PDF Content - uses the shared component */}
        <QuotePDFContent
          assessment={assessment}
          customer={customer}
          vehicle={vehicle}
          vehicles={vehicles}
          userSettings={userSettings}
          logoDisplayUrl={logoDisplayUrl}
          includeNotes={shouldIncludeNotes}
          isProfessional={isProfessionalTier}
        />
      </div>
    </div>
  );
}