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

  // ... keep existing code (all handler functions from lines 278-742 of the original file) ...
  
  return <div>Temporarily unavailable - component being restored</div>;
}