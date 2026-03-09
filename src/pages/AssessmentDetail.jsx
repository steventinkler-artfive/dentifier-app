import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CustomerForm from "../components/customers/CustomerForm";
import CalculationBreakdown from "../components/assessment/CalculationBreakdown";
import ImageViewer from '../components/ui/ImageViewer';
import PerPanelQuoteView from "../components/assessment/PerPanelQuoteView";
import { useAlert } from "@/components/ui/CustomAlert";
import {
  ArrowLeft,
  User as UserIcon,
  Car,
  Camera,
  FileText,
  Mail,
  Phone,
  Check,
  CheckCircle,
  Share2,
  Trash2,
  CheckCircle2,
  Edit,
  AlertTriangle,
  Search,
  UserPlus,
  Plus,
  Briefcase,
  Loader2,
  ArrowRight,
  Calculator,
  Save,
  Edit2,
  CreditCard,
  Eye
} from "lucide-react";
import QuotePDFContent from "@/components/pdf/QuotePDFContent";
import ReactDOM from "react-dom/client";
import EmailModal from "@/components/EmailModal";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const DentifierIcon = ({ className = "" }) => (
  <svg
    className={className}
    viewBox="0 0 25.24 18.12"
    fill="currentColor"
    style={{ width: 'auto', height: '1.25rem' }}
    preserveAspectRatio="xMidYMid meet"
  >
    <g>
      <path d="M3.39,8.1h4.16c-.43,0,.8-.29.9-.66l.64-2.14h3.12c.44,0,.81-.29.92-.72l.86-3.41c-.07-.28.01-.58-.17-.81-.18-.23-.45-.37-.75-.37h-7.95c-.43,0-.8.29-.91,0.7l-1.25,4.71-.48,1.5c-.08.29-.02.59.16.82s.45.37.75.37ZM4.1,5.75l1.21-4.54h7.43l-.73,2.9h-3.12c-.43,0-.8.29-.91.70l-.44,1.6-.17.51h-3.63l.37-1.16Z" />
      <path d="M24.38,1.62c-.8-1.04-2.06-1.62-3.54-1.62h-3.99c-.35,0-.91.22-1.03.72l-.86,3.41c-.07.29-.01.58.17.81.18.23.45.37.75.37h2.22c.27,0,.48.08.6.24.11.14.13.34.09.51l-.31.86c-.08.29-.02.59.16.82s.45.37.75.37h4.22c.43,0,.8-.29.91-.68l.52-1.68c.41-1.56.18-3.03-.67-4.12ZM23.89,5.41l-.46,1.49h-3.67l.17-.49c.16-.59.06-1.16-.28-1.6-.35-.45-.91-.71-1.55-.71h-1.9l.73-2.90h3.90c1.1,0,2.02.41,2.59,1.15.61.8.78,1.89.47,3.06Z" />
      <path d="M22.98,9.75h-4.22c-.43,0-.8.29-.9.67l-.42,1.29c-.16.6-.84,1.11-1.5,1.11h-2.21c-.43,0-.81.29-.92.72l-.86,3.41c-.07.28-.01.58.17.81s.45.37.75.37h3.62c3.04,0,6.05-2.39,6.85-5.41l.55-1.77c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37ZM22.19,12.38c-.67,2.51-3.22,4.54-5.7,4.54h-3.3l.73-2.9h2.02c1.19,0,2.35-.87,2.65-1.99l.36-1.09h3.69l-.44,1.43Z" />
      <path d="M9.92,12.82h-2.67l.58-2.03c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37H2.75c-.16,0-.66,0-.81.58l-.69,2.2L.03,16.93c-.08.29-.02.59.16.82s.45.37.75.37h8.11c.43,0,.81-.29.92-.72l.86-3.41c.07-.28,0-.58-.17-.81s-.45-.36-.75-.36ZM8.86,16.92H1.28l1.12-4.21.6-1.92h3.57l-.57,2.04c-.08.29-.01.58.17.82.18.23.45.37.75.37h2.67l-.73,2.90Z" />
    </g>
  </svg>
);

