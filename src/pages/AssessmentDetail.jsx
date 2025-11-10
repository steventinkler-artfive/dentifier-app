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
import CustomerForm from "../components/customers/CustomerForm";
import CalculationBreakdown from "../components/assessment/CalculationBreakdown";
import ImageViewer from '../components/ui/ImageViewer';
import {
  ArrowLeft,
  User as UserIcon,
  Car,
  Camera,
  FileText,
  Mail,
  Phone,
  Target,
  Check,
  CheckCircle,
  Share2,
  Copy,
  XCircle,
  Trash2,
  CheckCircle2,
  Edit,
  AlertTriangle,
  Search,
  UserPlus,
  Plus,
  Settings,
  Briefcase,
  Loader2,
  CreditCard,
  ArrowRight,
  Calculator,
  Save,
  Clock
} from "lucide-react";

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
  const [assessment, setAssessment] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [vehicles, setVehicles] = useState({});
  const [project, setProject] = useState(null);
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
  const [isAssigningProject, setIsAssigningProject] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [editedNotes, setEditedNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [vehicleNotes, setVehicleNotes] = useState("");
  const [editingVehicleNotes, setEditingVehicleNotes] = useState(false);
  const [editingMultiVehicleDetails, setEditingMultiVehicleDetails] = useState(false);
  const [editedAssessmentName, setEditedAssessmentName] = useState("");
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [editedVehicleData, setEditedVehicleData] = useState(null);

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
      setProject(null);
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
        if (!foundAssessment.is_multi_vehicle) {
          setIncludeNotesInQuote(foundAssessment.include_notes_in_quote ?? false);
        }

        setAssessment(foundAssessment);

        const promises = [];
        if (foundAssessment.customer_id) {
          promises.push(base44.entities.Customer.get(foundAssessment.customer_id));
        } else {
          promises.push(Promise.resolve(null));
        }

        let vehicleFetchPromise;
        if (foundAssessment.is_multi_vehicle && foundAssessment.vehicles && foundAssessment.vehicles.length > 0) {
          const vehicleIds = foundAssessment.vehicles.map((v) => v.vehicle_id);
          vehicleFetchPromise = base44.entities.Vehicle.list().then((allVehicles) => {
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

        if (foundAssessment.job_id) {
          promises.push(base44.entities.Job.get(foundAssessment.job_id));
        } else {
          promises.push(Promise.resolve(null));
        }

        const currentUser = await base44.auth.me();
        if (currentUser && currentUser.email) {
          const settings = await base44.entities.UserSetting.filter({ user_email: currentUser.email });
          promises.push(settings.length > 0 ? Promise.resolve(settings[0]) : Promise.resolve(null));
        } else {
          promises.push(Promise.resolve(null));
        }

        const [foundCustomer, fetchedVehicleData, foundProject, foundSettings] = await Promise.all(promises);
        setCustomer(foundCustomer);
        setProject(foundProject);

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
        setProject(null);
        setUserSettings(null);
      }
    } catch (error) {
      console.error('Error loading assessment details:', error);
      setAssessment(null);
      setCustomer(null);
      setVehicle(null);
      setVehicles({});
      setProject(null);
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

  const handleShareQuote = async () => {
    if (!assessment || (!customer && assessment.status !== 'draft')) return;

    const businessName = userSettings?.business_name || 'Dentifier PDR';
    const contactInfo = userSettings?.contact_email || 'contact@dentifier.com';

    let customerName = 'N/A';
    if (customer) {
      if (customer.business_name && customer.name) {
        customerName = `${customer.business_name} (Contact: ${customer.name})`;
      } else if (customer.business_name) {
        customerName = customer.business_name;
      } else if (customer.name) {
        customerName = customer.name;
      }
    }

    let vehicleInfo = 'N/A';
    let quoteAmount = assessment.quote_amount ? formatPrice(assessment.quote_amount, assessment.currency) : 'N/A';
    let quoteCurrency = assessment.currency || 'GBP';
    let statusBadge = assessment.status === 'draft' ? ' (DRAFT)' : '';

    let lineItemsDetails = '';
    let quoteNotes = '';

    if (assessment.is_multi_vehicle) {
      vehicleInfo = `Multiple Vehicles (${assessment.vehicles.length})`;
      const subtotal = assessment.vehicles.reduce((sum, v) => sum + (v.quote_amount || 0), 0);
      const discountAmount = subtotal * (assessment.discount_percentage || 0) / 100;
      const grandTotal = subtotal - discountAmount;
      quoteAmount = formatPrice(grandTotal, assessment.currency || 'GBP');

      if (assessment.line_items && assessment.line_items.length > 0) {
        lineItemsDetails = assessment.line_items.map((item) =>
          ` - ${item.description}: ${formatPrice(item.total_price, assessment.currency || 'GBP')}`
        ).join('\n');
      } else {
        lineItemsDetails = assessment.vehicles.map((vData, idx) => {
          const vehDetails = vehicles[vData.vehicle_id];
          const vehName = vehDetails ? `${vehDetails.year} ${vehDetails.make} ${vehDetails.model}` : `Vehicle ${idx + 1}`;
          return ` - ${vehName}: ${formatPrice(vData.quote_amount || 0, assessment.currency || 'GBP')}`;
        }).join('\n');
        if (lineItemsDetails === "") lineItemsDetails = " - Multi-vehicle assessment service.";
      }

      const vehicleNotesArray = assessment.vehicles.
        filter((v) => v.include_notes_in_quote && v.notes).
        map((v, idx) => {
          const vehDetails = vehicles[v.vehicle_id];
          const vehName = vehDetails ? `${vehDetails.year} ${vehDetails.make} ${vehDetails.model}` : `Vehicle ${idx + 1}`;
          return `  - ${vehName}: ${v.notes}`;
        });
      if (vehicleNotesArray.length > 0) {
        quoteNotes = `*Notes for vehicles:*\n${vehicleNotesArray.join('\n')}\n-------------------------\n`;
      }

    } else {
      vehicleInfo = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A';
      if (assessment.line_items && assessment.line_items.length > 0) {
        lineItemsDetails = assessment.line_items.map((item) =>
          ` - ${item.description}: ${formatPrice(item.total_price, assessment.currency || 'GBP')}`
        ).join('\n');
      } else {
        lineItemsDetails = ` - Paintless Dent Repair Service: ${quoteAmount}`;
      }

      let notesForSingleVehicle = assessment.notes || '';
      const technicianNoteIndex = notesForSingleVehicle.indexOf('Technician has');
      if (technicianNoteIndex > -1) {
        notesForSingleVehicle = notesForSingleVehicle.substring(0, technicianNoteIndex).trim();
      }
      if (!notesForSingleVehicle) {
        notesForSingleVehicle = 'Paintless Dent Repair';
      }

      if (includeNotesInQuote && notesForSingleVehicle) {
        quoteNotes = `*Assessment Notes:* ${notesForSingleVehicle}\n-------------------------\n`;
      }
    }

    let paymentSection = '';
    if (userSettings?.payment_provider && userSettings.payment_provider !== 'None' && userSettings?.payment_link_template) {
      paymentSection = `\n*Pay Online:* ${userSettings.payment_link_template}\n`;
    }

    const quoteText = `
*${assessment.status === 'completed' ? 'Invoice' : 'Quote'} from ${businessName}${statusBadge}*
-------------------------
*Customer:* ${customerName}
*Vehicle:* ${vehicleInfo}
-------------------------
${quoteNotes}*Line Items:*
${lineItemsDetails}
-------------------------
*Total ${assessment.status === 'completed' ? 'Invoice' : 'Quote'}: ${quoteAmount} ${quoteCurrency}*
${paymentSection}
${assessment.status === 'completed' ? 'Invoice' : 'Quote'} ID: #${assessment.id.slice(-6)}
Date: ${new Date(assessment.created_date).toLocaleDateString()}
Contact: ${contactInfo}

Powered by Dentifier
    `.trim().replace(/\n\n/g, '\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `PDR ${assessment.status === 'completed' ? 'Invoice' : 'Quote'} for ${vehicleInfo}`,
          text: quoteText
        });
        return;
      } catch (error) {
        console.log('Native share failed, falling back to clipboard:', error.message);
      }
    }

    try {
      await navigator.clipboard.writeText(quoteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (clipboardError) {
      console.error('Clipboard copy also failed:', clipboardError);
      try {
        const textArea = document.createElement('textarea');
        textArea.value = quoteText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (finalError) {
        console.error('All sharing methods failed:', finalError);
        alert('Unable to share or copy quote. Please manually copy the quote details from the PDF.');
      }
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { status: newStatus });
      setAssessment((prev) => ({ ...prev, status: newStatus }));
      setEditingStatus(false);
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentStatusChange = async (newPaymentStatus) => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { payment_status: newPaymentStatus });
      setAssessment((prev) => ({ ...prev, payment_status: newPaymentStatus }));
      setEditingPaymentStatus(false);
    } catch (error) {
      console.error("Error updating payment status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignCustomer = async (selectedCustomer) => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, {
        customer_id: selectedCustomer.id,
        status: 'quoted'
      });
      await loadAssessmentDetails();
      setIsAssigningCustomer(false);
    } catch (error) {
      console.error("Error assigning customer:", error);
      alert("Failed to assign customer. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNewCustomer = async (customerData) => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      const newCustomer = await base44.entities.Customer.create(customerData);
      await base44.entities.Assessment.update(assessment.id, {
        customer_id: newCustomer.id,
        status: 'quoted'
      });
      setShowAddCustomerForm(false);
      await loadAssessmentDetails();
    } catch (error) {
      console.error("Error creating and assigning customer:", error);
      alert("Failed to create and assign customer. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleAssignCustomer = async (assign) => {
    if (assign) {
      try {
        const customers = await base44.entities.Customer.list('-created_date');
        setCustomerList(customers);
        setIsAssigningCustomer(true);
        setShowAddCustomerForm(false);
      } catch (error) {
        console.error("Error fetching customers:", error);
        alert("Failed to load customers. Please try again.");
      }
    } else {
      setIsAssigningCustomer(false);
      setShowAddCustomerForm(false);
    }
  };

  const handleAssignToProject = async (projectId) => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { job_id: projectId });
      await loadAssessmentDetails();
      setIsAssigningProject(false);
    } catch (error) {
      console.error("Error assigning to project:", error);
      alert("Failed to assign to project. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleAssignProject = async (assign) => {
    if (assign) {
      try {
        const projects = await base44.entities.Job.list('-created_date');
        setProjectList(projects);
        setIsAssigningProject(true);
      } catch (error) {
      	console.error("Error fetching projects:", error);
        alert("Failed to load projects. Please try again.");
      }
    } else {
      setIsAssigningProject(false);
    }
  };

  const handleApproveQuote = async () => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { status: 'approved' });
      setAssessment((prev) => ({ ...prev, status: 'approved' }));
    } catch (error) {
      console.error("Error approving quote:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeclineQuote = async () => {
    if (!assessment) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { status: 'declined' });
      setAssessment((prev) => ({ ...prev, status: 'declined' }));
    } catch (error) {
      console.error("Error declining quote:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!assessment || !userSettings) return;
    setIsUpdating(true);
    try {
      const updateData = { status: 'completed', payment_status: assessment.payment_status || 'pending' };

      if (!assessment.invoice_number) {
        const nextInvoiceNumber = userSettings.next_invoice_number || 1;
        const invoicePrefix = userSettings.invoice_prefix || 'INV-';
        const formattedInvoiceNumber = `${invoicePrefix}${String(nextInvoiceNumber).padStart(4, '0')}`;
        updateData.invoice_number = formattedInvoiceNumber;

        await base44.entities.UserSetting.update(userSettings.id, {
          next_invoice_number: nextInvoiceNumber + 1
        });

        setUserSettings({
          ...userSettings,
          next_invoice_number: nextInvoiceNumber + 1
        });
      }

      await base44.entities.Assessment.update(assessment.id, updateData);
      setAssessment((prev) => ({ ...prev, ...updateData }));
    } catch (error) {
      console.error("Error completing job:", error);
      alert("Failed to mark job as complete. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!assessment) return;

    if (window.confirm("Are you sure you want to permanently delete this assessment? This action cannot be undone.")) {
      setIsDeleting(true);
      try {
        await base44.entities.Assessment.delete(assessment.id);
        navigate(createPageUrl("Quotes"));
      } catch (error) {
        console.error("Error deleting quote:", error);
        alert("Failed to delete the assessment. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSaveNotes = async () => {
    if (!assessment) return;
    if (editedNotes === (assessment.notes || '')) {
      setEditingNotes(false);
      return;
    }
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { notes: editedNotes });
      setAssessment((prev) => ({ ...prev, notes: editedNotes }));
      setEditingNotes(false);
    } catch (error) {
      console.error("Error updating assessment notes:", error);
      alert("Failed to save notes. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveVehicleNotes = async () => {
    if (!assessment || vehicleIndex === null) return;

    const vIndex = parseInt(vehicleIndex);
    const currentVehicleData = assessment.vehicles[vIndex];

    if (vehicleNotes === (currentVehicleData?.notes || '')) {
      setEditingVehicleNotes(false);
      return;
    }

    const updatedVehicles = assessment.vehicles.map((v, idx) =>
      idx === vIndex ? { ...v, notes: vehicleNotes } : v
    );

    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { vehicles: updatedVehicles });
      setAssessment((prev) => ({ ...prev, vehicles: updatedVehicles }));
      setEditingVehicleNotes(false);
    } catch (error) {
      console.error("Error updating specific vehicle notes:", error);
      alert("Failed to save vehicle notes. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleVehicleNotesInQuote = async (includeNotes) => {
    if (!assessment || vehicleIndex === null) return;

    const vIndex = parseInt(vehicleIndex);
    const updatedVehicles = assessment.vehicles.map((v, idx) =>
      idx === vIndex ? { ...v, include_notes_in_quote: includeNotes } : v
    );

    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, { vehicles: updatedVehicles });
      setAssessment((prev) => ({ ...prev, vehicles: updatedVehicles }));
    } catch (error) {
      console.error("Error updating vehicle notes toggle:", error);
      alert("Failed to update notes setting. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveMultiVehicleDetails = async () => {
    if (!assessment || !assessment.is_multi_vehicle) return;
    setIsUpdating(true);
    try {
      await base44.entities.Assessment.update(assessment.id, {
        assessment_name: editedAssessmentName,
        discount_percentage: parseFloat(editedDiscount) || 0
      });
      setAssessment((prev) => ({
        ...prev,
        assessment_name: editedAssessmentName,
        discount_percentage: parseFloat(editedDiscount) || 0
      }));
      setEditingMultiVehicleDetails(false);
    } catch (error) {
      console.error("Error updating multi-vehicle assessment details:", error);
      alert("Failed to save details. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditVehicleDetails = (vehicleToEdit) => {
    setEditedVehicleData({
      id: vehicleToEdit.id,
      customer_id: vehicleToEdit.customer_id || assessment.customer_id,
      make: vehicleToEdit.make || '',
      model: vehicleToEdit.model || '',
      year: vehicleToEdit.year || '',
      color: vehicleToEdit.color || '',
      license_plate: vehicleToEdit.license_plate || '',
      vin: vehicleToEdit.vin || ''
    });
    setEditingVehicle(true);
  };

  const handleSaveVehicleEdit = async () => {
    if (!editedVehicleData || !editedVehicleData.id) return;
    setIsUpdating(true);
    try {
      const dataToUpdate = { ...editedVehicleData };
      for (const key in dataToUpdate) {
        if (dataToUpdate[key] === '') {
          dataToUpdate[key] = null;
        }
      }
      if (dataToUpdate.year !== null) {
        dataToUpdate.year = parseInt(dataToUpdate.year, 10);
        if (isNaN(dataToUpdate.year)) {
          dataToUpdate.year = null;
        }
      }

      await base44.entities.Vehicle.update(editedVehicleData.id, dataToUpdate);
      await loadAssessmentDetails();
      setEditingVehicle(false);
      setEditedVehicleData(null);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      alert("Failed to update vehicle. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-slate-700 text-slate-300';
      case 'quoted': return 'bg-blue-900 text-blue-300';
      case 'approved': return 'bg-green-900 text-green-300';
      case 'completed': return 'bg-purple-900 text-purple-300';
      case 'declined': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-700 text-gray-300';
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

  const formatPrice = (amount, currency) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${Math.round(amount)}`;
  };

  const getDisplayIdentifier = (assessment) => {
    return assessment.invoice_number || assessment.quote_number || `#${assessment.id.slice(-6)}`;
  };

  const filteredCustomers = customerList.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-4 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Assessment Not Found</h1>
        <Link to={createPageUrl("Quotes")}>
          <Button className="pink-gradient text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        </Link>
      </div>
    );
  }

  const isMultiVehicle = assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0;
  const isViewingOverview = isMultiVehicle && vehicleIndex === null;

  // Render single vehicle assessment
  const displayIdentifier = getDisplayIdentifier(assessment);

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="mb-4">
        <Link to={createPageUrl("Quotes")}>
          <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{displayIdentifier}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge className={`text-xs ${getStatusColor(assessment.status)}`}>
            {assessment.status}
          </Badge>
          <span className="text-slate-400 text-sm">
            {new Date(assessment.created_date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {assessment.damage_analysis && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DentifierIcon className="text-rose-400" />
              Dentifier Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="analysis" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  AI Analysis
                </TabsTrigger>
                <TabsTrigger value="breakdown" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  Calculation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-pink-400" />
                      <span className="text-slate-300 text-sm">Dent Count</span>
                    </div>
                    <p className="text-white font-bold">
                      {assessment.damage_analysis.damage_report?.dent_count || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300 text-sm">Confidence</span>
                    </div>
                    <p className="text-white font-bold">
                      {assessment.damage_analysis.confidence_assessment?.quote_confidence || 'N/A'}/5
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="breakdown" className="mt-4">
                {assessment.calculation_breakdown && assessment.calculation_breakdown.length > 0 ? (
                  <CalculationBreakdown
                    breakdownData={assessment.calculation_breakdown}
                    currency={assessment.currency}
                  />
                ) : (
                  <p className="text-slate-400 text-sm text-center py-4">No calculation breakdown available</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <ImageViewer
        isOpen={isViewerOpen}
        onClose={closeImageViewer}
        images={assessment.damage_photos || []}
        startIndex={selectedImageIndex}
      />
    </div>
  );
}