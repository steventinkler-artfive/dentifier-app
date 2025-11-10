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
import {
  ArrowLeft,
  User as UserIcon,
  Car,
  Camera,
  FileText,
  Mail,
  Phone,
  Calendar,
  Clock,
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
  ChevronRight,
  Save
} from "lucide-react";
import ImageViewer from '../components/ui/ImageViewer';

const DentifierIcon = ({ className = "" }) =>
  <svg
    className={className}
    viewBox="0 0 25.24 18.12"
    fill="currentColor"
    style={{ width: 'auto', height: '1.25rem' }}
    preserveAspectRatio="xMidYMid meet">

    <g>
      <path d="M3.39,8.1h4.16c-.43,0,.8-.29.9-.66l.64-2.14h3.12c.44,0,.81-.29.92-.72l.86-3.41c-.07-.28.01-.58-.17-.81-.18-.23-.45-.37-.75-.37h-7.95c-.43,0-.8.29-.91,0.7l-1.25,4.71-.48,1.5c-.08.29-.02.59.16.82s.45.37.75.37ZM4.1,5.75l1.21-4.54h7.43l-.73,2.9h-3.12c-.43,0-.8.29-.91.70l-.44,1.6-.17.51h-3.63l.37-1.16Z" />
      <path d="M24.38,1.62c-.8-1.04-2.06-1.62-3.54-1.62h-3.99c-.35,0-.91.22-1.03.72l-.86,3.41c-.07.29-.01.58.17.81.18.23.45.37.75.37h2.22c.27,0,.48.08.6.24.11.14.13.34.09.51l-.31.86c-.08.29-.02.59.16.82s.45.37.75.37h4.22c.43,0,.8-.29.91-.68l.52-1.68c.41-1.56.18-3.03-.67-4.12ZM23.89,5.41l-.46,1.49h-3.67l.17-.49c.16-.59.06-1.16-.28-1.6-.35-.45-.91-.71-1.55-.71h-1.9l.73-2.90h3.90c1.1,0,2.02.41,2.59,1.15.61.8.78,1.89.47,3.06Z" />
      <path d="M22.98,9.75h-4.22c-.43,0-.8.29-.9.67l-.42,1.29c-.16.6-.84,1.11-1.5,1.11h-2.21c-.43,0-.81.29-.92.72l-.86,3.41c-.07.28-.01.58.17.81s.45.37.75.37h3.62c3.04,0,6.05-2.39,6.85-5.41l.55-1.77c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37ZM22.19,12.38c-.67,2.51-3.22,4.54-5.7,4.54h-3.3l.73-2.9h2.02c1.19,0,2.35-.87,2.65-1.99l.36-1.09h3.69l-.44,1.43Z" />
      <path d="M9.92,12.82h-2.67l.58-2.03c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37H2.75c-.16,0-.66,0-.81.58l-.69,2.2L.03,16.93c-.08.29-.02.59.16.82s.45.37.75.37h8.11c.43,0,.81-.29.92-.72l.86-3.41c.07-.28,0-.58-.17-.81s-.45-.36-.75-.36ZM8.86,16.92H1.28l1.12-4.21.6-1.92h3.57l-.57,2.04c-.08.29-.01.58.17.82.18.23.45.37.75.37h2.67l-.73,2.90Z" />
    </g>
  </svg>;


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

  if (isMultiVehicle && vehicleIndex !== null && vehicleIndex !== undefined) {
    const vIndex = parseInt(vehicleIndex);
    const vehicleData = assessment.vehicles[vIndex];
    const vehicleDetails = vehicles[vehicleData?.vehicle_id];

    if (!vehicleData || !vehicleDetails) {
      return (
        <div className="p-4 max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Vehicle Not Found</h1>
          <Link to={createPageUrl(`AssessmentDetail?id=${assessmentId}`)}>
            <Button className="pink-gradient text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assessment
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <div className="mb-4">
          <Link to={createPageUrl(`AssessmentDetail?id=${assessmentId}`)}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assessment Overview
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            {vehicleDetails.year} {vehicleDetails.make} {vehicleDetails.model}
          </h1>
          <p className="text-slate-400 text-sm">
            Part of {assessment.assessment_name || 'Multi-Vehicle Assessment'}
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-3">
              {vehicleData.quote_amount && ['draft', 'quoted', 'approved'].includes(assessment.status) ? (
                <Link to={createPageUrl(`EditQuote?id=${assessmentId}&vehicle=${vehicleIndex}`)} className="w-full">
                  <Button variant="outline" className="w-full h-full flex-col justify-center gap-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">
                    <Edit className="w-4 h-4" />
                    <span className="text-xs">Edit Quote</span>
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" disabled className="w-full h-full flex-col justify-center gap-1 border-slate-700 text-slate-500 cursor-not-allowed">
                  <Edit className="w-4 h-4" />
                  <span className="text-xs">Edit Quote</span>
                </Button>
              )}

              <Button
                onClick={() => navigate(createPageUrl(`AssessmentDetail?id=${assessmentId}`))}
                variant="outline"
                className="w-full h-full flex-col justify-center gap-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs">Back to Overview</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {vehicleData.damage_photos && vehicleData.damage_photos.length > 0 &&
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Camera className="w-5 h-5 text-purple-400" />
                Damage Photos ({vehicleData.damage_photos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {vehicleData.damage_photos.map((photo, index) => (
                  <div key={index} className="relative cursor-pointer group" onClick={() => openImageViewer(index)}>
                    <img
                      src={photo}
                      alt={`Damage photo ${index + 1}`}
                      loading="lazy"
                      className="w-full aspect-square object-cover rounded-lg transition-transform duration-300 group-hover:scale-105" />

                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                      <Search className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      Photo {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        }

        {vehicleData.damage_analysis &&
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <DentifierIcon className="text-rose-400" />
                Dentifier Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-pink-400" />
                      <span className="text-slate-300 text-sm">Dent Count</span>
                    </div>
                    <p className="text-white font-bold">
                      {vehicleData.damage_analysis.damage_report?.dent_count || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300 text-sm">Confidence</span>
                    </div>
                    <p className="text-white font-bold">
                      {vehicleData.damage_analysis.confidence_assessment?.quote_confidence || 'N/A'}/5
                    </p>
                  </div>
                </div>

                {vehicleData.damage_analysis.damage_report &&
                  <div>
                    <p className="text-slate-300 text-sm mb-2 font-medium">Damage Summary</p>
                    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                      {vehicleData.damage_analysis.damage_report.dent_summary &&
                        <p className="text-slate-200">{vehicleData.damage_analysis.damage_report.dent_summary}</p>
                      }
                      {vehicleData.damage_analysis.damage_report.dent_details && (
                        <>
                          {vehicleData.damage_analysis.damage_report.dent_details.size_range &&
                            <div>
                              <span className="text-slate-400 text-sm">Size: </span>
                              <span className="text-slate-200">{vehicleData.damage_analysis.damage_report.dent_details.size_range}</span>
                            </div>
                          }
                          {vehicleData.damage_analysis.damage_report.dent_details.depth &&
                            <div>
                              <span className="text-slate-400 text-sm">Depth: </span>
                              <span className="text-slate-200">{vehicleData.damage_analysis.damage_report.dent_details.depth}</span>
                            </div>
                          }
                          {vehicleData.damage_analysis.damage_report.dent_details.access_difficulty &&
                            <div>
                              <span className="text-slate-400 text-sm">Access: </span>
                              <span className="text-slate-200">{vehicleData.damage_analysis.damage_report.dent_details.access_difficulty}</span>
                            </div>
                          }
                        </>
                      )}
                    </div>
                  </div>
                }
                {vehicleData.damage_analysis.risk_assessment?.technical_risks && vehicleData.damage_analysis.risk_assessment.technical_risks.length > 0 &&
                  <div>
                    <p className="text-slate-300 text-sm mb-2 font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      Technical Risks
                    </p>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="space-y-1">
                        {vehicleData.damage_analysis.risk_assessment.technical_risks.map((risk, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                            <span className="text-slate-200">{risk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                }
              </div>
            </CardContent>
          </Card>
        }

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-blue-400" />
              Vehicle Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingVehicleNotes ? (
              <div className="space-y-3">
                <textarea
                  value={vehicleNotes}
                  onChange={(e) => setVehicleNotes(e.target.value)}
                  className="w-full p-3 bg-slate-800 border-slate-700 text-white rounded-lg min-h-[100px]"
                  placeholder="Add notes specific to this vehicle..." />

                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveVehicleNotes}
                    disabled={isUpdating}
                    className="flex-1 pink-gradient text-white">

                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Notes
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingVehicleNotes(false);
                      setVehicleNotes(vehicleData.notes || '');
                    }}
                    variant="outline"
                    className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black">

                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-slate-300 whitespace-pre-wrap mb-3">
                  {vehicleData.notes || 'No notes added for this vehicle yet.'}
                </p>

                {vehicleData.notes &&
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg mb-3">
                    <Label htmlFor="vehicle-notes-toggle" className="text-white font-medium">
                      Include Notes in Quote
                    </Label>
                    <Switch
                      id="vehicle-notes-toggle"
                      checked={vehicleData.include_notes_in_quote || false}
                      onCheckedChange={handleToggleVehicleNotesInQuote}
                      disabled={isUpdating}
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600" />

                  </div>
                }

                <Button
                  onClick={() => {
                    setVehicleNotes(vehicleData.notes || '');
                    setEditingVehicleNotes(true);
                  }}
                  variant="outline"
                  className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black">

                  <Edit className="w-4 h-4 mr-2" />
                  Edit Notes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {vehicleData.quote_amount &&
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Calculator className="w-5 h-5 text-green-400" />
                Quote Details for Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicleData.line_items && vehicleData.line_items.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {vehicleData.line_items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.description}</p>
                        <p className="text-slate-400 text-sm">Qty: {item.quantity} × {formatPrice(item.unit_price, assessment.currency || 'GBP')}</p>
                      </div>
                      <div className="text-white font-medium">
                        {formatPrice(item.total_price, assessment.currency || 'GBP')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-800 rounded-lg mb-4">
                  <p className="text-white font-medium">Paintless Dent Repair Service</p>
                  <p className="text-slate-400 text-sm">No specific line items for this vehicle.</p>
                </div>
              )}

              <div className="text-center border-t border-slate-700 pt-4">
                <p className="text-3xl font-bold text-green-400 mb-2">
                  {formatPrice(vehicleData.quote_amount, assessment.currency || 'GBP')}
                </p>
                <p className="text-slate-400 text-sm">Vehicle Total</p>
              </div>
            </CardContent>
          </Card>
        }

        <ImageViewer
          isOpen={isViewerOpen}
          onClose={closeImageViewer}
          images={vehicleData.damage_photos || []}
          startIndex={selectedImageIndex} />

      </div>
    );

  }

  if (isViewingOverview) {
    const subtotal = assessment.vehicles.reduce((sum, v) => sum + (v.quote_amount || 0), 0);
    const discountAmount = subtotal * (assessment.discount_percentage || 0) / 100;
    const grandTotal = subtotal - discountAmount;
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
          <h1 className="text-2xl font-bold text-white">
            {displayIdentifier}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {assessment.assessment_name || 'Multi-Vehicle Assessment'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`text-xs ${getStatusColor(assessment.status)}`}>
              {assessment.status}
            </Badge>
            <Badge variant="outline" className="text-xs border-blue-800 text-blue-300">
              <Briefcase className="w-3 h-3 mr-1" />
              {assessment.vehicles.length} Vehicle{assessment.vehicles.length !== 1 ? 's' : ''}
            </Badge>
            <span className="text-slate-400 text-sm">
              {new Date(assessment.created_date).toLocaleDateString()}
            </span>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-3">
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => setEditingMultiVehicleDetails(true)}
                variant="outline"
                className="w-full h-full flex-col justify-center gap-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

                <Edit className="w-4 h-4" />
                <span className="text-xs">Edit Details</span>
              </Button>

              <Button
                onClick={() => setEditingStatus(true)}
                variant="outline"
                className="w-full h-full flex-col justify-center gap-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

                <Settings className="w-4 h-4" />
                <span className="text-xs">Change Status</span>
              </Button>

              <Button
                onClick={handleDeleteQuote}
                disabled={isDeleting}
                variant="destructive"
                className="w-full h-full flex-col justify-center gap-1">

                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs">Delete</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {editingMultiVehicleDetails &&
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Edit Assessment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assessment-name" className="text-white">Assessment Name</Label>
                  <Input
                    id="assessment-name"
                    value={editedAssessmentName}
                    onChange={(e) => setEditedAssessmentName(e.target.value)}
                    placeholder="e.g., Weekly Service - Toyota Dealership"
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400" />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount" className="text-white">Discount Percentage</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editedDiscount}
                    onChange={(e) => setEditedDiscount(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white" />

                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveMultiVehicleDetails}
                    disabled={isUpdating}
                    className="flex-1 pink-gradient text-white">

                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingMultiVehicleDetails(false);
                      setEditedAssessmentName(assessment.assessment_name || '');
                      setEditedDiscount(assessment.discount_percentage || 0);
                    }}
                    variant="outline"
                    className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black">

                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        }

        {customer ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <UserIcon className="w-5 h-5 text-blue-400" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-white font-medium">
                  {customer.business_name || customer.name}
                </p>
                {customer.business_name && (
                  <p className="text-slate-400 text-sm">Contact: {customer.name}</p>
                )}
                {customer.email &&
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{customer.email}</span>
                  </div>
                }
                {customer.phone &&
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">{customer.phone}</span>
                  </div>
                }
              </div>
            </CardContent>
          </Card>
        ) : showAddCustomerForm ? (
          <CustomerForm
            onSave={handleSaveNewCustomer}
            onCancel={() => setShowAddCustomerForm(false)} />
        ) : isAssigningCustomer ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <UserPlus className="w-5 h-5 text-blue-400" />
                Assign Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400" />

              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                {filteredCustomers.map((c) => (
                  <div key={c.id} onClick={() => handleAssignCustomer(c)} className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
                    <p className="font-medium text-white">{c.business_name || c.name}</p>
                    {c.business_name && <p className="text-sm text-slate-400">Contact: {c.name}</p>}
                    {c.email && <p className="text-sm text-slate-400">{c.email}</p>}
                  </div>
                ))}
                {filteredCustomers.length === 0 && searchTerm &&
                  <p className="text-slate-400 text-sm text-center">No customers found for "{searchTerm}".</p>
                }
                {customerList.length > 0 && !searchTerm &&
                  <p className="text-slate-400 text-sm text-center">Select a customer from the list or search.</p>
                }
                {customerList.length === 0 && !searchTerm &&
                  <p className="text-slate-400 text-sm text-center">No customers available. Create a new customer from the Customers page.</p>
                }
              </div>
              <Button variant="outline" onClick={() => toggleAssignCustomer(false)} className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300" disabled={isUpdating}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
                <UserIcon className="w-5 h-5" />
                <p className="font-medium">No Customer Selected (Draft)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => toggleAssignCustomer(true)} className="bg-slate-800 hover:bg-white text-white hover:text-black border-slate-700 hover:border-gray-300" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign
                </Button>
                <Button onClick={() => { setShowAddCustomerForm(true); setIsAssigningCustomer(false); }} className="pink-gradient text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {editingVehicle && editedVehicleData && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Edit Vehicle Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveVehicleEdit();
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Make <span className="text-red-400">*</span></Label>
                    <Input
                      value={editedVehicleData.make}
                      onChange={(e) => setEditedVehicleData({...editedVehicleData, make: e.target.value})}
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Model <span className="text-red-400">*</span></Label>
                    <Input
                      value={editedVehicleData.model}
                      onChange={(e) => setEditedVehicleData({...editedVehicleData, model: e.target.value})}
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Year <span className="text-red-400">*</span></Label>
                    <Input
                      type="number"
                      value={editedVehicleData.year}
                      onChange={(e) => setEditedVehicleData({...editedVehicleData, year: e.target.value})}
                      required
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white">Colour</Label>
                    <Input
                      value={editedVehicleData.color}
                      onChange={(e) => setEditedVehicleData({...editedVehicleData, color: e.target.value})}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">License Plate</Label>
                  <Input
                    value={editedVehicleData.license_plate}
                    onChange={(e) => setEditedVehicleData({...editedVehicleData, license_plate: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">VIN</Label>
                  <Input
                    value={editedVehicleData.vin}
                    onChange={(e) => setEditedVehicleData({...editedVehicleData, vin: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingVehicle(false);
                      setEditedVehicleData(null);
                    }}
                    className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 pink-gradient text-white"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {!editingVehicle && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Car className="w-5 h-5 text-green-400" />
                Vehicles in Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assessment.vehicles.map((vehicleData, index) => {
                  const veh = vehicles[vehicleData.vehicle_id];
                  if (!veh) return null;

                  return (
                    <div key={index} className="bg-slate-800 my-2 p-4 rounded-lg hover:bg-slate-700 transition-colors duration-200">
                      <div className="flex items-start justify-between">
                        <p className="text-white font-medium">
                          {veh.year} {veh.make} {veh.model}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVehicleDetails(veh)}
                          className="text-slate-400 hover:text-white hover:bg-slate-700 -mt-2"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <Link
                        to={createPageUrl(`AssessmentDetail?id=${assessmentId}&vehicle=${index}`)}
                        className="block mt-2"
                      >
                        <Button variant="ghost" size="sm" className="w-full text-slate-400 justify-between hover:text-white hover:bg-slate-700 px-2">
                          View Details
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calculator className="w-5 h-5 text-green-400" />
              Total {assessment.status === 'completed' ? 'Invoice' : 'Quote'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal, assessment.currency || 'GBP')}</span>
              </div>
              {assessment.discount_percentage > 0 &&
                <div className="flex justify-between text-slate-300">
                  <span>Discount ({assessment.discount_percentage}%)</span>
                  <span className="text-red-400">-{formatPrice(discountAmount, assessment.currency || 'GBP')}</span>
                </div>
              }
              <div className="border-t border-slate-700 pt-3 flex justify-between">
                <span className="text-xl font-bold text-white">Total</span>
                <span className="text-3xl font-bold text-green-400">
                  {formatPrice(grandTotal, assessment.currency || 'GBP')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <Link to={createPageUrl(`QuotePDF?id=${assessment.id}`)} className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <FileText className="w-4 h-4 mr-2" /> {assessment.status === 'completed' ? 'PDF Invoice' : 'PDF Quote'}
                </Button>
              </Link>
              <Button onClick={handleShareQuote} className="w-full bg-rose-600 hover:bg-rose-700 text-white">
                {copied ? (
                  <>
                    <Copy className="w-4 h-4 mr-2" /> Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {editingStatus &&
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Change Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label htmlFor="status-select" className="text-white">Assessment Status</Label>
                <Select id="status-select" value={assessment.status} onValueChange={handleStatusChange} disabled={isUpdating}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="draft" className="text-white hover:bg-slate-700">Draft</SelectItem>
                    <SelectItem value="quoted" className="text-white hover:bg-slate-700">Quoted/Sent</SelectItem>
                    <SelectItem value="approved" className="text-white hover:bg-slate-700">Approved</SelectItem>
                    <SelectItem value="completed" className="text-white hover:bg-slate-700">Completed</SelectItem>
                    <SelectItem value="declined" className="text-white hover:bg-slate-700">Declined</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setEditingStatus(false)}
                  className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        }

        {assessment.status === 'completed' &&
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Payment Status</p>
                  <Badge className={`text-sm mt-1 ${
                    assessment.payment_status === 'paid' ?
                      'bg-green-900 text-green-300' :
                      'bg-yellow-900 text-yellow-300'}`
                  }>
                    {assessment.payment_status || 'pending'}
                  </Badge>
                </div>
                <Button
                  onClick={() => setEditingPaymentStatus(!editingPaymentStatus)}
                  className="bg-slate-800 hover:bg-white text-white hover:text-black border-slate-700 hover:border-gray-300"
                  variant="outline"
                  size="sm">

                  <CreditCard className="w-4 h-4 mr-2" />
                  Update Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        }

        {editingPaymentStatus &&
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Update Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handlePaymentStatusChange('pending')}
                    disabled={isUpdating}
                    variant={assessment.payment_status === 'pending' ? 'default' : 'outline'}
                    className={assessment.payment_status === 'pending' ?
                      'bg-yellow-600 hover:bg-yellow-700 text-white' :
                      'border-slate-700 text-slate-300 hover:bg-slate-800'
                    }>

                    Pending
                  </Button>
                  <Button
                    onClick={() => handlePaymentStatusChange('paid')}
                    disabled={isUpdating}
                    variant={assessment.payment_status === 'paid' ? 'default' : 'outline'}
                    className={assessment.payment_status === 'paid' ?
                      'bg-green-600 hover:bg-green-700 text-white' :
                      'border-slate-700 text-slate-300 hover:bg-slate-800'
                    }>

                    Paid
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setEditingPaymentStatus(false)}
                  className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        }

        {assessment.status === 'quoted' &&
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Button
                onClick={handleApproveQuote}
                disabled={isUpdating || isDeleting}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">

                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Approving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Approve Quote
                  </>
                )}
              </Button>
              <Button
                onClick={handleDeclineQuote}
                disabled={isUpdating || isDeleting}
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Declining...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark as Declined
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        }

        {assessment.status === 'approved' &&
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Project Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                <CheckCircle className="w-5 h-5" />
                <p className="font-semibold">Quote Approved!</p>
              </div>
              <p className="text-xs text-slate-400 text-center mb-4">
                Ready to schedule the repair work. Mark as complete when finished.
              </p>
              <Button
                onClick={handleCompleteJob}
                disabled={isUpdating || isDeleting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">

                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark as Complete
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        }

        {assessment.status === 'completed' &&
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-purple-400">
                <CheckCircle2 className="w-5 h-5" />
                <p className="font-semibold">Work Completed!</p>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                This repair work has been finished successfully.
              </p>
            </CardContent>
          </Card>
        }

        {assessment.status === 'declined' &&
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-red-400">
                <XCircle className="w-5 h-5" />
                <p className="font-semibold">Quote Declined</p>
              </div>
              <p className="text-xs text-slate-400 mt-2">This quote was marked as declined.</p>
            </CardContent>
          </Card>
        }
      </div>
    );

  }

  const displayIdentifier = getDisplayIdentifier(assessment);

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="mb-4">
        {assessment.job_id ? (
          <Link to={createPageUrl(`ProjectDetail?id=${assessment.job_id}`)}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Project
            </Button>
          </Link>
        ) : (
          <Link to={createPageUrl("Quotes")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quotes
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{displayIdentifier}</h1>
        {assessment.assessment_name && (
          <p className="text-slate-400 text-sm mt-1">{assessment.assessment_name}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <Badge className={`text-xs ${getStatusColor(assessment.status)}`}>
            {assessment.status}
          </Badge>
          <span className="text-slate-400 text-sm">
            {new Date(assessment.created_date).toLocaleDateString()}
          </span>
          {project &&
            <Badge variant="outline" className="text-xs border-blue-800 text-blue-300">
              <Briefcase className="w-3 h-3 mr-1" />
              {project.job_name}
            </Badge>
          }
          {assessment.is_multi_vehicle &&
            <Badge variant="outline" className="text-xs border-purple-800 text-purple-300">
              Multi-Vehicle
            </Badge>
          }
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-3">
            {assessment.quote_amount && ['draft', 'quoted', 'approved'].includes(assessment.status) ? (
              <Link to={createPageUrl(`EditQuote?id=${assessmentId}`)} className="w-full">
                <Button variant="outline" className="w-full h-full flex-col justify-center gap-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">
                  <Edit className="w-4 h-4" />
                  <span className="text-xs">Edit Quote</span>
                </Button>
              </Link>
            ) : (
              <Button variant="outline" disabled className="w-full h-full flex-col justify-center gap-1 border-slate-700 text-slate-500 cursor-not-allowed">
                <Edit className="w-4 h-4" />
                <span className="text-xs">Edit Quote</span>
              </Button>
            )}

            <Button
              onClick={() => setEditingStatus(true)}
              variant="outline"
              className="w-full h-full flex-col justify-center gap-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

              <Settings className="w-4 h-4" />
              <span className="text-xs">Change Status</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {editingStatus &&
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Change Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label htmlFor="status-select" className="text-white">Assessment Status</Label>
              <Select id="status-select" value={assessment.status} onValueChange={handleStatusChange} disabled={isUpdating}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="draft" className="text-white hover:bg-slate-700">Draft</SelectItem>
                  <SelectItem value="quoted" className="text-white hover:bg-slate-700">Quoted/Sent</SelectItem>
                  <SelectItem value="approved" className="text-white hover:bg-slate-700">Approved</SelectItem>
                  <SelectItem value="completed" className="text-white hover:bg-slate-700">Completed</SelectItem>
                  <SelectItem value="declined" className="text-white hover:bg-slate-700">Declined</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setEditingStatus(false)}
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      }

      {assessment.status === 'completed' &&
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Payment Status</p>
                <Badge className={`text-sm mt-1 ${
                  assessment.payment_status === 'paid' ?
                    'bg-green-900 text-green-300' :
                    'bg-yellow-900 text-yellow-300'}`
                }>
                  {assessment.payment_status || 'pending'}
                </Badge>
              </div>
              <Button
                onClick={() => setEditingPaymentStatus(!editingPaymentStatus)}
                className="bg-slate-800 hover:bg-white text-white hover:text-black border-slate-700 hover:border-gray-300"
                variant="outline"
                size="sm">

                <CreditCard className="w-4 h-4 mr-2" />
                Update Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      }

      {editingPaymentStatus &&
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Update Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handlePaymentStatusChange('pending')}
                  disabled={isUpdating}
                  variant={assessment.payment_status === 'pending' ? 'default' : 'outline'}
                  className={assessment.payment_status === 'pending' ?
                    'bg-yellow-600 hover:bg-yellow-700 text-white' :
                    'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }>

                  Pending
                </Button>
                <Button
                  onClick={() => handlePaymentStatusChange('paid')}
                  disabled={isUpdating}
                  variant={assessment.payment_status === 'paid' ? 'default' : 'outline'}
                  className={assessment.payment_status === 'paid' ?
                    'bg-green-600 hover:bg-green-700 text-white' :
                    'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }>

                  Paid
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setEditingPaymentStatus(false)}
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      }

      {assessment.quote_amount &&
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calculator className="w-5 h-5 text-green-400" />
              {assessment.status === 'completed' ? 'Invoice Details' : 'Quote Details'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessment.line_items && assessment.line_items.length > 0 ? (
              <div className="space-y-3 mb-4">
                {assessment.line_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.description}</p>
                      <p className="text-slate-400 text-sm">Qty: {item.quantity} × {formatPrice(item.unit_price, assessment.currency || 'GBP')}</p>
                    </div>
                    <div className="text-white font-medium">
                      {formatPrice(item.total_price, assessment.currency || 'GBP')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-800 rounded-lg mb-4">
                <p className="text-white font-medium">Paintless Dent Repair Service</p>
                <p className="text-slate-400 text-sm">{assessment.notes || 'Standard PDR service'}</p>
              </div>
            )}

            {assessment.notes &&
              <div className="flex items-center justify-between mt-6 mb-4 p-3 bg-slate-800 rounded-lg">
                <Label htmlFor="notes-toggle" className="text-white font-medium">
                  Include Assessment Notes in Quote
                </Label>
                <Switch
                  id="notes-toggle"
                  checked={includeNotesInQuote}
                  onCheckedChange={setIncludeNotesInQuote}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600" />

              </div>
            }

            <div className="text-center border-t border-slate-700 pt-4 mb-4">
              <p className="text-3xl font-bold text-green-400 mb-2">
                {formatPrice(assessment.quote_amount, assessment.currency || 'GBP')}
              </p>
              <p className="text-slate-400 text-sm">Total {assessment.status === 'completed' ? 'Invoice' : 'Quote'} Amount</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl(`QuotePDF?id=${assessment.id}&include_notes=${includeNotesInQuote}`)} className="w-full">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <FileText className="w-4 h-4 mr-2" /> {assessment.status === 'completed' ? 'PDF Invoice' : 'PDF Quote'}
                </Button>
              </Link>
              <Button onClick={handleShareQuote} className="w-full bg-rose-600 hover:bg-rose-700 text-white">
                {copied ? (
                  <>
                    <Copy className="w-4 h-4 mr-2" /> Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      }

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-blue-400" />
            Assessment Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-3">
            Fill in any extra information you would like to refer to or add to the quote.
          </p>
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                className="w-full p-3 bg-slate-800 border-slate-700 text-white rounded-lg min-h-[100px]"
                placeholder="Add general assessment notes..." />

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                  className="flex-1 pink-gradient text-white">

                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Notes
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setEditingNotes(false);
                    setEditedNotes(assessment.notes || '');
                  }}
                  variant="outline"
                  className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black">

                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-slate-300 whitespace-pre-wrap mb-3">
                {assessment.notes || 'No assessment notes added yet.'}
              </p>
              <Button
                onClick={() => {
                  setEditedNotes(assessment.notes || '');
                  setEditingNotes(true);
                }}
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black">

                <Edit className="w-4 h-4 mr-2" />
                Edit Notes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {customer ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserIcon className="w-5 h-5 text-blue-400" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-white font-medium">
                {customer.business_name || customer.name}
              </p>
              {customer.business_name && (
                <p className="text-slate-400 text-sm">Contact: {customer.name}</p>
              )}
              {customer.email &&
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{customer.email}</span>
                </div>
              }
              {customer.phone &&
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{customer.phone}</span>
                </div>
              }
            </div>
          </CardContent>
        </Card>
      ) : showAddCustomerForm ? (
        <CustomerForm
          onSave={handleSaveNewCustomer}
          onCancel={() => setShowAddCustomerForm(false)} />
      ) : isAssigningCustomer ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5 text-blue-400" />
              Assign Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400" />

            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {filteredCustomers.map((c) => (
                <div key={c.id} onClick={() => handleAssignCustomer(c)} className="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer">
                  <p className="font-medium text-white">{c.business_name || c.name}</p>
                  {c.business_name && <p className="text-sm text-slate-400">Contact: {c.name}</p>}
                  {c.email && <p className="text-sm text-slate-400">{c.email}</p>}
                </div>
              ))}
              {filteredCustomers.length === 0 && searchTerm &&
                <p className="text-slate-400 text-sm text-center">No customers found for "{searchTerm}".</p>
              }
              {customerList.length > 0 && !searchTerm &&
                <p className="text-slate-400 text-sm text-center">Select a customer from the list or search.</p>
              }
              {customerList.length === 0 && !searchTerm &&
                <p className="text-slate-400 text-sm text-center">No customers available. Create a new customer from the Customers page.</p>
              }
            </div>
            <Button variant="outline" onClick={() => toggleAssignCustomer(false)} className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300" disabled={isUpdating}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
              <UserIcon className="w-5 h-5" />
              <p className="font-medium">No Customer Selected (Draft)</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => toggleAssignCustomer(true)} className="bg-slate-800 hover:bg-white text-white hover:text-black border-slate-700 hover:border-gray-300" variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign
              </Button>
              <Button onClick={() => { setShowAddCustomerForm(true); setIsAssigningCustomer(false); }} className="pink-gradient text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add New
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingVehicle && editedVehicleData && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Edit Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveVehicleEdit();
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Make <span className="text-red-400">*</span></Label>
                  <Input
                    value={editedVehicleData.make}
                    onChange={(e) => setEditedVehicleData({...editedVehicleData, make: e.target.value})}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Model <span className="text-red-400">*</span></Label>
                  <Input
                    value={editedVehicleData.model}
                    onChange={(e) => setEditedVehicleData({...editedVehicleData, model: e.target.value})}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Year <span className="text-red-400">*</span></Label>
                  <Input
                    type="number"
                    value={editedVehicleData.year}
                    onChange={(e) => setEditedVehicleData({...editedVehicleData, year: e.target.value})}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Colour</Label>
                  <Input
                    value={editedVehicleData.color}
                    onChange={(e) => setEditedVehicleData({...editedVehicleData, color: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">License Plate</Label>
                <Input
                  value={editedVehicleData.license_plate}
                  onChange={(e) => setEditedVehicleData({...editedVehicleData, license_plate: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">VIN</Label>
                <Input
                  value={editedVehicleData.vin}
                  onChange={(e) => setEditedVehicleData({...editedVehicleData, vin: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingVehicle(false);
                    setEditedVehicleData(null);
                  }}
                  className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 pink-gradient text-white"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {vehicle && !editingVehicle ? (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Car className="w-5 h-5 text-green-400" />
              Vehicle Details
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditVehicleDetails(vehicle)}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-white font-medium">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              {vehicle.color && (
                <p className="text-slate-300">Color: {vehicle.color}</p>
              )}
              {vehicle.license_plate && (
                <p className="text-slate-300">License: {vehicle.license_plate}</p>
              )}
              {vehicle.vin && (
                <p className="text-slate-300 text-sm">VIN: {vehicle.vin}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        !editingVehicle && (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-yellow-400 mb-2">
                <Car className="w-5 h-5" />
                <p className="font-medium">No Vehicle Selected</p>
              </div>
              <p className="text-slate-400 text-sm">Vehicle information not provided</p>
            </CardContent>
          </Card>
        )
      )}

      {assessment.damage_photos && assessment.damage_photos.length > 0 &&
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Camera className="w-5 h-5 text-purple-400" />
              Damage Photos ({assessment.damage_photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {assessment.damage_photos.map((photo, index) => (
                <div key={index} className="relative cursor-pointer group" onClick={() => openImageViewer(index)}>
                  <img
                    src={photo}
                    alt={`Damage photo ${index + 1}`}
                    loading="lazy"
                    className="w-full aspect-square object-cover rounded-lg transition-transform duration-300 group-hover:scale-105" />

                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                    <Search className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    Photo {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      }

      {assessment.damage_analysis &&
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
                <TabsTrigger value="analysis" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">AI Analysis</TabsTrigger>
                <TabsTrigger value="breakdown" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Calculation</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-4 mt-4">
                <p className="text-slate-400 text-sm">Analysis for internal reference (Technician)</p>
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

                <div>
                  <p className="text-slate-300 text-sm mb-2">Vehicle Panel</p>
                  <Badge className="bg-blue-900 text-blue-300">
                    {assessment.damage_analysis.damage_report?.vehicle_panel || 'N/A'}
                  </Badge>
                </div>

                <div>
                  <p className="text-slate-300 text-sm mb-2">Location</p>
                  <Badge className="bg-yellow-900 text-yellow-300">
                    {assessment.damage_analysis.damage_report?.dent_location || 'N/A'}
                  </Badge>
                </div>

                {assessment.damage_analysis.damage_report &&
                  <div>
                    <p className="text-slate-300 text-sm mb-2 font-medium">Damage Summary</p>
                    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                      {assessment.damage_analysis.damage_report.dent_summary &&
                        <div>
                          <span className="text-slate-400 text-sm">Summary: </span>
                          <span className="text-slate-200">{assessment.damage_analysis.damage_report.dent_summary}</span>
                        </div>
                      }
                      {assessment.damage_analysis.damage_report.dent_details && (
                        <>
                          {assessment.damage_analysis.damage_report.dent_details.size_range &&
                            <div>
                              <span className="text-slate-400 text-sm">Size: </span>
                              <span className="text-slate-200">{assessment.damage_analysis.damage_report.dent_details.size_range}</span>
                            </div>
                          }
                          {assessment.damage_analysis.damage_report.dent_details.depth &&
                            <div>
                              <span className="text-slate-400 text-sm">Depth: </span>
                              <span className="text-slate-200">{assessment.damage_analysis.damage_report.dent_details.depth}</span>
                            </div>
                          }
                          {assessment.damage_analysis.damage_report.dent_details.access_difficulty &&
                            <div>
                              <span className="text-slate-400 text-sm">Access: </span>
                              <span className="text-slate-200">{assessment.damage_analysis.damage_report.dent_details.access_difficulty}</span>
                            </div>
                          }
                        </>
                      )}
                    </div>
                  </div>
                }

                {assessment.damage_analysis.confidence_assessment &&
                  <div>
                    <p className="text-slate-300 text-sm mb-2 font-medium">Analysis Notes</p>
                    <div className="bg-slate-800 rounded-lg p-3">
                      {assessment.damage_analysis.confidence_assessment.additional_notes &&
                        <p className="text-slate-200 text-sm leading-relaxed">
                          {assessment.damage_analysis.confidence_assessment.additional_notes}
                        </p>
                      }
                      {assessment.damage_analysis.confidence_assessment.repair_suitability &&
                        <div className="mt-2">
                          <span className="text-slate-400 text-base">PDR Suitability: </span>
                          <span className="text-slate-200">{assessment.damage_analysis.confidence_assessment.repair_suitability}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                {assessment.damage_analysis.risk_assessment?.technical_risks && assessment.damage_analysis.risk_assessment.technical_risks.length > 0 &&
                  <div>
                    <p className="text-slate-300 text-sm mb-2 font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      Technical Risks
                    </p>
                    <div className="bg-slate-800 rounded-lg p-3">
                      <div className="space-y-1">
                        {assessment.damage_analysis.risk_assessment.technical_risks.map((risk, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                            <span className="text-slate-200">{risk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                }
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
      }

      {isAssigningProject && !project &&
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Briefcase className="w-5 h-5 text-blue-400" />
              Assign to Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectList.length > 0 ? (
              <div className="space-y-3">
                <Label htmlFor="project-select" className="text-white">Select a Project</Label>
                <Select onValueChange={handleAssignToProject} disabled={isUpdating}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Choose an open project..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {projectList.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-white hover:bg-slate-700">
                        {p.job_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => toggleAssignProject(false)}
                  className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300"
                  disabled={isUpdating}>

                  Cancel
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-slate-400 mb-4">No open projects available. Create one to link assessments.</p>
                <Link to={createPageUrl("CreateProject")}>
                  <Button className="pink-gradient text-white">Create New Project</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      }

      {assessment.status === 'quoted' &&
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Button
              onClick={handleApproveQuote}
              disabled={isUpdating || isDeleting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">

              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Approve Quote
                </>
              )}
            </Button>
            <Button
              onClick={handleDeclineQuote}
              disabled={isUpdating || isDeleting}
              variant="outline"
              className="w-full bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300">

              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Declining...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Mark as Declined
                </>
              )}
            </Button>
            <Button
              onClick={handleDeleteQuote}
              disabled={isUpdating || isDeleting}
              variant="destructive"
              className="w-full">

              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Quote
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      }

      {assessment.status === 'approved' &&
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Project Status</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
              <CheckCircle className="w-5 h-5" />
              <p className="font-semibold">Quote Approved!</p>
            </div>
            <p className="text-xs text-slate-400 text-center mb-4">
              Ready to schedule the repair work. Mark as complete when finished.
            </p>
            <Button
              onClick={handleCompleteJob}
              disabled={isUpdating || isDeleting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold">

              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Complete
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      }

      {assessment.status === 'completed' &&
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-semibold">Work Completed!</p>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              This repair work has been finished successfully.
            </p>
          </CardContent>
        </Card>
      }

      {assessment.status === 'declined' &&
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              <p className="font-semibold">Quote Declined</p>
            </div>
            <p className="text-xs text-slate-400 mt-2">This quote was marked as declined.</p>
          </CardContent>
        </Card>
      }

      <ImageViewer
        isOpen={isViewerOpen}
        onClose={closeImageViewer}
        images={assessment.damage_photos || []}
        startIndex={selectedImageIndex} />

    </div>
  );
}