export default function AssessmentDetail() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('id');
  const vehicleIndex = searchParams.get('vehicle');
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useAlert();
  
  const [assessment, setAssessment] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [vehicles, setVehicles] = useState({});
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingPaymentStatus, setEditingPaymentStatus] = useState(false);
  const [includeNotesInQuote, setIncludeNotesInQuote] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isAssigningCustomer, setIsAssigningCustomer] = useState(false);
  const [customerList, setCustomerList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingMultiVehicleDetails, setEditingMultiVehicleDetails] = useState(false);
  const [editedAssessmentName, setEditedAssessmentName] = useState("");
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [detailsTab, setDetailsTab] = useState("analysis");
  const [isGeneratingPaymentLink, setIsGeneratingPaymentLink] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const openImageViewer = (index) => {
    setSelectedImageIndex(index);
    setIsViewerOpen(true);
  };

  const closeImageViewer = useCallback(() => {
    setIsViewerOpen(false);
  }, []);

  const loadAssessmentDetails = useCallback(async () => {
    if (!assessmentId || assessmentId === 'undefined' || assessmentId === 'null') {
      setAssessment(null);
      setCustomer(null);
      setVehicle(null);
      setVehicles({});
      setUserSettings(null);
      setLoading(false);
      return;
    }

    try {
      const foundAssessment = await base44.entities.Assessment.get(assessmentId);

      if (foundAssessment) {
        if (foundAssessment.is_multi_vehicle && foundAssessment.vehicles) {
          foundAssessment.vehicles = foundAssessment.vehicles.map((v) => ({
            ...v,
            include_notes_in_quote: v.include_notes_in_quote ?? false
          }));
          setEditedAssessmentName(foundAssessment.assessment_name || '');
          setEditedDiscount(foundAssessment.discount_percentage || 0);
        }
        
        setIncludeNotesInQuote(foundAssessment.include_notes_in_quote ?? false);
        setAssessment(foundAssessment);
        setEditedNotes(foundAssessment.notes || '');

        const promises = [];
        const currentUser = await base44.auth.me();

        if (foundAssessment.customer_id) {
          promises.push(base44.entities.Customer.get(foundAssessment.customer_id));
        } else {
          promises.push(Promise.resolve(null));
        }

        let vehicleFetchPromise;
        if (foundAssessment.is_multi_vehicle && foundAssessment.vehicles && foundAssessment.vehicles.length > 0) {
          const vehicleIds = foundAssessment.vehicles.map((v) => v.vehicle_id);
          vehicleFetchPromise = base44.entities.Vehicle.filter({ created_by: currentUser.email }).then((allVehicles) => {
            const multiVehicleMap = {};
            vehicleIds.forEach((id) => {
              const found = allVehicles.find((v) => v.id === id);
              if (found) multiVehicleMap[id] = found;
            });
            return multiVehicleMap;
          });
        } else if (foundAssessment.vehicle_id) {
          vehicleFetchPromise = base44.entities.Vehicle.get(foundAssessment.vehicle_id);
        } else {
          vehicleFetchPromise = Promise.resolve(null);
        }
        promises.push(vehicleFetchPromise);

        if (currentUser && currentUser.email) {
          const settings = await base44.entities.UserSetting.filter({ user_email: currentUser.email });
          promises.push(settings.length > 0 ? Promise.resolve(settings[0]) : Promise.resolve(null));
        } else {
          promises.push(Promise.resolve(null));
        }

        const [foundCustomer, fetchedVehicleData, foundSettings] = await Promise.all(promises);
        setCustomer(foundCustomer);

        if (foundAssessment.is_multi_vehicle) {
          setVehicles(fetchedVehicleData || {});
          setVehicle(null);
        } else {
          setVehicle(fetchedVehicleData);
          setVehicles({});
        }

        setUserSettings(foundSettings);
      } else {
        setAssessment(null);
        setCustomer(null);
        setVehicle(null);
        setVehicles({});
        setUserSettings(null);
      }
    } catch (error) {
      console.error('Error loading assessment details:', error);
      setAssessment(null);
      setCustomer(null);
      setVehicle(null);
      setVehicles({});
      setUserSettings(null);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    let mounted = true;

    const timer = setTimeout(() => {
      if (!mounted) return;

      if (!assessmentId || assessmentId === 'undefined' || assessmentId === 'null') {
        setTimeout(() => {
          if (!mounted) return;
          const finalCheck = searchParams.get('id');
          if (!finalCheck || finalCheck === 'undefined' || finalCheck === 'null') {
            console.warn('No valid assessment ID found after waiting, redirecting to Quotes');
            navigate(createPageUrl("Quotes"));
          }
        }, 200);
      } else {
        setLoading(true);
        loadAssessmentDetails();
      }
    }, 150);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [assessmentId, loadAssessmentDetails, navigate, searchParams]);

  const handleStatusChange = async (newStatus) => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      let updateData = { status: newStatus };
      
      if (newStatus === 'completed' && !assessment.invoice_number && userSettings) {
        const nextInvoiceNumber = userSettings.next_invoice_number || 1;
        const invoicePrefix = userSettings.invoice_prefix || 'INV-';
        const invoiceNumber = `${invoicePrefix}${String(nextInvoiceNumber).padStart(4, '0')}`;
        updateData.invoice_number = invoiceNumber;
        
        await base44.entities.UserSetting.update(userSettings.id, {
          next_invoice_number: nextInvoiceNumber + 1
        });
      }
      
      await base44.entities.Assessment.update(assessment.id, updateData);
      
      // Auto-generate payment link if preference is set
      if (newStatus === 'completed' && userSettings) {
        const preference = userSettings.payment_method_preference || 'Bank Transfer Only';
        const hasPaymentProvider = userSettings.payment_provider && userSettings.payment_provider !== 'None';
        
        if ((preference === 'Payment Links Only' || preference === 'Both') && hasPaymentProvider) {
          try {
            await base44.functions.invoke('generatePaymentLink', {
              assessment_id: assessment.id
            });
          } catch (error) {
            console.error('Failed to auto-generate payment link:', error);
          }
        }
      }
      
      await loadAssessmentDetails();
      setEditingStatus(false);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentStatusChange = async (newPaymentStatus) => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { payment_status: newPaymentStatus });
      await loadAssessmentDetails();
      setEditingPaymentStatus(false);
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!assessment) return;
    if (!window.confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await base44.entities.Assessment.delete(assessment.id);
      navigate(createPageUrl("Quotes"));
    } catch (error) {
      console.error('Error deleting assessment:', error);
      alert('Failed to delete assessment');
      setIsDeleting(false);
    }
  };

  const handleAssignCustomer = async (customerId) => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { customer_id: customerId });
      await loadAssessmentDetails();
      setIsAssigningCustomer(false);
    } catch (error) {
      console.error('Error assigning customer:', error);
      alert('Failed to assign customer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateAndAssignCustomer = async (customerData) => {
    try {
      const newCustomer = await base44.entities.Customer.create(customerData);
      await handleAssignCustomer(newCustomer.id);
      setShowAddCustomerForm(false);
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    }
  };

  const handleSaveNotes = async () => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { 
        notes: editedNotes,
        include_notes_in_quote: includeNotesInQuote 
      });
      await loadAssessmentDetails();
      setEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleNotesInQuote = async () => {
    if (!assessment) return;
    const newValue = !includeNotesInQuote;
    setIncludeNotesInQuote(newValue);
    
    try {
      await base44.entities.Assessment.update(assessment.id, { 
        include_notes_in_quote: newValue 
      });
      setAssessment({ ...assessment, include_notes_in_quote: newValue });
    } catch (error) {
      console.error('Error updating notes setting:', error);
      alert('Failed to update notes setting');
      setIncludeNotesInQuote(!newValue);
    }
  };

  const handleSaveMultiVehicleDetails = async () => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, {
        assessment_name: editedAssessmentName,
        discount_percentage: editedDiscount
      });
      await loadAssessmentDetails();
      setEditingMultiVehicleDetails(false);
    } catch (error) {
      console.error('Error saving details:', error);
      alert('Failed to save details');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!assessment || !userSettings) return;
    setIsGeneratingPaymentLink(true);

    try {
      const response = await base44.functions.invoke('generatePaymentLink', {
        assessment_id: assessment.id
      });

      if (response.data.success && response.data.payment_link) {
        const paymentLink = response.data.payment_link;
        
        // Reload assessment to get the saved payment link
        await loadAssessmentDetails();
        
        // Copy to clipboard
        await navigator.clipboard.writeText(paymentLink);
        
        // Show success message with option to open link
        if (window.confirm(`Payment link generated and copied to clipboard!\n\nProvider: ${response.data.provider}\n\nWould you like to open the link?`)) {
          window.open(paymentLink, '_blank');
        }
      } else {
        alert('Failed to generate payment link. Please check your payment provider settings.');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert(`Failed to generate payment link: ${error.message || 'Please check your payment provider settings and try again.'}`);
    } finally {
      setIsGeneratingPaymentLink(false);
    }
  };

  const handleViewPDF = async () => {
    if (!assessment) return;
    navigate(createPageUrl(`QuotePDF?id=${assessment.id}${vehicleIndex !== null ? `&vehicle=${vehicleIndex}` : ''}&include_notes=${includeNotesInQuote ? 'true' : 'false'}`));
  };

  /**
   * Renders the QuotePDFContent component off-screen, captures it with
   * html2canvas, and returns the PDF as a base64 string (no data: prefix).
   */
  const generatePdfAsBase64 = async () => {
    // Resolve logo URL (fetch to blob for cross-origin safety)
    let logoDisplayUrl = null;
    if (userSettings?.business_logo_url) {
      try {
        const r = await fetch(userSettings.business_logo_url);
        if (r.ok) {
          const blob = await r.blob();
          logoDisplayUrl = URL.createObjectURL(blob);
        }
      } catch (_) {}
    }

    // Create a hidden container
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.zIndex = "-1";
    container.style.width = "794px";
    document.body.appendChild(container);

    // Render the shared PDF component into the hidden container
    let paymentButtonRect = null;
    const root = ReactDOM.createRoot(container);
    await new Promise((resolve) => {
      root.render(
        React.createElement(QuotePDFContent, {
          assessment,
          customer,
          vehicle,
          vehicles,
          userSettings,
          logoDisplayUrl,
          includeNotes: includeNotesInQuote,
          onPaymentButtonRendered: (rect) => { paymentButtonRect = rect; },
        })
      );
      // Allow enough time for fonts and images to fully render
      setTimeout(resolve, 800);
    });

    let pdfBase64 = null;
    try {
      const contentEl = container.firstChild;
      const canvas = await html2canvas(contentEl, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        removeContainer: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      const pdfScaleFactor = pageWidth / contentEl.offsetWidth;

      let yOffset = 0;
      let remainingHeight = imgHeight;
      let firstPage = true;

      while (remainingHeight > 0) {
        if (!firstPage) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -yOffset, imgWidth, imgHeight);

        // Add clickable link annotation over the Pay Now button
        if (paymentButtonRect && assessment.payment_link_url) {
          const refRect = contentEl.getBoundingClientRect();
          const bx = (paymentButtonRect.left - refRect.left) * pdfScaleFactor;
          const by = (paymentButtonRect.top - refRect.top) * pdfScaleFactor;
          const bw = paymentButtonRect.width * pdfScaleFactor;
          const bh = paymentButtonRect.height * pdfScaleFactor;
          if (by + bh > yOffset && by < yOffset + pageHeight) {
            pdf.link(bx, by - yOffset, bw, bh, { url: assessment.payment_link_url });
          }
        }

        yOffset += pageHeight;
        remainingHeight -= pageHeight;
        firstPage = false;
      }

      // Get base64 without the data URI prefix
      pdfBase64 = pdf.output("datauristring").split(",")[1];
    } finally {
      root.unmount();
      document.body.removeChild(container);
      if (logoDisplayUrl) URL.revokeObjectURL(logoDisplayUrl);
    }

    return pdfBase64;
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalDefaults, setEmailModalDefaults] = useState({ to: '', subject: '', message: '' });

  const handleEmail = async () => {
    if (!assessment || !customer) return;
    if (!customer.email) {
      await showAlert('This customer has no email address on file.', 'No Email');
      return;
    }

    const isInvoice = assessment.status === 'completed';
    const ref = getDisplayReference();
    const custName = customer.business_name || customer.name;
    const bizName = userSettings?.business_name || 'Dentifier PDR';
    const replyTo = userSettings?.contact_email || '';
    const total = formatCurrency(assessment.quote_amount || 0, assessment.currency || 'GBP');

    const defaultSubject = isInvoice
      ? `Invoice ${ref} from ${bizName}`
      : `Quote ${ref} from ${bizName}`;

    let defaultMessage = `Hi ${custName},\n\n`;
    if (isInvoice) {
      defaultMessage += `Please find attached your invoice ${ref}.\n\n`;
      if (assessment.payment_link_url) {
        defaultMessage += `You can pay online here: ${assessment.payment_link_url}\n\nIf the button in the attached PDF is not clickable, please copy and paste the link above into your browser.\n\n`;
      } else {
        defaultMessage += `Payment details are included in the attached invoice.\n\n`;
      }
      if (userSettings?.invoice_footer) {
        defaultMessage += `${userSettings.invoice_footer}\n\n`;
      }
    } else {
      defaultMessage += `Please find attached your quote ${ref}.\n\n`;
      defaultMessage += `If you have any questions or would like to proceed with the repair, please don't hesitate to get in touch.\n\n`;
    }
    defaultMessage += `Best regards,\n${bizName}`;
    if (replyTo) defaultMessage += `\n${replyTo}`;

    setEmailModalDefaults({ to: customer.email, subject: defaultSubject, message: defaultMessage });
    setEmailModalOpen(true);
  };

  const handleSendEmail = async (to, cc, subject, message) => {
    const isInvoice = assessment.status === 'completed';
    const ref = getDisplayReference();
    const custName = customer.business_name || customer.name;
    const bizName = userSettings?.business_name || 'Dentifier PDR';
    const replyTo = userSettings?.contact_email || '';

    setIsSendingEmail(true);
    try {
      const pdfBase64 = await generatePdfAsBase64();
      if (!pdfBase64) {
        await showAlert('Failed to generate PDF. Please try again.', 'Error');
        return;
      }

      const response = await base44.functions.invoke('sendQuoteInvoiceEmail', {
        type: isInvoice ? 'invoice' : 'quote',
        to,
        cc,
        subject,
        body: message,
        customer_name: custName,
        business_name: bizName,
        reply_to_email: replyTo,
        pdf_base64: pdfBase64,
        quote_number: assessment.quote_number || ref,
        invoice_number: assessment.invoice_number || ref,
        payment_link_url: isInvoice ? (assessment.payment_link_url || null) : null
      });

      if (response.data?.success) {
        setEmailModalOpen(false);
        await showAlert(`${isInvoice ? 'Invoice' : 'Quote'} emailed successfully to ${to}`, 'Email Sent');
      } else {
        await showAlert(response.data?.error || 'Failed to send email. Please try again.', 'Error');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      await showAlert('Failed to send email. Please try again.', 'Error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    if (!assessment || !assessment.payment_link_url) return;
    
    setCheckingPayment(true);
    try {
      const response = await base44.functions.invoke('checkPaymentStatus', {
        assessment_id: assessment.id
      });

      if (response.data.success) {
        if (response.data.paid) {
          await showAlert(
            'Payment Confirmed',
            `Payment received: ${getCurrencySymbol(assessment.currency || 'GBP')}${response.data.amount_paid?.toFixed(2) || assessment.quote_amount?.toFixed(2)}`
          );
          // Reload to update payment status
          await loadAssessmentDetails();
        } else {
          await showAlert(
            'Payment Pending',
            'Payment has not been completed yet.'
          );
        }
      } else {
        await showAlert(
          'Error',
          `Could not check payment status: ${response.data.error || 'Unknown error'}`
        );
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      await showAlert(
        'Error',
        `Failed to check payment status: ${error.message || 'Please try again later'}`
      );
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleShare = async () => {
    if (!assessment) return;

    const ref = getDisplayReference();
    const custName = customer?.business_name || customer?.name || "";
    const currencySymbol = getCurrencySymbol(assessment.currency || "GBP");
    const isCompleted = assessment.status === 'completed';

    let shareText = `*${isCompleted ? 'Invoice' : 'Quote'}: ${ref}*\n`;
    if (custName) {
      shareText += `*Customer:* ${custName}\n`;
    }

    if (assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0) {
      shareText += `\n*Vehicles & Line Items:*\n\n`;
      assessment.vehicles.forEach((v, idx) => {
        const vInfo = vehicles[v.vehicle_id];
        if (vInfo) {
          shareText += `*${vInfo.year} ${vInfo.make} ${vInfo.model}*\n`;
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
        shareText += `*Vehicle:* ${vehicle.year} ${vehicle.make} ${vehicle.model}\n`;
      }
      shareText += `\n*Line Items:*\n`;
      if (currentLineItems.length > 0) {
        currentLineItems.forEach(item => {
          shareText += `- ${item.description}: ${currencySymbol}${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}\n`;
        });
      } else {
        shareText += `- Paintless Dent Repair Service: ${currencySymbol}${(assessment.quote_amount || 0).toFixed(2)}\n`;
      }
    }

    shareText += `\n*Total Amount:* ${currencySymbol}${(assessment.quote_amount || 0).toFixed(2)}\n`;

    if (assessment.notes && includeNotesInQuote) {
      shareText += `\n*Notes:* ${assessment.notes}\n`;
    }

    // Add payment details for completed invoices
    if (isCompleted && userSettings) {
      const paymentPreference = userSettings.payment_method_preference;
      const showBankTransfer = paymentPreference === 'Bank Transfer Only' || paymentPreference === 'Both';
      const showPaymentLink = (paymentPreference === 'Payment Links Only' || paymentPreference === 'Both') && assessment.payment_link_url;

      if (showBankTransfer || showPaymentLink) {
        shareText += `\n*Payment Details:*\n`;

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
          if (userSettings.bank_iban) {
            shareText += `IBAN: ${userSettings.bank_iban}\n`;
          }
          shareText += `Reference: ${ref}\n`;
        }

        if (showPaymentLink) {
          shareText += `\nPay online: ${assessment.payment_link_url}\n`;
        }
      }

      // Add invoice footer
      if (userSettings.invoice_footer) {
        shareText += `\n${userSettings.invoice_footer}\n`;
      }
    }

    shareText += `\n\nPowered by Dentifier`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Quote ${getDisplayReference()}`,
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

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[currency] || '£';
  };

  const formatCurrency = (amount, currency) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amount?.toFixed(2) || '0.00'}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-slate-700 text-slate-300';
      case 'quoted': return 'bg-blue-600 text-white';
      case 'approved': return 'bg-green-600 text-white';
      case 'completed': return 'bg-purple-600 text-white';
      case 'declined': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getDisplayReference = () => {
    if (!assessment) return '';
    
    if (assessment.status === 'completed') {
      return assessment.invoice_number || assessment.quote_number || `Ref #${assessment.id.slice(-6)}`;
    }
    
    return assessment.quote_number || `Ref #${assessment.id.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-4" />
          <p className="text-slate-400">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Assessment Not Found</h3>
            <p className="text-slate-400 mb-4">The assessment you're looking for doesn't exist.</p>
            <Link to={createPageUrl("Quotes")}>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Quotes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentVehicleData = assessment.is_multi_vehicle && vehicleIndex !== null
    ? assessment.vehicles[parseInt(vehicleIndex)]
    : assessment;

  const currentPhotos = assessment.is_multi_vehicle && vehicleIndex !== null
    ? currentVehicleData?.damage_photos || []
    : assessment.damage_photos || [];

  const currentLineItems = assessment.is_multi_vehicle && vehicleIndex !== null
    ? currentVehicleData?.line_items || []
    : assessment.line_items || [];

  const currentDamageAnalysis = assessment.is_multi_vehicle && vehicleIndex !== null
    ? currentVehicleData?.damage_analysis
    : assessment.damage_analysis;

  const currentCalculationBreakdown = assessment.is_multi_vehicle && vehicleIndex !== null
    ? currentVehicleData?.calculation_breakdown || []
    : assessment.calculation_breakdown || [];

  return (
    <div className="p-4 max-w-md mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Link to={createPageUrl("Quotes")}>
          <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Title Card */}
      <Card className="bg-slate-900 border-slate-800 mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-slate-500 text-xs mb-1">
                {assessment.status === 'completed' ? 'Invoice Ref:' : 'Quote Ref:'} 
              </p>
              <h1 className="text-xl font-bold text-white mb-1">
                {getDisplayReference()}
              </h1>
              {assessment.is_multi_vehicle && assessment.assessment_name && (
                <p className="text-slate-400 text-sm">{assessment.assessment_name}</p>
              )}
              <p className="text-slate-500 text-xs mt-1">
                Created {new Date(assessment.created_date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {editingStatus ? (
                <Select
                  value={assessment.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="draft" className="text-white">Draft</SelectItem>
                    <SelectItem value="quoted" className="text-white">Quoted</SelectItem>
                    <SelectItem value="approved" className="text-white">Approved</SelectItem>
                    <SelectItem value="completed" className="text-white">Completed</SelectItem>
                    <SelectItem value="declined" className="text-white">Declined</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge
                    className={`${getStatusColor(assessment.status)} text-xs`}
                  >
                    {assessment.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingStatus(true)}
                    className="h-6 w-6 text-slate-400 hover:text-white"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
              
              {assessment.status === 'completed' && (
                editingPaymentStatus ? (
                  <Select
                    value={assessment.payment_status || 'pending'}
                    onValueChange={handlePaymentStatusChange}
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="pending" className="text-white">Pending</SelectItem>
                      <SelectItem value="paid" className="text-white">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${assessment.payment_status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'} text-xs`}
                    >
                      {assessment.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPaymentStatus(true)}
                      className="h-6 w-6 text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Total Amount */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">Total Quote Amount</span>
              <span className="text-2xl font-bold text-green-400">
                {formatCurrency(assessment.quote_amount || 0, assessment.currency || 'GBP')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-panel multi-vehicle: flat single-scroll view */}
      {assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0 && !assessment.vehicle_id ? (
        <div className="space-y-4">
          {/* Customer */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  Customer
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const user = await base44.auth.me();
                    const customers = await base44.entities.Customer.filter({ created_by: user.email });
                    setCustomerList(customers);
                    setIsAssigningCustomer(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 text-xs h-auto py-1"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  {customer ? 'Change' : 'Assign'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              {customer ? (
                <div className="space-y-2">
                  {customer.business_name && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-white font-medium">{customer.business_name}</p>
                        <p className="text-slate-400 text-xs">Contact: {customer.name}</p>
                      </div>
                    </div>
                  )}
                  {!customer.business_name && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-white">{customer.name}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${customer.email}`} className="text-blue-400 hover:text-blue-300 text-xs">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a href={`tel:${customer.phone}`} className="text-blue-400 hover:text-blue-300 text-xs">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : !isAssigningCustomer ? (
                <p className="text-slate-400 text-xs">No customer assigned</p>
              ) : null}
              {isAssigningCustomer && (
                showAddCustomerForm ? (
                  <div className="space-y-4">
                    <CustomerForm
                      onSave={handleCreateAndAssignCustomer}
                      onCancel={() => {
                        setShowAddCustomerForm(false);
                        setIsAssigningCustomer(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3 mt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {customerList
                        .filter(c =>
                          c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleAssignCustomer(c.id)}
                            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors"
                          >
                            <p className="text-white font-medium text-sm">
                              {c.business_name || c.name}
                            </p>
                            {c.business_name && (
                              <p className="text-slate-400 text-xs">Contact: {c.name}</p>
                            )}
                            {c.email && (
                              <p className="text-slate-500 text-xs">{c.email}</p>
                            )}
                          </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowAddCustomerForm(true)}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Customer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setIsAssigningCustomer(false); setSearchTerm(""); }}
                        className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          <PerPanelQuoteView
            assessment={assessment}
            onAssessmentUpdate={loadAssessmentDetails}
            formatCurrency={formatCurrency}
            getCurrencySymbol={getCurrencySymbol}
            editedNotes={editedNotes}
            setEditedNotes={setEditedNotes}
            editingNotes={editingNotes}
            setEditingNotes={setEditingNotes}
            handleSaveNotes={handleSaveNotes}
            handleToggleNotesInQuote={handleToggleNotesInQuote}
            includeNotesInQuote={includeNotesInQuote}
            isUpdating={isUpdating}
          />

          {/* Action buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleViewPDF} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
                <FileText className="w-4 h-4 mr-2" />
                {assessment.status === 'completed' ? 'PDF Invoice' : 'PDF Quote'}
              </Button>
              <Button onClick={handleShare} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                <Share2 className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>
            {customer?.email && (
              <Button onClick={handleEmail} disabled={isSendingEmail} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                {isSendingEmail ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Mail className="w-4 h-4 mr-2" />Email {assessment.status === 'completed' ? 'Invoice' : 'Quote'}</>}
              </Button>
            )}
            {assessment.status === 'quoted' && (
              <Button onClick={() => handleStatusChange('approved')} disabled={isUpdating} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Mark as Approved
              </Button>
            )}
            {(assessment.status === 'approved' || assessment.status === 'quoted') && (
              <Button onClick={() => handleStatusChange('completed')} disabled={isUpdating} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Mark as Completed
              </Button>
            )}
            {assessment.status === 'completed' && assessment.payment_link_url && assessment.payment_status !== 'paid' && (
              <Button onClick={handleCheckPaymentStatus} disabled={checkingPayment} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
                {checkingPayment ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</> : <><CreditCard className="w-4 h-4 mr-2" />Check Payment</>}
              </Button>
            )}
          </div>
        </div>
      ) : (

      /* Retail / single-vehicle: tabbed layout (unchanged) */
      <Tabs defaultValue="quote" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-900 mb-4">
          <TabsTrigger value="quote" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
            Quote
          </TabsTrigger>
          <TabsTrigger value="details" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
            Details
          </TabsTrigger>
        </TabsList>

        {/* Quote Tab */}
        <TabsContent value="quote" className="space-y-4">
          {/* Customer */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  Customer
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const user = await base44.auth.me();
                    const customers = await base44.entities.Customer.filter({ created_by: user.email });
                    setCustomerList(customers);
                    setIsAssigningCustomer(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 text-xs h-auto py-1"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  {customer ? 'Change' : 'Assign'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              {customer ? (
                <div className="space-y-2">
                  {customer.business_name && (
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-white font-medium">{customer.business_name}</p>
                        <p className="text-slate-400 text-xs">Contact: {customer.name}</p>
                      </div>
                    </div>
                  )}
                  {!customer.business_name && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-white">{customer.name}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${customer.email}`} className="text-blue-400 hover:text-blue-300 text-xs">
                        {customer.email}
                      </a>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a href={`tel:${customer.phone}`} className="text-blue-400 hover:text-blue-300 text-xs">
                        {customer.phone}
                      </a>
                    </div>
                  )}
                </div>
              ) : !isAssigningCustomer && !customer ? (
                <p className="text-slate-400 text-xs">No customer assigned</p>
              ) : null}
              {isAssigningCustomer && (
                showAddCustomerForm ? (
                  <div className="space-y-4">
                    <CustomerForm
                      onSave={handleCreateAndAssignCustomer}
                      onCancel={() => {
                        setShowAddCustomerForm(false);
                        setIsAssigningCustomer(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3 mt-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {customerList
                        .filter(c => 
                          c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleAssignCustomer(c.id)}
                            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors"
                          >
                            <p className="text-white font-medium text-sm">
                              {c.business_name || c.name}
                            </p>
                            {c.business_name && (
                              <p className="text-slate-400 text-xs">Contact: {c.name}</p>
                            )}
                            {c.email && (
                              <p className="text-slate-500 text-xs">{c.email}</p>
                            )}
                          </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowAddCustomerForm(true)}
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        New Customer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setIsAssigningCustomer(false); setSearchTerm(""); }}
                        className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <FileText className="w-4 h-4 text-yellow-400" />
                  Line Items
                </CardTitle>
                {currentLineItems.length > 0 && (
                  <Link to={createPageUrl(`EditQuote?id=${assessment.id}${vehicleIndex !== null ? `&vehicle=${vehicleIndex}` : ''}`)}>
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 text-xs h-auto py-1">
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              {currentLineItems.length > 0 ? (
                <div className="space-y-3">
                  {currentLineItems.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-800 rounded-lg">
                      <div className="flex justify-between items-start">
                        <p className="text-white font-medium text-sm flex-1">{item.description}</p>
                        <span className="text-white font-medium text-sm ml-2">
                          {formatCurrency(item.total_price, assessment.currency || 'GBP')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs">No quote details available</p>
              )}
            </CardContent>
          </Card>

          {/* Notes Section in Quote Tab */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base">Assessment Notes</CardTitle>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNotes(true)}
                    className="text-blue-400 hover:text-blue-300 text-xs h-auto py-1"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes..."
                    className="bg-slate-800 border-slate-700 text-white text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveNotes}
                      disabled={isUpdating}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingNotes(false);
                        setEditedNotes(assessment.notes || '');
                      }}
                      className="bg-slate-800 border-slate-700 text-white text-sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-400 whitespace-pre-wrap text-xs">
                    {assessment.notes || 'No notes added'}
                  </p>
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <Label htmlFor="include-notes" className="text-white text-sm cursor-pointer">
                      Include notes in PDF quote
                    </Label>
                    <Switch
                      id="include-notes"
                      checked={includeNotesInQuote}
                      onCheckedChange={handleToggleNotesInQuote}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons - At Bottom of Quote Tab */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleViewPDF}
                disabled={isGeneratingPDF}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {assessment.status === 'completed' ? 'PDF Invoice' : 'PDF Quote'}
                  </>
                )}
              </Button>
              <Button
                onClick={handleShare}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>

            {customer?.email && (
              <Button 
                onClick={handleEmail}
                disabled={isSendingEmail}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Email {assessment.status === 'completed' ? 'Invoice' : 'Quote'}
                  </>
                )}
              </Button>
            )}

            {assessment.status === 'completed' && assessment.payment_link_url && assessment.payment_status !== 'paid' && (
              <Button 
                onClick={handleCheckPaymentStatus}
                disabled={checkingPayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {checkingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Check Payment
                  </>
                )}
              </Button>
            )}

            {assessment.status === 'completed' && assessment.payment_status === 'paid' && (
              <Button 
                disabled
                className="w-full bg-green-600 text-white font-semibold opacity-70"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Paid ✓
              </Button>
            )}

            {/* Manual Generate Payment Link Button - Only show if not auto-generating */}
            {assessment.status === 'completed' && 
             userSettings?.payment_provider && 
             userSettings.payment_provider !== 'None' && 
             userSettings.payment_method_preference === 'Bank Transfer Only' && 
             !assessment.payment_link_url && (
              <Button
                onClick={handleGeneratePaymentLink}
                disabled={isGeneratingPaymentLink}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
              >
                {isGeneratingPaymentLink ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                Generate Payment Link
              </Button>
            )}

            {/* Status Change Buttons */}
            {assessment.status === 'draft' && currentLineItems.length === 0 && (
              <Link to={createPageUrl(`EditQuote?id=${assessment.id}${vehicleIndex !== null ? `&vehicle=${vehicleIndex}` : ''}`)}>
                <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Quote Details
                </Button>
              </Link>
            )}

            {assessment.status === 'quoted' && (
              <Button
                onClick={() => handleStatusChange('approved')}
                disabled={isUpdating}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Mark as Approved
              </Button>
            )}

            {(assessment.status === 'approved' || assessment.status === 'quoted') && (
              <Button
                onClick={() => handleStatusChange('completed')}
                disabled={isUpdating}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Mark as Completed
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {/* Vehicle */}
          {!assessment.is_multi_vehicle && vehicle && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white text-base">
                    <Car className="w-4 h-4 text-green-400" />
                    Vehicle
                  </CardTitle>
                  <Link to={createPageUrl(`EditVehicle?id=${vehicle.id}&returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 text-xs h-auto py-1"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="space-y-2">
                  <p className="text-white font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </p>
                  {vehicle.color && (
                    <p className="text-slate-400 text-xs">Color: {vehicle.color}</p>
                  )}
                  {vehicle.license_plate && (
                    <p className="text-slate-400 text-xs">Plate: {vehicle.license_plate}</p>
                  )}
                  {vehicle.vin && (
                    <p className="text-slate-400 text-xs">VIN: {vehicle.vin}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Multi-Vehicle Summary */}
          {assessment.is_multi_vehicle && assessment.vehicles && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white text-base">
                    <Car className="w-4 h-4 text-green-400" />
                    Vehicles ({assessment.vehicles.length})
                  </CardTitle>
                  {!editingMultiVehicleDetails && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMultiVehicleDetails(true)}
                      className="text-blue-400 hover:text-blue-300 text-xs h-auto py-1"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {editingMultiVehicleDetails ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-white text-xs">Assessment Name</Label>
                      <Input
                        value={editedAssessmentName}
                        onChange={(e) => setEditedAssessmentName(e.target.value)}
                        placeholder="E.g., Fleet Service - ABC Company"
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white text-xs">Discount (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editedDiscount}
                        onChange={(e) => setEditedDiscount(parseFloat(e.target.value) || 0)}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveMultiVehicleDetails}
                        disabled={isUpdating}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingMultiVehicleDetails(false);
                          setEditedAssessmentName(assessment.assessment_name || '');
                          setEditedDiscount(assessment.discount_percentage || 0);
                        }}
                        className="bg-slate-800 border-slate-700 text-white text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {assessment.discount_percentage > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-600 text-xs">
                          {assessment.discount_percentage}% Discount Applied
                        </Badge>
                      </div>
                    )}
                    <div className="space-y-2">
                      {assessment.vehicles.map((vehicleData, idx) => {
                        const vehicleInfo = vehicles[vehicleData.vehicle_id];
                        return (
                          <Link
                            key={idx}
                            to={createPageUrl(`AssessmentDetail?id=${assessment.id}&vehicle=${idx}`)}
                            className="block p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-white font-medium text-sm">
                                  Vehicle {idx + 1}
                                  {vehicleInfo && `: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`}
                                </p>
                                <p className="text-slate-400 text-xs">
                                  {formatCurrency(vehicleData.quote_amount || 0, assessment.currency || 'GBP')}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {currentPhotos.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                  <Camera className="w-4 h-4 text-purple-400" />
                  Photos ({currentPhotos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {currentPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => openImageViewer(index)}
                    >
                      <img
                        src={photo}
                        alt={`Damage ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dentifier Analysis & Calculation Breakdown Sub-Tabs */}
          {(currentDamageAnalysis || (currentCalculationBreakdown && currentCalculationBreakdown.length > 0)) && (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0">
                <Tabs value={detailsTab} onValueChange={setDetailsTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800 rounded-b-none">
                    <TabsTrigger 
                      value="analysis" 
                      className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs"
                    >
                      <DentifierIcon className="w-3 h-3 mr-1" />
                      Analysis
                    </TabsTrigger>
                    <TabsTrigger 
                      value="breakdown" 
                      className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-xs"
                    >
                      <Calculator className="w-3 h-3 mr-1" />
                      Breakdown
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="analysis" className="p-4 space-y-3 text-sm">
                    {currentDamageAnalysis ? (() => {
                      const ui = currentDamageAnalysis._ui || {};
                      const score = ui.confidenceScore ?? currentDamageAnalysis.confidence_assessment?.quote_confidence ?? 4;
                      const riskFlags = ui.riskFlags || 
                        (currentDamageAnalysis.risk_assessment?.technical_risks || []).map(t => ({ text: t }));
                      const photoObs = ui.photo_observation;
                      const confidenceCheck = ui.confidence_check;

                      const scoreBg = score >= 5 ? 'bg-green-900/30 border-green-700' : score === 4 ? 'bg-blue-900/30 border-blue-700' : score === 3 ? 'bg-yellow-900/30 border-yellow-700' : score === 2 ? 'bg-orange-900/30 border-orange-700' : 'bg-red-900/30 border-red-700';
                      const scoreText = score >= 5 ? 'text-green-300' : score === 4 ? 'text-blue-300' : score === 3 ? 'text-yellow-300' : score === 2 ? 'text-orange-300' : 'text-red-300';
                      const scoreLabel = score >= 5 ? 'Excellent — repair is well suited to PDR' : score === 4 ? 'Good — no significant concerns identified' : score === 3 ? 'Moderate — repair complexity is higher than standard, proceed with care' : score === 2 ? 'Difficult — this job has significant complexity, assess carefully before proceeding' : 'High risk — consider whether PDR is appropriate for this damage';

                      return (
                        <>
                          {/* Panel & Count */}
                          {currentDamageAnalysis.damage_report && (
                            <div className="grid grid-cols-2 gap-2 pb-2">
                              {currentDamageAnalysis.damage_report.vehicle_panel && (
                                <div>
                                  <p className="text-slate-400 text-xs">Panel(s)</p>
                                  <p className="text-white text-sm">{currentDamageAnalysis.damage_report.vehicle_panel}</p>
                                </div>
                              )}
                              {currentDamageAnalysis.damage_report.dent_count && (
                                <div>
                                  <p className="text-slate-400 text-xs">Count</p>
                                  <p className="text-white text-sm">{currentDamageAnalysis.damage_report.dent_count}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Assessment Confidence */}
                          <div className={`p-3 rounded-lg border ${scoreBg}`}>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Assessment Confidence</p>
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className={`text-2xl font-bold ${scoreText}`}>{score}</span>
                              <span className="text-slate-500 text-xs">/5</span>
                            </div>
                            <p className={`text-xs font-medium ${scoreText}`}>{scoreLabel}</p>
                          </div>

                          {/* Photo vs Inputs */}
                          {confidenceCheck && (
                            <div className="p-3 bg-slate-800 rounded-lg flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Photo vs Inputs</p>
                                <p className="text-white text-xs">{confidenceCheck}</p>
                              </div>
                            </div>
                          )}

                          {/* Risk Flags */}
                          <div className="space-y-1.5">
                            {riskFlags.length === 0 || (riskFlags.length === 1 && riskFlags[0].text?.toLowerCase().includes('no unusual')) ? (
                              <div className="flex items-center gap-2 p-2.5 bg-green-900/20 border border-green-800 rounded-lg">
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                <p className="text-green-300 text-xs">No unusual risks identified for this job.</p>
                              </div>
                            ) : (
                              riskFlags.map((flag, i) => (
                                <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-900/20 border border-amber-700 rounded-lg">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-amber-200 text-xs">{flag.text}</p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Photo Observation */}
                          {photoObs && (
                            <div className="p-3 bg-slate-800 rounded-lg flex items-start gap-2">
                              <Eye className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-slate-400 text-xs mb-1">Photo Observation</p>
                                <p className="text-white text-xs">{photoObs}</p>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })() : (
                      <p className="text-slate-400 text-xs">No analysis available</p>
                    )}
                  </TabsContent>

                  <TabsContent value="breakdown" className="p-4">
                    {currentCalculationBreakdown && currentCalculationBreakdown.length > 0 ? (
                      <CalculationBreakdown
                        breakdownData={currentCalculationBreakdown}
                        currency={assessment.currency || 'GBP'}
                      />
                    ) : (
                      <p className="text-slate-400 text-xs">No calculation breakdown available</p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons - At Bottom of Details Tab */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleViewPDF}
                disabled={isGeneratingPDF}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {assessment.status === 'completed' ? 'PDF Invoice' : 'PDF Quote'}
                  </>
                )}
              </Button>
              <Button
                onClick={handleShare}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>

            {customer?.email && (
              <Button 
                onClick={handleEmail}
                disabled={isSendingEmail}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Email {assessment.status === 'completed' ? 'Invoice' : 'Quote'}
                  </>
                )}
              </Button>
            )}

            {assessment.status === 'completed' && assessment.payment_link_url && assessment.payment_status !== 'paid' && (
              <Button 
                onClick={handleCheckPaymentStatus}
                disabled={checkingPayment}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {checkingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Check Payment
                  </>
                )}
              </Button>
            )}

            {assessment.status === 'completed' && assessment.payment_status === 'paid' && (
              <Button 
                disabled
                className="w-full bg-green-600 text-white font-semibold opacity-70"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Paid ✓
              </Button>
            )}

            {/* Status Change Buttons */}
            {assessment.status === 'draft' && currentLineItems.length === 0 && (
              <Link to={createPageUrl(`EditQuote?id=${assessment.id}${vehicleIndex !== null ? `&vehicle=${vehicleIndex}` : ''}`)}>
                <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Quote Details
                </Button>
              </Link>
            )}

            {assessment.status === 'quoted' && (
              <Button
                onClick={() => handleStatusChange('approved')}
                disabled={isUpdating}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Mark as Approved
              </Button>
            )}

            {(assessment.status === 'approved' || assessment.status === 'quoted') && (
              <Button
                onClick={() => handleStatusChange('completed')}
                disabled={isUpdating}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Mark as Completed
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        initialTo={emailModalDefaults.to}
        initialSubject={emailModalDefaults.subject}
        initialMessage={emailModalDefaults.message}
        onSend={handleSendEmail}
        isSending={isSendingEmail}
        docType={assessment.status === 'completed' ? 'invoice' : 'quote'}
      />

      {/* Image Viewer */}
      <ImageViewer
        isOpen={isViewerOpen}
        onClose={closeImageViewer}
        images={currentPhotos}
        startIndex={selectedImageIndex}
      />
    </div>
  );
}