import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Share2, CreditCard } from "lucide-react";

const DEFAULT_DENTIFIER_LOGO = "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";

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
              shareText += `- ${item.description}: ${currencySymbol}${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}\n`;
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
          shareText += `- ${item.description}: ${currencySymbol}${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}\n`;
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

        {/* PDF Content */}
        <div className="bg-white p-8 sm:p-12 shadow-lg print:shadow-none print:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-6 sm:gap-0 print:mb-6 print:gap-2">
            <div className="order-2 sm:order-1">
              <img 
                src={logoDisplayUrl || DEFAULT_DENTIFIER_LOGO} 
                alt="Business Logo" 
                className="w-48 object-contain mb-2"
                onError={(e) => {
                  console.error("Logo failed to load");
                  e.target.src = DEFAULT_DENTIFIER_LOGO;
                }}
              />
              {!userSettings?.business_logo_url && (
                <h1 className="text-xl font-bold text-gray-800">{businessName}</h1>
              )}
            </div>
            <div className="text-right order-1 sm:order-2">
              <h2 className="text-xl font-semibold text-gray-700">
                {isCompleted ? (isDraft ? 'DRAFT INVOICE' : 'INVOICE') : (isDraft ? 'DRAFT QUOTE' : 'QUOTE')}
              </h2>
              <p className="text-gray-500 text-sm">#{referenceNumber}</p>
              <p className="text-gray-500 text-sm mt-2">Date: {new Date(assessment.created_date).toLocaleDateString()}</p>
              {isMultiVehicle && assessment.assessment_name && (
                <p className="text-gray-600 text-sm mt-1 font-medium">{assessment.assessment_name}</p>
              )}
            </div>
          </div>

          {/* Customer & Vehicle Details */}
          <div className="grid grid-cols-1 gap-6 mb-8 print:gap-4 print:mb-6">
            <div>
              <h3 className="font-semibold text-gray-500 border-b pb-2 mb-2">BILLED TO</h3>
              {customer ? (
                <>
                  {customer.business_name && (
                    <p className="font-bold text-gray-800">{customer.business_name}</p>
                  )}
                  <p className={customer.business_name ? "text-gray-600" : "font-bold text-gray-800"}>
                    {customer.business_name ? `Contact: ${customer.name}` : customer.name}
                  </p>
                  {customer.address && <p className="text-gray-600 break-words whitespace-pre-wrap">{customer.address}</p>}
                  {customer.email && <p className="text-gray-600 break-words">{customer.email}</p>}
                  {customer.phone && <p className="text-gray-600">{customer.phone}</p>}
                </>
              ) : (
                <div className="text-gray-600">
                  <p className="font-bold text-gray-800">DRAFT - Customer TBD</p>
                  <p className="text-sm mt-2">This is a draft quote.<br/>Customer details will be added when finalized.</p>
                </div>
              )}
            </div>
            
            {!isMultiVehicle && vehicle && (
              <div>
                <h3 className="font-semibold text-gray-500 border-b pb-2 mb-2">VEHICLE</h3>
                <p className="font-bold text-gray-800">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                {vehicle.color && <p className="text-gray-600">Colour: {vehicle.color}</p>}
                {vehicle.license_plate && <p className="text-gray-600">Licence: {vehicle.license_plate}</p>}
                {vehicle.vin && <p className="text-gray-600">VIN: {vehicle.vin}</p>}
              </div>
            )}
            
            {isMultiVehicle && (
              <div>
                <h3 className="font-semibold text-gray-500 border-b pb-2 mb-2">VEHICLES</h3>
                <p className="text-gray-600">{assessment.vehicles.length} Vehicle{assessment.vehicles.length !== 1 ? 's' : ''}</p>
                <div className="mt-2 space-y-1">
                  {assessment.vehicles.map((vData, idx) => {
                    const vehDetails = vehicles[vData.vehicle_id];
                    if (!vehDetails) return null;
                    return (
                      <p key={idx} className="text-gray-700 text-sm">
                        • {vehDetails.year} {vehDetails.make} {vehDetails.model}
                        {vehDetails.license_plate && ` (${vehDetails.license_plate})`}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quote Items Table */}
          <h3 className="font-semibold text-gray-500 border-b pb-2 mb-2">{isCompleted ? 'INVOICE DETAILS' : 'QUOTE DETAILS'}</h3>
          
          {isMultiVehicle ? (
            // Multi-vehicle: Show all vehicles and their line items
            <div className="mb-6">
              {assessment.vehicles.map((vData, vIdx) => {
                const vehDetails = vehicles[vData.vehicle_id];
                if (!vehDetails) return null;
                
                // Use vehicle notes if include_notes_in_quote is enabled
                const vehicleNotes = vData.include_notes_in_quote ? (vData.notes || '') : '';
                
                return (
                  <div key={vIdx} className="mb-6 last:mb-0">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      {vehDetails.year} {vehDetails.make} {vehDetails.model}
                      {vehDetails.license_plate && ` - ${vehDetails.license_plate}`}
                    </h4>
                    <table className="w-full mb-2">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-semibold text-gray-600 py-2">Description</th>
                          <th className="text-right font-semibold text-gray-600 py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vData.line_items && vData.line_items.length > 0 ? (
                          vData.line_items.map((item, iIdx) => (
                            <tr key={iIdx} className="border-b">
                              <td className="py-3 text-gray-700">
                                <p className="font-medium">{item.description}</p>
                              </td>
                              <td className="text-right py-3 font-medium text-gray-800">
                                {currencySymbol}{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-b">
                            <td className="py-3 text-gray-700">
                              <p className="font-medium">Paintless Dent Repair Service</p>
                            </td>
                            <td className="text-right py-3 font-medium text-gray-800">
                              {currencySymbol}{(vData.quote_amount || 0).toFixed(2)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    
                    {/* Vehicle-specific notes - only if toggle is on */}
                    {vehicleNotes && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Vehicle Notes:</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{vehicleNotes}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <div className="text-right">
                        <span className="text-sm text-gray-600">Vehicle Subtotal: </span>
                        <span className="font-semibold text-gray-800">{currencySymbol}{(vData.quote_amount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Single vehicle: Show line items as before
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold text-gray-600 py-2">Description</th>
                  <th className="text-right font-semibold text-gray-600 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {assessment.line_items && assessment.line_items.length > 0 ? (
                  assessment.line_items.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-4 text-gray-700">
                        <p className="font-medium">{item.description}</p>
                      </td>
                      <td className="text-right py-4 font-medium text-gray-800">
                        {currencySymbol}{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b">
                    <td className="py-4 text-gray-700">
                      <p className="font-medium">Paintless Dent Repair Service</p>
                      <p className="text-sm text-gray-500">Standard PDR service.</p>
                    </td>
                    <td className="text-right py-4 font-medium text-gray-800">
                      {currencySymbol}{(assessment.quote_amount || 0).toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          
          {/* Notes section - only for single vehicle assessments with toggle on */}
          {!isMultiVehicle && notesForCustomer && (
            <div className="mb-12 print:mb-6">
              <h3 className="font-semibold text-gray-500 border-b pb-2 mb-2 print:pb-1 print:mb-1">ASSESSMENT NOTES</h3>
              <div className="p-4 bg-gray-50 rounded-lg" style={{ backgroundColor: '#f9fafb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <p className="text-sm text-gray-600 whitespace-pre-wrap print:text-xs">{notesForCustomer}</p>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-end mb-8 print:mb-6">
            <div className="w-full sm:w-1/2">
              <div className="flex justify-between py-2">
                <span className="font-medium text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-800">{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              {isMultiVehicle && assessment.discount_percentage > 0 && (
                <div className="flex justify-between py-2">
                  <span className="font-medium text-gray-600">Discount ({assessment.discount_percentage}%)</span>
                  <span className="font-medium text-red-600">-{currencySymbol}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="font-medium text-gray-600">VAT (0%)</span>
                <span className="font-medium text-gray-800">{currencySymbol}0.00</span>
              </div>
              <div className="flex justify-between py-4 border-t-2 border-gray-300 mt-2">
                <span className="font-bold text-xl text-gray-800">Total</span>
                <span className="font-bold text-xl text-gray-800">{currencySymbol}{grandTotal.toFixed(2)} {assessment.currency || 'GBP'}</span>
              </div>
            </div>
          </div>

          {/* Payment Link Section - Show based on preference */}
          {isCompleted && assessment.payment_link_url && 
           userSettings?.payment_method_preference && 
           (userSettings.payment_method_preference === 'Payment Links Only' || userSettings.payment_method_preference === 'Both') && (
            <div className="mb-12 p-6 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-lg" style={{ backgroundColor: '#f0fdf4', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Pay Online
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Click the button below to pay this invoice securely online:
              </p>
              <a 
                href={assessment.payment_link_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                style={{ backgroundColor: '#16a34a', color: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                Pay Now
              </a>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 mt-4 border-t border-gray-200 print:pt-4 print:mt-2" style={{ pageBreakInside: 'avoid' }}>
            <div className="text-center mb-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-2">{businessName}</h3>
              <p className="text-gray-600 text-xs whitespace-pre-wrap">{businessAddress}</p>
              <p className="text-gray-600 text-xs mt-1">{contactEmail}</p>
            </div>
            <p className="text-sm text-gray-600 text-center">{invoiceFooter}</p>
          </div>

            {/* Footer - Only show bank details based on payment preference */}
            {isCompleted && userSettings && 
            (userSettings.payment_method_preference === 'Bank Transfer Only' || userSettings.payment_method_preference === 'Both') &&
            (userSettings.bank_account_name || userSettings.bank_account_number || userSettings.bank_iban) && (
            <div className="mt-6 pt-4 border-t border-gray-200" style={{ pageBreakInside: 'avoid' }}>
              <div className="p-3 bg-gray-50 rounded" style={{ backgroundColor: '#f9fafb', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <h3 className="font-semibold text-gray-700 text-sm mb-2">Bank Transfer Details</h3>
                {userSettings.bank_account_name && (
                  <p className="text-gray-600 text-xs">Account Name: {userSettings.bank_account_name}</p>
                )}
                {(userSettings.bank_account_number || userSettings.bank_sort_code) && (
                  <p className="text-gray-600 text-xs">
                    Account Number: {userSettings.bank_account_number} {userSettings.bank_sort_code && `| Sort Code: ${userSettings.bank_sort_code}`}
                  </p>
                )}
                {userSettings.bank_iban && (
                  <p className="text-gray-600 text-xs">IBAN: {userSettings.bank_iban}</p>
                )}
              </div>
            </div>
            )}

            <div className="text-center mt-8 pt-4 border-t border-gray-200 print:mt-4 print:pt-2" style={{ pageBreakInside: 'avoid' }}>
            <p className="text-xs text-gray-500">POWERED BY DENTIFIER</p>
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a8991579d29e7c386105d5/f8b406687_dentifierfullcolourstraphi-res.png" 
              alt="Dentifier Logo" 
              className="h-6 mx-auto mt-2 print:h-5" 
            />
            </div>
        </div>
      </div>
    </div>
  );
}