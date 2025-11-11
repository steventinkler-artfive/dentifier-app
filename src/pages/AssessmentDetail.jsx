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
  Settings as SettingsIcon,
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
        if (!foundAssessment.is_multi_vehicle) {
          setIncludeNotesInQuote(foundAssessment.include_notes_in_quote ?? false);
        }

        setAssessment(foundAssessment);
        setEditedNotes(foundAssessment.notes || '');

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

        const currentUser = await base44.auth.me();
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
      await base44.entities.Assessment.update(assessment.id, { notes: editedNotes });
      await loadAssessmentDetails();
      setEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Failed to save notes');
    } finally {
      setIsUpdating(false);
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

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    <div className="p-4 max-w-md mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to={createPageUrl("Quotes")}>
          <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
          </Button>
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
      </div>

      {/* Title and Status */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {assessment.invoice_number || assessment.quote_number || `Assessment #${assessment.id.slice(-6)}`}
            </h1>
            {assessment.is_multi_vehicle && assessment.assessment_name && (
              <p className="text-slate-400 text-sm mt-1">{assessment.assessment_name}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {editingStatus ? (
              <Select
                value={assessment.status}
                onValueChange={handleStatusChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
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
              <Badge
                className={`${getStatusColor(assessment.status)} cursor-pointer`}
                onClick={() => setEditingStatus(true)}
              >
                {assessment.status}
              </Badge>
            )}
            
            {assessment.status === 'completed' && (
              editingPaymentStatus ? (
                <Select
                  value={assessment.payment_status || 'pending'}
                  onValueChange={handlePaymentStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pending" className="text-white">Pending</SelectItem>
                    <SelectItem value="paid" className="text-white">Paid</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge
                  className={`${assessment.payment_status === 'paid' ? 'bg-green-600' : 'bg-yellow-600'} cursor-pointer`}
                  onClick={() => setEditingPaymentStatus(true)}
                >
                  {assessment.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
                </Badge>
              )
            )}
          </div>
        </div>
      </div>

      {/* Customer Section */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <UserIcon className="w-5 h-5 text-blue-400" />
              Customer
            </CardTitle>
            {!customer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const customers = await base44.entities.Customer.list();
                  setCustomerList(customers);
                  setIsAssigningCustomer(true);
                }}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Assign
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {customer ? (
            <div className="space-y-2">
              {customer.business_name && (
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">{customer.business_name}</p>
                    <p className="text-slate-400 text-sm">Contact: {customer.name}</p>
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
                  <a href={`mailto:${customer.email}`} className="text-blue-400 hover:text-blue-300">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${customer.phone}`} className="text-blue-400 hover:text-blue-300">
                    {customer.phone}
                  </a>
                </div>
              )}
            </div>
          ) : isAssigningCustomer ? (
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
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-slate-800 border-slate-700 text-white"
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
                        <p className="text-white font-medium">
                          {c.business_name || c.name}
                        </p>
                        {c.business_name && (
                          <p className="text-slate-400 text-sm">Contact: {c.name}</p>
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
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Customer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAssigningCustomer(false)}
                    className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )
          ) : (
            <p className="text-slate-400 text-sm">No customer assigned</p>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Section */}
      {!assessment.is_multi_vehicle && vehicle && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Car className="w-5 h-5 text-green-400" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-white font-medium">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
              {vehicle.color && (
                <p className="text-slate-400 text-sm">Color: {vehicle.color}</p>
              )}
              {vehicle.license_plate && (
                <p className="text-slate-400 text-sm">Plate: {vehicle.license_plate}</p>
              )}
              {vehicle.vin && (
                <p className="text-slate-400 text-sm">VIN: {vehicle.vin}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Vehicle Summary */}
      {assessment.is_multi_vehicle && assessment.vehicles && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-white">
                <Car className="w-5 h-5 text-green-400" />
                Multi-Vehicle Assessment
              </CardTitle>
              {!editingMultiVehicleDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingMultiVehicleDetails(true)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingMultiVehicleDetails ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Assessment Name</Label>
                  <Input
                    value={editedAssessmentName}
                    onChange={(e) => setEditedAssessmentName(e.target.value)}
                    placeholder="E.g., Fleet Service - ABC Company"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Discount (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editedDiscount}
                    onChange={(e) => setEditedDiscount(parseFloat(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveMultiVehicleDetails}
                    disabled={isUpdating}
                    className="flex-1 bg-green-600 hover:bg-green-700"
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
                    className="bg-slate-800 border-slate-700 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-slate-400">
                  {assessment.vehicles.length} vehicles in this assessment
                </p>
                {assessment.discount_percentage > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-600">
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
                            <p className="text-white font-medium">
                              Vehicle {idx + 1}
                              {vehicleInfo && `: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`}
                            </p>
                            <p className="text-slate-400 text-sm">
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Camera className="w-5 h-5 text-purple-400" />
              Damage Photos ({currentPhotos.length})
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

      {/* Dentifier Analysis */}
      {currentDamageAnalysis && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DentifierIcon className="w-5 h-5 text-rose-400" />
              Dentifier Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentDamageAnalysis.damage_report && (
              <div className="space-y-3">
                <div>
                  <p className="text-slate-400 text-sm">Panel</p>
                  <p className="text-white">
                    {currentDamageAnalysis.damage_report.vehicle_panel || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Location</p>
                  <p className="text-white">
                    {currentDamageAnalysis.damage_report.dent_location || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Count</p>
                  <p className="text-white">
                    {currentDamageAnalysis.damage_report.dent_count || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Summary</p>
                  <p className="text-white">
                    {currentDamageAnalysis.damage_report.dent_summary || 'N/A'}
                  </p>
                </div>
                {currentDamageAnalysis.damage_report.dent_details && (
                  <div className="space-y-2 pt-2 border-t border-slate-700">
                    {currentDamageAnalysis.damage_report.dent_details.size_range && (
                      <div>
                        <p className="text-slate-400 text-sm">Size Range</p>
                        <p className="text-white">
                          {currentDamageAnalysis.damage_report.dent_details.size_range}
                        </p>
                      </div>
                    )}
                    {currentDamageAnalysis.damage_report.dent_details.depth && (
                      <div>
                        <p className="text-slate-400 text-sm">Depth</p>
                        <p className="text-white">
                          {currentDamageAnalysis.damage_report.dent_details.depth}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {currentDamageAnalysis.confidence_assessment && (
              <div className="p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-400 text-sm">Confidence</p>
                  <Badge className="bg-blue-600">
                    {currentDamageAnalysis.confidence_assessment.quote_confidence}/5
                  </Badge>
                </div>
                <p className="text-slate-400 text-sm">Suitability</p>
                <p className="text-white">
                  {currentDamageAnalysis.confidence_assessment.repair_suitability || 'N/A'}
                </p>
                {currentDamageAnalysis.confidence_assessment.additional_notes && (
                  <div className="mt-2">
                    <p className="text-slate-400 text-sm">Notes</p>
                    <p className="text-white text-sm">
                      {currentDamageAnalysis.confidence_assessment.additional_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quote Details */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-yellow-400" />
              Quote Details
            </CardTitle>
            {currentLineItems.length > 0 && (
              <Link to={createPageUrl(`EditQuote?id=${assessment.id}${vehicleIndex !== null ? `&vehicle=${vehicleIndex}` : ''}`)}>
                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentLineItems.length > 0 ? (
            <>
              <div className="space-y-3">
                {currentLineItems.map((item, index) => (
                  <div key={index} className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-white font-medium mb-1">{item.description}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">
                        {item.quantity} × {formatCurrency(item.unit_price, assessment.currency || 'GBP')}
                      </span>
                      <span className="text-white font-medium">
                        {formatCurrency(item.total_price, assessment.currency || 'GBP')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold text-lg">Total</span>
                  <span className="text-2xl font-bold text-green-400">
                    {formatCurrency(
                      assessment.is_multi_vehicle && vehicleIndex !== null
                        ? currentVehicleData?.quote_amount || 0
                        : assessment.quote_amount || 0,
                      assessment.currency || 'GBP'
                    )}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-sm">No quote details available</p>
          )}
        </CardContent>
      </Card>

      {/* Calculation Breakdown */}
      {currentCalculationBreakdown && currentCalculationBreakdown.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Calculation Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CalculationBreakdown
              breakdownData={currentCalculationBreakdown}
              currency={assessment.currency || 'GBP'}
            />
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Notes</CardTitle>
            {!editingNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingNotes(true)}
                className="text-blue-400 hover:text-blue-300"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={4}
                placeholder="Add notes..."
                className="bg-slate-800 border-slate-700 text-white"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                  className="flex-1 bg-green-600 hover:bg-green-700"
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
                  className="bg-slate-800 border-slate-700 text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 whitespace-pre-wrap">
              {assessment.notes || 'No notes added'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3 pb-4">
        {assessment.status !== 'draft' && (
          <Link 
            to={createPageUrl(`QuotePDF?id=${assessment.id}${vehicleIndex !== null ? `&vehicle=${vehicleIndex}` : ''}`)}
            className="block"
          >
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <FileText className="w-4 h-4 mr-2" />
              View {assessment.status === 'completed' ? 'Invoice' : 'Quote'} PDF
            </Button>
          </Link>
        )}

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