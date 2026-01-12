import React, { useState, useEffect } from "react";
import { Assessment, Customer, Vehicle, UserSetting } from "@/entities/all";
import { User } from "@/entities/User";
import { useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Share2, CreditCard } from "lucide-react";

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

  useEffect(() => {
    let isMounted = true;
    let currentLogoBlobUrl = null;

    const loadDetails = async () => {
      try {
        const foundAssessment = await Assessment.get(assessmentId);
        if (!isMounted) return;

        if (foundAssessment) {
          
          const promises = [];
          
          // Fetch customer
          if (foundAssessment.customer_id) {
            promises.push(Customer.get(foundAssessment.customer_id));
          } else {
            promises.push(Promise.resolve(null));
          }

          // Fetch vehicles
          if (foundAssessment.is_multi_vehicle && foundAssessment.vehicles && foundAssessment.vehicles.length > 0) {
            const vehicleIds = foundAssessment.vehicles.map(v => v.vehicle_id);
            const vehicleFetchPromise = Vehicle.list().then(allVehicles => {
              const multiVehicleMap = {};
              vehicleIds.forEach(id => {
                const found = allVehicles.find(v => v.id === id);
                if (found) multiVehicleMap[id] = found;
              });
              return multiVehicleMap;
            });
            promises.push(vehicleFetchPromise);
          } else if (foundAssessment.vehicle_id) {
            promises.push(Vehicle.get(foundAssessment.vehicle_id));
          } else {
            promises.push(Promise.resolve(null));
          }

          promises.push(User.me());

          const [foundCustomer, fetchedVehicleData, user] = await Promise.all(promises);

          if (!isMounted) return;
          setCustomer(foundCustomer);

          if (foundAssessment.is_multi_vehicle) {
            setVehicles(fetchedVehicleData || {});
            setVehicle(null);
          } else {
            setVehicle(fetchedVehicleData);
            setVehicles({});
          }

          // Load user settings
          const settings = await UserSetting.filter({ user_email: user.email });
          if (!isMounted) return;

          let currentAssessment = foundAssessment;

          if (settings.length > 0) {
            setUserSettings(settings[0]);
            
            // Assign quote/invoice numbers if not already assigned
            const isCompleted = foundAssessment.status === 'completed';
            const isQuoted = foundAssessment.status === 'quoted' || foundAssessment.status === 'approved';
            
            let needsUpdate = false;
            const updates = {};
            
            // Assign quote number if status is quoted/approved and no quote number exists
            if (isQuoted && !foundAssessment.quote_number) {
              const quotePrefix = settings[0].quote_prefix || 'Q-';
              const quoteNum = settings[0].next_quote_number || 1;
              updates.quote_number = `${quotePrefix}${String(quoteNum).padStart(4, '0')}`;
              
              // Increment the next quote number in settings
              await UserSetting.update(settings[0].id, {
                next_quote_number: quoteNum + 1
              });
              needsUpdate = true;
            }
            
            // Assign invoice number if status is completed and no invoice number exists
            if (isCompleted && !foundAssessment.invoice_number) {
              const invoicePrefix = settings[0].invoice_prefix || 'INV-';
              const invoiceNum = settings[0].next_invoice_number || 1;
              updates.invoice_number = `${invoicePrefix}${String(invoiceNum).padStart(4, '0')}`;
              
              // Increment the next invoice number in settings
              await UserSetting.update(settings[0].id, {
                next_invoice_number: invoiceNum + 1
              });
              needsUpdate = true;
            }
            
            // Update assessment with new numbers
            if (needsUpdate && isMounted) {
              await Assessment.update(assessmentId, updates);
              currentAssessment = { ...foundAssessment, ...updates };
            }
            
            if (settings[0].business_logo_url) {
              try {
                if (settings[0].business_logo_url.startsWith('data:') || settings[0].business_logo_url.startsWith('blob:')) {
                  if (isMounted) setLogoDisplayUrl(settings[0].business_logo_url);
                } else {
                  const response = await fetch(settings[0].business_logo_url);
                  if (!response.ok) throw new Error(`Logo fetch failed with status: ${response.status}`);
                  const imageBlob = await response.blob();
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
          } else {
            if (isMounted) setLogoDisplayUrl(null);
          }
          if (isMounted) {
            setAssessment(currentAssessment);
          }
        }
      } catch (error) {
        console.error('Error loading details for PDF:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (assessmentId) {
      loadDetails();
    } else {
      setLoading(false);
    }
    
    return () => { 
      isMounted = false; 
      if (currentLogoBlobUrl) {
        URL.revokeObjectURL(currentLogoBlobUrl);
      }
    };
  }, [assessmentId]);

  useEffect(() => {
    if (assessment && userSettings) {
      const isCompleted = assessment.status === 'completed';
      const referenceNumber = isCompleted ? 
        (assessment.invoice_number || `INV-${assessment.id.slice(-6)}`) : 
        (assessment.quote_number || `Q-${assessment.id.slice(-6)}`);
      
      const docType = isCompleted ? 'Invoice' : 'Quote';
      const docNumber = referenceNumber.replace(/[^a-zA-Z0-9-]/g, '');
      const bizName = sanitizeBusinessName(userSettings.business_name);
      const filename = `${docType}_${docNumber}_${bizName}`;
      
      // Set both document title and update head for PDF filename
      document.title = filename;
      
      // Create or update a meta tag that some browsers use for PDF naming
      let metaTag = document.querySelector('meta[name="pdf-filename"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.name = 'pdf-filename';
        document.head.appendChild(metaTag);
      }
      metaTag.content = filename;
    }
  }, [assessment, userSettings]);

  const getCurrencySymbol = (currency) => {
    const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
    return symbols[currency] || '£';
  };

  const handleShare = async () => {
    if (!assessment) return;

    const ref = referenceNumber;
    const custName = customer?.business_name || customer?.name || "";
    const currencySymbol = getCurrencySymbol(assessment.currency || "GBP");

    let shareText = `${isCompleted ? 'Invoice' : 'Quote'}: ${ref}\n`;
    if (custName) {
      shareText += `Customer: ${custName}\n`;
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

    shareText += `\nPowered by Dentifier`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${docType} ${ref}`,
          text: shareText
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
        <p>Could not load quote details. Please go back and try again.</p>
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
            <Button onClick={() => window.print()} className="bg-slate-800 hover:bg-white border-slate-700 text-white hover:text-black hover:border-gray-300" variant="outline">
              <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="bg-white p-8 sm:p-12 shadow-lg print:shadow-none print:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-6 sm:gap-0 print:mb-6 print:gap-2">
            <div className="order-2 sm:order-1">
              {logoDisplayUrl ? (
                <img 
                  src={logoDisplayUrl} 
                  alt="Business Logo" 
                  className="w-48 object-contain mb-4"
                  onError={(e) => {
                    console.error("Logo failed to load:", logoDisplayUrl);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-48 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-500 text-sm mb-4">
                  LOGO
                </div>
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
                  <p className="font-bold text-gray-800">{customer.name}</p>
                  {customer.address && <p className="text-gray-600 break-words">{customer.address.split('\n').map((line, i) => <span key={i}>{line}<br/></span>)}</p>}
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
          <div className="flex justify-between items-end pt-6 mt-4 border-t border-gray-200 print:pt-4 print:mt-2" style={{ pageBreakInside: 'avoid' }}>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{businessName}</h1>
              <p className="text-gray-500 text-sm mt-1">{businessAddress}</p>
              <p className="text-gray-500 text-sm mt-1">{contactEmail}</p>
            </div>
            <div className="text-right max-w-md">
              <h3 className="font-semibold text-gray-500 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{invoiceFooter}</p>
            </div>
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