import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Share2 } from "lucide-react";
import QuotePDFContent from "@/components/pdf/QuotePDFContent";

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
    
    // Store original title to restore later
    const originalTitle = document.title;
    
    // Build dynamic filename
    const isCompleted = assessment.status === 'completed';
    const refNum = isCompleted ? 
      (assessment.invoice_number || `INV-${assessment.id.slice(-6)}`) : 
      (assessment.quote_number || `Q-${assessment.id.slice(-6)}`);
    
    const docType = isCompleted ? 'Invoice' : 'Quote';
    const docNum = refNum.replace(/[^a-zA-Z0-9-]/g, '');
    const bizName = sanitizeBusinessName(userSettings.business_name);
    
    const filename = `${docType}_${docNum}_${bizName}`;
    
    // DEBUG: Log what we're setting
    console.log('=== PDF FILENAME DEBUG ===');
    console.log('Original title:', originalTitle);
    console.log('Assessment status:', assessment.status);
    console.log('Invoice number:', assessment.invoice_number);
    console.log('Quote number:', assessment.quote_number);
    console.log('Reference number used:', refNum);
    console.log('Document type:', docType);
    console.log('Document number (sanitized):', docNum);
    console.log('Business name:', userSettings.business_name);
    console.log('Sanitized business name:', bizName);
    console.log('Final filename to set:', `${docType}_${docNum}_${bizName}`);
    
    // Set document title RIGHT BEFORE printing (NO .pdf extension)
    document.title = `${docType}_${docNum}_${bizName}`;
    
    console.log('document.title is now:', document.title);
    
    // Open print dialog
    window.print();
    
    // Restore original title after print dialog opens
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
        console.log('Loading PDF data for assessment:', assessmentId);
        
        // Call the backend function directly via fetch (works without authentication)
        const functionUrl = `${window.location.origin}/api/functions/getQuotePDFData`;
        console.log('Calling function URL:', functionUrl);
        
        const fetchResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assessment_id: assessmentId })
        });
        
        console.log('Fetch response status:', fetchResponse.status);
        
        const response = await fetchResponse.json();

        if (!isMounted) return;

        console.log('Backend response:', response);

        if (response && !response.error && response.assessment) {
          const foundAssessment = response.assessment;
          const foundCustomer = response.customer;
          const fetchedVehicleData = response.vehicle;
          const fetchedVehicles = response.vehicles || {};
          const settings = response.userSettings;

          setAssessment(foundAssessment);
          setCustomer(foundCustomer);
          
          if (foundAssessment.is_multi_vehicle) {
            setVehicles(fetchedVehicles);
            setVehicle(null);
          } else {
            setVehicle(fetchedVehicleData);
            setVehicles({});
            }

            // No user data needed for public PDF view

            if (settings) {
            setUserSettings(settings);
            
            // Handle logo display
            if (settings.business_logo_url) {
              try {
                if (settings.business_logo_url.startsWith('data:') || settings.business_logo_url.startsWith('blob:')) {
                  if (isMounted) setLogoDisplayUrl(settings.business_logo_url);
                } else {
                  const logoResponse = await fetch(settings.business_logo_url);
                  if (!logoResponse.ok) throw new Error(`Logo fetch failed with status: ${logoResponse.status}`);
                  const imageBlob = await logoResponse.blob();
                  const localUrl = URL.createObjectURL(imageBlob);
                  if (isMounted) {
                    currentLogoBlobUrl = localUrl;
                    setLogoDisplayUrl(localUrl);
                  }
                }
              } catch (e) {
                console.error("Failed to fetch logo for PDF:", e);
                if (isMounted) setLogoDisplayUrl(null);
              }
            } else {
              if (isMounted) setLogoDisplayUrl(null);
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
          // Handle error response from backend
          console.error('Backend returned error or no data:', response);
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

    if (isMultiVehicle) {
      shareText += `\nVehicles & Line Items:\n\n`;
      assessment.vehicles.forEach((v) => {
        const vInfo = vehicles[v.vehicle_id];
        if (vInfo) {
          shareText += `${vInfo.year} ${vInfo.make} ${vInfo.model}\n`;
          if (v.line_items && v.line_items.length > 0) {
            v.line_items.forEach(item => {
              shareText += `- ${item.description}: ${currencySymbol}${((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}\n`;
            });
          } else {
            shareText += `- Paintless Dent Repair Service: ${currencySymbol}${(v.quote_amount || 0).toFixed(2)}\n`;
          }
          shareText += `Subtotal: ${currencySymbol}${(v.quote_amount || 0).toFixed(2)}\n\n`;
        }
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

    // Add payment details for completed invoices
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

  const currencySymbol = getCurrencySymbol(assessment.currency || 'GBP');
  const isDraft = !customer;
  const isCompleted = assessment.status === 'completed';
  const isMultiVehicle = assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0;

  const businessName = userSettings?.business_name || "Dentifier PDR";
  const businessAddress = userSettings?.business_address || "PDR Assessment & Quoting";
  const contactEmail = userSettings?.contact_email || "contact@dentifier.com";
  
  // Get the appropriate reference number
  const referenceNumber = isCompleted ? 
    (assessment.invoice_number || `INV-${assessment.id.slice(-6)}`) : 
    (assessment.quote_number || `Q-${assessment.id.slice(-6)}`);
  
  // Get invoice footer
  const invoiceFooter = isCompleted && userSettings?.invoice_footer ? 
    userSettings.invoice_footer : 
    (isCompleted ? "Thank you for your business! Payment is due within 7 days." : 
      (isDraft ? "This is a draft quote and subject to change. Quote will be finalised once customer details are confirmed. Thank you for your business!" : 
        "This quote is valid for 30 days. Thank you for your business!"));
  
  // Use assessment notes if include_notes_in_quote is enabled (from URL param or assessment data)
  const shouldIncludeNotes = includeNotesParam || assessment.include_notes_in_quote;
  const notesForCustomer = shouldIncludeNotes ? (assessment.notes || '') : '';

  // Calculate totals for multi-vehicle
  let subtotal = 0;
  let discountAmount = 0;
  let grandTotal = 0;

  if (isMultiVehicle) {
    subtotal = assessment.vehicles.reduce((sum, v) => sum + (v.quote_amount || 0), 0);
    discountAmount = (subtotal * (assessment.discount_percentage || 0)) / 100;
    grandTotal = subtotal - discountAmount;
  } else {
    subtotal = assessment.quote_amount || 0;
    grandTotal = subtotal;
  }

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
        />
      </div>
    </div>
  );
}