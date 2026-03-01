import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Customer, Vehicle, Assessment, User, UserSetting } from "@/entities/all"; // Added User, UserSetting
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, ArrowLeft, ArrowRight, CheckCircle, Loader2, DollarSign, Users, Car, Calculator, Plus, Save } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAlert } from "@/components/ui/CustomAlert";

import CustomerSelection from "../components/assessment/CustomerSelection";
import VehicleForm from "../components/assessment/VehicleForm";
import PhotoCapture from "../components/assessment/PhotoCapture";
import DamageAnalysis from "../components/assessment/DamageAnalysis";
import QuoteGeneration from "../components/assessment/QuoteGeneration";
import { SkillsIncompleteBanner } from "@/components/onboarding/OnboardingBanners";

const DentifierIcon = ({ className = "" }) => (
  <svg 
    className={className}
    viewBox="0 0 25.24 18.12"
    fill="currentColor"
    style={{ width: '1.75rem', height: '1.25rem' }}
    preserveAspectRatio="xMidYMid meet"
  >
    <g>
      <path d="M3.39,8.1h4.16c.43,0,.8-.29.9-.66l.64-2.14h3.12c.44,0,.81-.29.92-.72l.86-3.41c.07-.28.01-.58-.17-.81-.18-.23-.45-.37-.75-.37h-7.95c-.43,0-.8.29-.91.7l-1.25,4.71-.48,1.5c-.08.29-.02.59.16.82s.45.37.75.37ZM4.1,5.75l1.21-4.54h7.43l-.73,2.9h-3.12c-.43,0-.8.29-.91.7l-.44,1.6-.17.51h-3.63l.37-1.16Z"/>
      <path d="M24.38,1.62c-.8-1.04-2.06-1.62-3.54-1.62h-3.99c-.35,0-.91.22-1.03.72l-.86,3.41c-.07.29-.01.58.17.81.18.23.45.37.75.37h2.22c.27,0,.48.08.6.24.11.14.13.34.09.51l-.31.86c-.08.29-.02.59.16.82s.45.37.75.37h4.22c.43,0,.8-.29.91-.68l.52-1.68c.41-1.56.18-3.03-.67-4.12ZM23.89,5.41l-.46,1.49h-3.67l.17-.49c.16-.59.06-1.16-.28-1.6-.35-.45-.91-.71-1.55-.71h-1.9l.73-2.9h3.9c1.1,0,2.02.41,2.59,1.15.61.8.78,1.89.47,3.06Z"/>
      <path d="M22.98,9.75h-4.22c-.43,0-.8.29-.9.67l-.42,1.29c-.16.6-.84,1.11-1.5,1.11h-2.21c-.43,0-.81.29-.92.72l-.86,3.41c-.07.28-.01.58.17.81s.45.37.75.37h3.62c3.04,0,6.05-2.39,6.85-5.41l.55-1.77c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37ZM22.19,12.38c-.67,2.51-3.22,4.54-5.7,4.54h-3.3l.73-2.9h2.02c1.19,0,2.35-.87,2.65-1.99l.36-1.09h3.69l-.44,1.43Z"/>
      <path d="M9.92,12.82h-2.67l.58-2.03c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37H2.75c-.16,0-.66,0-.81.58l-.69,2.2L.03,16.93c-.08.29-.02.59.16.82s.45.37.75.37h8.11c.43,0,.81-.29.92-.72l.86-3.41c.07-.28,0-.58-.17-.81s-.45-.36-.75-.36ZM8.86,16.92H1.28l1.12-4.21.6-1.92h3.57l-.57,2.04c-.08.29-.01.58.17.82.18.23.45.37.75.37h2.67l-.73,2.9Z"/>
    </g>
  </svg>
);

const STEPS = [
  { id: 'customer', title: 'Customer', icon: Users },
  { id: 'vehicle', title: 'Vehicle', icon: Car },
  { id: 'photos', title: 'Photos', icon: Camera },
  { id: 'analysis', title: 'Dentify', icon: DentifierIcon },
  { id: 'quote', title: 'Quote', icon: Calculator }
];

