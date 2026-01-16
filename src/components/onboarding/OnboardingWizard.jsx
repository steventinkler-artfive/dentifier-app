import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAlert } from "@/components/ui/CustomAlert";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BusinessProfileForm from "./BusinessProfileForm";
import BankingPaymentForm from "./BankingPaymentForm";
import PricingQuotingForm from "./PricingQuotingForm";
import TechnicianDetailsForm from "./TechnicianDetailsForm";

const STEPS = [
  { id: 'welcome', title: 'Welcome', section: null },
  { id: 'business', title: 'Business Profile', section: 'business' },
  { id: 'banking', title: 'Banking & Payment', section: 'banking' },
  { id: 'pricing', title: 'Pricing Configuration', section: 'pricing' },
  { id: 'skills', title: 'Technician Profile', section: 'skills' },
  { id: 'branding', title: 'Branding', section: 'branding' },
  { id: 'complete', title: 'Complete', section: null }
];

export default function OnboardingWizard({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const existingSettings = await base44.entities.UserSetting.filter({ user_email: user.email });
      if (existingSettings.length > 0) {
        setSettings(existingSettings[0]);
        setFormData(existingSettings[0]);
      } else {
        // Initialize with defaults
        setFormData({
          contact_email: user.email,
          quote_prefix: 'Q-',
          next_quote_number: 1,
          invoice_prefix: 'INV-',
          next_invoice_number: 1,
          invoice_footer: 'Please pay within 7 days of receipt of invoice.',
          hourly_rate: 70,
          base_cost: 80,
          default_panel_price: 120,
          currency: 'GBP',
          is_vat_registered: false,
          tax_rate: 20,
          years_experience: 2,
          max_supported_dent_size: 'all sizes',
          payment_method_preference: 'Bank Transfer Only',
          payment_provider: 'None',
          works_on_aluminum_panels: false,
          available_pdr_tools: [],
          specialized_damage_skills: [],
          primary_vehicle_types: [],
          pricing_matrix: [
            { damage_type: "Standard Dent", size_range: "26mm - 50mm", base_price: 120 },
            { damage_type: "Standard Dent", size_range: "51mm - 80mm", base_price: 180 },
            { damage_type: "Standard Dent", size_range: "81mm - 120mm", base_price: 240 }
          ]
        });
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveProgress = async (sectionKey, isComplete = false) => {
    setSaving(true);
    try {
      const sectionsCompleted = {
        ...(settings?.sections_completed || {}),
        [sectionKey]: isComplete
      };

      const dataToSave = {
        user_email: user.email,
        ...formData,
        sections_completed: sectionsCompleted,
        onboarding_completed: false
      };

      if (settings?.id) {
        await base44.entities.UserSetting.update(settings.id, dataToSave);
        setSettings({ ...settings, ...dataToSave });
      } else {
        const newSettings = await base44.entities.UserSetting.create(dataToSave);
        setSettings(newSettings);
      }
    } catch (err) {
      console.error("Failed to save progress:", err);
      await showAlert("Failed to save progress. Please try again.", "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    const step = STEPS[currentStep];
    
    if (step.section) {
      const isComplete = validateSection(step.section);
      await saveProgress(step.section, isComplete);
    }

    if (currentStep === 4 && !validateSection('skills')) {
      setShowSkipWarning(true);
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleSkip = async () => {
    const step = STEPS[currentStep];
    if (step.section) {
      await saveProgress(step.section, false);
    }
    
    if (currentStep === 4) {
      setShowSkipWarning(true);
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleSkipAnyway = async () => {
    setShowSkipWarning(false);
    const step = STEPS[currentStep];
    if (step.section) {
      await saveProgress(step.section, false);
    }
    setCurrentStep(prev => prev + 1);
  };

  const validateSection = (section) => {
    switch (section) {
      case 'business':
        return !!(formData.business_name && formData.business_address && formData.contact_email);
      case 'banking':
        return !!(formData.bank_account_name && formData.bank_account_number && formData.bank_sort_code);
      case 'pricing':
        return !!(formData.default_panel_price && formData.pricing_matrix?.length > 0);
      case 'skills':
        const configuredSkills = formData.specialized_damage_skills?.filter(s => s.level !== "Don't do this type") || [];
        return configuredSkills.length >= 3;
      case 'branding':
        return true;
      default:
        return false;
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const sectionsCompleted = {
        business: validateSection('business'),
        banking: validateSection('banking'),
        pricing: validateSection('pricing'),
        skills: validateSection('skills'),
        branding: validateSection('branding')
      };

      const dataToSave = {
        user_email: user.email,
        ...formData,
        sections_completed: sectionsCompleted,
        onboarding_completed: true
      };

      if (settings?.id) {
        await base44.entities.UserSetting.update(settings.id, dataToSave);
      } else {
        await base44.entities.UserSetting.create(dataToSave);
      }

      onComplete();
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      await showAlert("Failed to complete onboarding. Please try again.", "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={true}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome to Dentifier!</h2>
              <p className="text-slate-400">Let's get your account set up for professional PDR quoting. This will take about 5 minutes.</p>
            </div>
            
            <div className="space-y-3 text-left max-w-md mx-auto">
              {[
                'Business Profile',
                'Banking & Payment',
                'Pricing Configuration',
                'Technician Profile',
                'Branding'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  <Circle className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Button onClick={() => setCurrentStep(1)} className="bg-rose-600 hover:bg-rose-700 text-white px-8">
                Get Started
              </Button>
              <button onClick={handleFinish} className="block mx-auto mt-4 text-slate-400 text-sm hover:text-white">
                Skip for now
              </button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <BusinessProfileForm formData={formData} onChange={handleChange} user={user} />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <BankingPaymentForm formData={formData} onChange={handleChange} />
            <p className="text-slate-400 text-sm">Required for receiving customer payments via invoices</p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <PricingQuotingForm formData={formData} onChange={handleChange} />
            <p className="text-slate-400 text-sm">These prices will be used to generate automatic quotes</p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <TechnicianDetailsForm formData={formData} onChange={handleChange} />
            <p className="text-slate-400 text-sm">This information helps calculate accurate confidence scores and complexity assessments</p>
          </div>
        );

      case 5:
        const isProfessional = ['professional', 'founder', 'early_bird'].includes(user?.subscription_tier);
        return (
          <div className="space-y-6 text-center">
            {isProfessional ? (
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Add Your Business Logo</h3>
                {formData.business_logo_url ? (
                  <div className="space-y-3">
                    <div className="w-64 h-32 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden mx-auto">
                      <img src={formData.business_logo_url} alt="Business Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                    <p className="text-green-400">✓ Logo uploaded successfully</p>
                    <p className="text-slate-400 text-sm">Your logo will appear on all quotes and invoices</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-400">Upload your business logo in the Business Profile section</p>
                    <Button onClick={() => setCurrentStep(1)} variant="outline" className="bg-slate-800 border-slate-700 text-white">
                      Go Back to Add Logo
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Want to add your business logo?</h3>
                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-slate-400 text-sm mb-2">Starter</p>
                      <div className="w-full h-16 bg-slate-700 rounded flex items-center justify-center">
                        <span className="text-slate-500 text-xs">Dentifier Logo</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800 border-rose-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-rose-400 text-sm mb-2">Professional</p>
                      <div className="w-full h-16 bg-slate-700 rounded flex items-center justify-center">
                        <span className="text-white text-xs">Your Logo</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Link to={createPageUrl('Upgrade')}>
                  <Button className="bg-rose-600 hover:bg-rose-700 text-white">
                    Upgrade to Professional
                  </Button>
                </Link>
                <button onClick={handleContinue} className="block mx-auto text-slate-400 text-sm hover:text-white">
                  Continue with Starter
                </button>
              </div>
            )}
          </div>
        );

      case 6:
        const sectionsCompleted = settings?.sections_completed || {};
        const completionItems = [
          { key: 'business', label: 'Business profile', isComplete: sectionsCompleted.business },
          { key: 'banking', label: 'Banking & payments', isComplete: sectionsCompleted.banking },
          { key: 'pricing', label: 'Pricing configured', isComplete: sectionsCompleted.pricing },
          { key: 'skills', label: 'Technician skills', isComplete: sectionsCompleted.skills },
          { key: 'branding', label: 'Branding', isComplete: sectionsCompleted.branding }
        ];
        const completedCount = completionItems.filter(i => i.isComplete).length;
        const completionPercent = Math.round((completedCount / completionItems.length) * 100);

        return (
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">You're ready to create quotes!</h2>
              <p className="text-slate-400">Setup completion: {completionPercent}% complete</p>
            </div>

            <div className="space-y-2 text-left max-w-md mx-auto">
              {completionItems.map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-orange-400" />
                    )}
                    <span className="text-slate-300">{item.label}</span>
                  </div>
                  {item.isComplete ? (
                    <span className="text-green-400 text-sm">Complete</span>
                  ) : (
                    <span className="text-orange-400 text-sm">Incomplete</span>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4">
              <Button onClick={handleFinish} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white w-full max-w-xs">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Go to Dashboard
              </Button>
              {completionPercent < 100 && (
                <Link to={createPageUrl('Settings')}>
                  <Button variant="outline" className="bg-slate-800 border-slate-700 text-white w-full max-w-xs">
                    Finish remaining setup
                  </Button>
                </Link>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={true}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-6">
            {currentStep > 0 && currentStep < 6 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-white">{STEPS[currentStep].title}</h3>
                  <span className="text-slate-400 text-sm">Step {currentStep} of 5</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-rose-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {renderStepContent()}

            {currentStep > 0 && currentStep < 6 && (
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <Button
                  onClick={handleContinue}
                  disabled={saving}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {currentStep === 5 ? 'Finish Setup' : 'Continue'}
                </Button>
                <Button
                  onClick={handleSkip}
                  disabled={saving}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                >
                  Skip for now
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Skip Warning Modal */}
      <Dialog open={showSkipWarning} onOpenChange={setShowSkipWarning}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Important: Skills Configuration Required</h3>
                <p className="text-slate-400 text-sm mb-3">
                  Without configuring your skills, your quotes will show:
                </p>
                <ul className="text-slate-400 text-sm space-y-1 list-disc list-inside">
                  <li>Inaccurate confidence scores</li>
                  <li>Incorrect complexity assessments</li>
                  <li>Generic estimates that don't reflect your expertise</li>
                </ul>
                <p className="text-slate-400 text-sm mt-3">
                  This takes 2 minutes and significantly improves quote quality.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowSkipWarning(false)}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
              >
                Go Back and Configure
              </Button>
              <Button
                onClick={handleSkipAnyway}
                variant="outline"
                className="flex-1 bg-slate-800 border-slate-700 text-slate-300"
              >
                Skip Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}