export default function AssessmentPage() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [searchParams] = useSearchParams();

  const [currentStep, setCurrentStep] = useState('customer');
  const [assessmentData, setAssessmentData] = useState({
    customer: null,
    completedVehicles: [], // Array to store completed vehicles with their data
    currentVehicle: null,   // The vehicle currently being assessed
    currentPhotos: { photos: [], damageItems: [], chargePerPanel: false }, // Updated for structured damage items
    currentAnalysis: null,
    currentQuote: null
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [userSettings, setUserSettings] = useState(null);
  const [loadingUserSettings, setLoadingUserSettings] = useState(true);

  useEffect(() => {
    checkAccess();
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const user = await base44.auth.me();
      const settings = await UserSetting.filter({ user_email: user.email });
      if (settings.length > 0) {
        setUserSettings(settings[0]);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    } finally {
      setLoadingUserSettings(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const checkAccess = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      if (user.subscription_status === 'cancelled') {
        await showAlert(
          "Your subscription has ended. Please reactivate to create new assessments.",
          "Access Restricted"
        );
        navigate(createPageUrl('Dashboard'));
        return;
      }
    } catch (error) {
      console.error("Access check failed:", error);
    } finally {
      setCheckingAccess(false);
    }
  };

  const getCurrentStepIndex = () => STEPS.findIndex(step => step.id === currentStep);

  const handleCustomerSelect = (customer) => {
    setAssessmentData(prev => ({
      ...prev,
      customer: customer
    }));
    setCurrentStep('vehicle');
  };

  const handleVehicleComplete = (vehicle) => {
    setAssessmentData(prev => ({
      ...prev,
      currentVehicle: vehicle
    }));
    setCurrentStep('photos');
  };

  const handlePhotosCapture = (data) => {
    setAssessmentData(prev => ({
      ...prev,
      currentPhotos: data
    }));
    setCurrentStep('analysis');
  };

  const handleAnalysisComplete = async (analysis) => {
    setAssessmentData(prev => ({
      ...prev,
      currentAnalysis: analysis
    }));
    // Auto-generate quote and save — will be triggered by QuoteGeneration's onFinalSave
    setCurrentStep('quote');
  };

  const handleAddAnotherVehicle = (quoteData) => {
    // Save the current vehicle's complete data
    const vehicleData = {
      vehicle_id: assessmentData.currentVehicle.id,
      damage_photos: assessmentData.currentPhotos.photos || [],
      damage_items: assessmentData.currentPhotos.damageItems || [], // Store damage items
      damage_analysis: assessmentData.currentAnalysis,
      line_items: quoteData.lineItems || [],
      calculation_breakdown: quoteData.calculationBreakdown || [], // NEW: Include breakdown
      quote_amount: quoteData.quoteAmount || 0,
      estimated_time_hours: quoteData.estimatedTime || 0,
      notes: quoteData.notes || ''
    };

    setAssessmentData(prev => ({
      ...prev,
      completedVehicles: [...prev.completedVehicles, vehicleData],
      // Reset current vehicle data
      currentVehicle: null,
      currentPhotos: { photos: [], damageItems: [], chargePerPanel: false }, // Reset damage items
      currentAnalysis: null,
      currentQuote: null
    }));

    // Go back to vehicle step to add another vehicle
    setCurrentStep('vehicle');
  };

  const handleFinalSave = async (quoteData) => {
    try {
      const isMultiVehicle = assessmentData.completedVehicles.length > 0;
      
      let assessmentPayload;

      if (isMultiVehicle) {
        // Add the current vehicle to completed vehicles
        const currentVehicleData = {
          vehicle_id: assessmentData.currentVehicle.id,
          damage_photos: assessmentData.currentPhotos.photos || [],
          damage_items: assessmentData.currentPhotos.damageItems || [], // Store damage items
          damage_analysis: assessmentData.currentAnalysis,
          line_items: quoteData.lineItems || [],
          calculation_breakdown: quoteData.calculationBreakdown || [], // NEW: Include breakdown
          quote_amount: quoteData.quoteAmount || 0,
          estimated_time_hours: quoteData.estimatedTime || 0,
          notes: quoteData.notes || ''
        };

        const allVehicles = [...assessmentData.completedVehicles, currentVehicleData];
        const totalQuoteAmount = allVehicles.reduce((sum, v) => sum + (v.quote_amount || 0), 0);

        assessmentPayload = {
          customer_id: assessmentData.customer?.id,
          is_multi_vehicle: true,
          vehicles: allVehicles,
          quote_amount: totalQuoteAmount,
          total_amount: totalQuoteAmount,
          currency: quoteData.currency || 'GBP',
          status: assessmentData.customer ? 'quoted' : 'draft',
          notes: quoteData.notes || '',
          estimated_time_hours: allVehicles.reduce((sum, v) => sum + (v.estimated_time_hours || 0), 0)
        };
      } else {
        // Single vehicle assessment
        assessmentPayload = {
          customer_id: assessmentData.customer?.id,
          is_multi_vehicle: false,
          vehicle_id: assessmentData.currentVehicle?.id,
          damage_photos: assessmentData.currentPhotos.photos || [],
          damage_items: assessmentData.currentPhotos.damageItems || [], // Store damage items
          damage_analysis: assessmentData.currentAnalysis,
          line_items: quoteData.lineItems || [],
          calculation_breakdown: quoteData.calculationBreakdown || [], // NEW: Include breakdown
          quote_amount: quoteData.quoteAmount || 0,
          currency: quoteData.currency || 'GBP',
          status: assessmentData.customer ? 'quoted' : 'draft',
          notes: quoteData.notes || '',
          estimated_time_hours: quoteData.estimatedTime || 0
        };
      }
      
      // Get current user and settings FIRST
      const currentUser = await User.me();
      
      // Fetch the latest user settings
      const userSettingsList = await UserSetting.filter({ user_email: currentUser.email });
      let userSettings = userSettingsList.length > 0 ? userSettingsList[0] : null;

      let formattedQuoteNumber = 'Q-0001'; // Default fallback

      if (userSettings) {
        // Get the current next_quote_number, default to 1 if not set or invalid
        const nextQuoteNumber = parseInt(userSettings.next_quote_number) > 0 ? parseInt(userSettings.next_quote_number) : 1;
        const quotePrefix = userSettings.quote_prefix || 'Q-';
        
        // Format the quote number for THIS assessment
        formattedQuoteNumber = `${quotePrefix}${String(nextQuoteNumber).padStart(4, '0')}`;
        
        console.log(`Assigning quote number: ${formattedQuoteNumber}, Next will be: ${nextQuoteNumber + 1}`);
        
        // CRITICAL: Update the counter FIRST before creating the assessment
        // This makes the numbering more robust against race conditions or failures during assessment creation.
        await UserSetting.update(userSettings.id, {
          next_quote_number: nextQuoteNumber + 1
        });
        
        // Small delay to ensure the update is committed, though not strictly necessary for local DBs, good practice for remote
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } else {
        // Create default settings if they don't exist
        console.log('No user settings found, creating defaults and assigning Q-0001');
        const defaultSettings = {
          user_email: currentUser.email,
          quote_prefix: 'Q-',
          invoice_prefix: 'INV-',
          next_quote_number: 2, // Next one will be Q-0002
          next_invoice_number: 1,
          currency: 'GBP'
        };
        
        await UserSetting.create(defaultSettings);
        formattedQuoteNumber = 'Q-0001'; // The current assessment gets the first number
      }

      // Now assign the generated quote number to the assessment payload
      assessmentPayload.quote_number = formattedQuoteNumber;

      console.log('Creating assessment with payload:', assessmentPayload);
      const savedAssessment = await Assessment.create(assessmentPayload);
      
      // Navigate to the assessment detail page
      navigate(createPageUrl(`AssessmentDetail?id=${savedAssessment.id}`));
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Failed to save assessment. Please try again.');
    }
  };

  const getPhotosData = () => {
    if (typeof assessmentData.currentPhotos === 'object' && 'photos' in assessmentData.currentPhotos) {
      return {
        photos: assessmentData.currentPhotos.photos || [],
        damageItems: assessmentData.currentPhotos.damageItems || [], // Updated to damageItems
        chargePerPanel: assessmentData.currentPhotos.chargePerPanel || false
      };
    }
    return {
      photos: Array.isArray(assessmentData.currentPhotos) ? assessmentData.currentPhotos : [],
      damageItems: [], // Default to empty array for damageItems
      chargePerPanel: false
    };
  };

  const { photos, damageItems, chargePerPanel } = getPhotosData(); // Updated destructuring

  // Auto-advance for per panel pricing
  useEffect(() => {
    if (currentStep === 'analysis' && chargePerPanel && !assessmentData.currentAnalysis) {
      const mockAnalysis = {
        damage_report: {
          vehicle_panel: "Multiple Panels (Per Panel Pricing)",
          dent_location: "As specified in damage items",
          dent_count: damageItems.reduce((sum, item) => sum + (item.dent_count || 1), 0),
          dent_summary: damageItems.map(item => `${item.panel}: ${item.notes}`).join('; ')
        },
        confidence_assessment: {
          quote_confidence: 5,
          additional_notes: "Per panel pricing - no detailed analysis performed"
        }
      };
      setAssessmentData(prev => ({ ...prev, currentAnalysis: mockAnalysis }));
      setCurrentStep('quote');
    }
  }, [currentStep, chargePerPanel, damageItems, assessmentData.currentAnalysis]); // Added damageItems to dependencies

  if (checkingAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {!loadingUserSettings && userSettings && <SkillsIncompleteBanner settings={userSettings} />}
      <div className="mb-6">
        <div className="mb-4">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {assessmentData.completedVehicles.length > 0 ? 
              `Multi-Vehicle Assessment (${assessmentData.completedVehicles.length + 1} vehicles)` : 
              'New Assessment'
            }
          </h1>
          <p className="text-slate-400">
            {currentStep === 'customer' && 'Select or create a customer'}
            {currentStep === 'vehicle' && (assessmentData.completedVehicles.length > 0 ? 
              `Adding vehicle ${assessmentData.completedVehicles.length + 1}` : 
              'Enter vehicle details')}
            {currentStep === 'photos' && 'Be specific about damage characteristics - this helps Dentifier provide accurate analysis.'}
            {currentStep === 'analysis' && 'Dentifier analysis in progress'}
            {currentStep === 'quote' && 'Review and save assessment'}
          </p>
        </div>
      </div>

      {/* Show completed vehicles count if any */}
      {assessmentData.completedVehicles.length > 0 && (
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">
                  {assessmentData.completedVehicles.length} vehicle{assessmentData.completedVehicles.length !== 1 ? 's' : ''} completed
                </span>
              </div>
              <span className="text-slate-400 text-sm">
                Total: £{assessmentData.completedVehicles.reduce((sum, v) => sum + (v.quote_amount || 0), 0).toFixed(0)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Steps */}
      <div className="flex justify-between mb-8 gap-1">
        {STEPS.map((step, index) => {
          const currentIndex = getCurrentStepIndex();
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-200 ${
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-rose-500 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <StepIcon className="w-6 h-6" />
                )}
              </div>
              <span className={`text-xs mt-2 text-center transition-colors duration-200 ${
                isCurrent ? 'text-white font-medium' : 'text-slate-400'
              }`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        {currentStep === 'customer' && (
          <CustomerSelection
            selectedCustomer={assessmentData.customer}
            onCustomerSelect={handleCustomerSelect}
          />
        )}

        {currentStep === 'vehicle' && (
          <VehicleForm
            customer={assessmentData.customer}
            initialVehicle={assessmentData.currentVehicle}
            onVehicleSubmit={handleVehicleComplete}
          />
        )}

        {currentStep === 'photos' && (
          <PhotoCapture
            initialPhotos={photos}
            initialDamageItems={damageItems} // Added initialDamageItems
            initialChargePerPanel={chargePerPanel}
            onPhotosCapture={handlePhotosCapture}
          />
        )}

        {currentStep === 'analysis' && (
          (chargePerPanel && !assessmentData.currentAnalysis) ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Per Panel Pricing Selected</h3>
                <p className="text-slate-400">Skipping detailed analysis, proceeding to quote generation...</p>
              </CardContent>
            </Card>
          ) : (
            <DamageAnalysis
              photos={photos}
              damageItems={damageItems} // Added damageItems prop
              vehicle={assessmentData.currentVehicle}
              onAnalysisComplete={handleAnalysisComplete}
              onGoBack={() => setCurrentStep('photos')}
            />
          )
        )}

        {currentStep === 'quote' && (
          <QuoteGeneration
            customer={assessmentData.customer}
            vehicle={assessmentData.currentVehicle}
            analysis={assessmentData.currentAnalysis}
            photos={photos}
            damageItems={damageItems}
            onAddAnotherVehicle={handleAddAnotherVehicle}
            onFinalSave={handleFinalSave}
            isPerPanelPricing={chargePerPanel}
            isMultiVehicleMode={assessmentData.completedVehicles.length > 0}
            autoSave={!chargePerPanel && assessmentData.completedVehicles.length === 0}
          />
        )}
      </div>
    </div>
  );
}