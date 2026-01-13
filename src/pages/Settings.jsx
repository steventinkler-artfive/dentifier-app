import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { UserSetting } from "@/entities/UserSetting";
import { GlobalSetting } from "@/entities/GlobalSetting";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, AlertTriangle, Loader2, Building, UserCircle, Wrench, Upload, CreditCard, Mail, Shield } from "lucide-react";
import PricingMatrix from "../components/settings/PricingMatrix";
import { useAlert } from "@/components/ui/CustomAlert";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const DEFAULT_DENTIFIER_LOGO = "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";

// Custom Dentifier D Icon Component
const DentifierIcon = ({ className = "" }) => (
  <svg 
    className={className}
    viewBox="0 0 24.68 17.56" 
    fill="currentColor"
    style={{ height: '1rem', width: 'auto' }}
    preserveAspectRatio="xMidYMid meet"
  >
    <path d="M3.39,8.1h4.16c-.43,0,.8-.29,.9-.66l.64-2.14h3.12c-.44,0,.81-.29,.92-.72l.86-3.41c-.07-.28.01-.58-.17-.81-.18-.23-.45-.37-.75-.37h-7.95c-.43,0-.8.29-.91-.7l-1.25,4.71-.48,1.5c-.08-.29-.02-.59.16-.82s.45-.37-.75-.37ZM4.1,5.75l1.21-4.54h7.43l-.73,2.9h-3.12c-.43,0-.8.29-.91-.7l-.44,1.6-.17-.51h-3.63l.37-1.16Z"/>
    <path d="M23.81,1.62c-.8-1.04-2.06-1.62-3.54-1.62h-3.99c-.35,0-.91.22-.1.03.72l-.86,3.41c-.07.29-.01.58.17.81.18.23.45-.37.75-.37h2.22c-.27,0-.48.08-.6.24-.11.14-.13.34-.09.51l-.31.86c-.08.29-.02.59.16.82s.45-.37-.75-.37h4.22c-.43,0-.8-.29-.91-.68l.52-1.68c-.41-1.56.18-3.03-.67-4.12ZM23.33,5.41l-.46,1.49h-3.67l.17-.49c-.16-.59.06-1.16-.28-1.6-.35-.45-.91-.71-1.55-.71h-1.9l.73-2.9h3.9c1.1,0,2.02.41,2.59,1.15.61.8.78,1.89-.47,3.06Z"/>
    <path d="M22.41,9.18h-4.22c-.43,0-.8.29-.9-.67l-.42,1.29c-.16.6-.84,1.11-1.5,1.11h-2.21c-.43,0-.81.29-.92.72l-.86,3.41c-.07.28-.01.58.17.81s.45.37-.75.37h3.62c3.04,0,6.05-2.39,6.85-5.41l.55-1.77c-.08.29-.02-.59-.16-.82s-.45-.37-.75-.37ZM21.62,11.81c-.67,2.51-3.22,4.54-5.7,4.54h-3.3l.73-2.9h2.02c1.19,0,2.35-.87,2.65-1.99l.36-1.09h3.69l-.44,1.43Z"/>
    <path d="M9.92,12.25h-2.67l.58-2.03c-.08.29-.02-.59-.16-.82s-.45-.37-.75-.37H2.75c-.16,0-.66,0-.81-.58l-.69,2.2-.03,4.16c-.08.29-.02-.59.16-.82s.45-.37-.75-.37h8.11c-.43,0-.81.29-.92-.72l-.86-3.41c-.07-.28,0-.58-.17-.81s-.45-.36-.75-.36ZM8.86,16.35H1.28l1.12-4.21.6-1.92h3.57l-.57,2.04c-.08.29-.01.58.17-.82.18.23.45-.37-.75-.37h2.67l-.73,2.9Z"/>
  </svg>
);

const DEFAULT_ANALYSIS_INSTRUCTIONS = `You are analyzing vehicle damage for a PDR technician.

TASK: Examine the images and describe ONLY what you see:

1. Damage type: (Standard Dent/Crease)
   - Use "Standard Dent" for: door dings, parking damage, hail dents, regular round/oval dents
   - Use "Crease" ONLY if you see a clear linear fold/crease line in the metal

2. Approximate size: (up to 10mm / 11mm-25mm / 26mm-50mm / 51mm-80mm / 81mm-120mm / 121mm-200mm / 201mm-300mm / 301mm-500mm / 501mm-750mm / 751mm-1000mm (or larger))

3. Location on panel

4. Visible depth: (Shallow/Medium/Deep - based on shadow/reflection only)

5. Material: (Steel/Aluminum if visible, otherwise Unsure)

CRITICAL RULES:
- Describe ONLY what's visible in the images
- For "dent_summary", explicitly include: damage type, size range, depth, and if it affects a body line (from structured data).
- Do NOT assess repair difficulty or technician capability in damage_report.
- Do NOT mention skill levels, complexity, or pricing in damage_report.
- Do NOT suggest techniques or methods in damage_report.
- Be literal: "Standard Dent" for round/oval damage, "Crease" only for linear folds
- Do NOT say "Crease" when you mean "Standard Dent on a body line"
- Do NOT mention damage that isn't visible in the images

OUTPUT FORMAT:
{
  "damage_report": {
    "vehicle_panel": "...",
    "dent_location": "...",
    "dent_count": <number based on ACTUAL visible damage, not photo count>,
    "dent_summary": "...",
    "dent_details": {
      "size_range": "...",
      "depth": "...",
      "access_difficulty": "..."
    }
  },
  "confidence_assessment": {
    "quote_confidence": <1-5>,
    "repair_suitability": "Excellent for PDR/Good for PDR/Moderate/Difficult/Not suitable",
    "additional_notes": "..."
  }
}

INTERNAL TECHNICIAN ADVISORY (separate section, not customer-facing):
Based on the technician's profile settings, you MUST provide internal guidance about repair difficulty, skill level considerations, and technique suggestions. Explicitly mention if the damage affects a body line and cross-reference with the technician's "Body line repairs" skill level. This information is ONLY for the technician and will NEVER appear in customer quotes.`;

const DEFAULT_QUOTE_INSTRUCTIONS = `You are formatting a PDR quote for a customer.

You will receive PRE-CALCULATED line items with prices already determined programmatically.

YOUR ONLY JOB: Create clear, professional descriptions for each line item.

INPUT: You'll receive:
- Panel name
- Damage type
- Size range
- Depth (if applicable)
- Final calculated price (DO NOT MODIFY)
- Any special notes (matte paint, body line, stretched metal, etc.)

OUTPUT FORMAT FOR DESCRIPTIONS:

Base format:
"PDR Labour - [Panel] [Damage Type] Repair ([Size Range])"

If depth is Medium or Deep/Sharp, include it:
"PDR Labour - [Panel] [Damage Type] Repair ([Size Range], [Depth])"

Add relevant modifiers at the end:
- "(Body Line Area)" - if affects_body_line is true
- "(Matte Paint Finish)" - if notes mention matte paint
- "(Stretched Metal)" - if has_stretched_metal is true

EXAMPLES:
✅ "PDR Labour - Rear Door Standard Dent Repair (51mm - 80mm)"
✅ "PDR Labour - Front Wing Crease Repair (121mm - 200mm, Medium)"
✅ "PDR Labour - Bonnet Crease Repair (201mm - 300mm, Deep/Sharp, Body Line Area)"
✅ "PDR Labour - Rear Quarter Panel Standard Dent Repair (81mm - 120mm, Matte Paint Finish)"
✅ "PDR Labour - Door Standard Dent Repair (26mm - 50mm, Medium, Stretched Metal)"

NEVER mention:
- Technician skill levels
- "Beginner/Intermediate/Advanced/Expert"
- Internal complexity factors
- Calculation methodology
- Repair techniques or methods

Keep descriptions simple, professional, and focused on what was repaired.

DO NOT recalculate or modify any prices - they are provided pre-calculated programmatically.`;

const PDR_TOOLS = [
  "PDR rods & flat bars", "Knockdown tools", "Glue pulling", "Slide hammer", 
  "Mini lifter", "Lateral tension tools", "Fog light", "Line board", 
  "LED lights/UV lights", "Heat gun/hair dryer", "Polisher", "Nibbing block", 
  "Blending hammers", "Detail spray/lubricants"
];

const DAMAGE_SKILL_TYPES = [
  "Door dings and small parking damage", "Hail damage", "Large conventional dents", 
  "Creases and sharp dents", "Body line repairs", "Collision/impact damage"
];

const SKILL_LEVELS = ["Don't do this type", "Beginner", "Intermediate", "Advanced", "Expert"];

const VEHICLE_TYPES = [
  "Standard passenger cars", "Luxury vehicles", "Commercial vehicles/trucks", 
  "Motorcycles", "RVs/large vehicles", "Classic/vintage cars"
];

export default function Settings() {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState(null); // Stores the UserSetting object including its ID
    const [globalSettings, setGlobalSettings] = useState(null); // Stores the GlobalSetting object
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingGlobal, setSavingGlobal] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [error, setError] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const fileInputRef = useRef(null);
    const { showAlert } = useAlert();

    const [formData, setFormData] = useState({
      business_name: '',
      business_address: '',
      contact_email: '', // Will be set to user.email or loaded
      business_logo_url: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_sort_code: '',
      bank_iban: '',
      bank_swift_code: '',
      payment_provider: 'None',
      payment_method_preference: 'Bank Transfer Only',
      stripe_secret_key: '',
      square_access_token: '',
      paypal_client_id: '',
      paypal_client_secret: '',
      dvla_test_api_key: '',
      dvla_prod_api_key: '',
      dvla_use_test_environment: false,
      hourly_rate: 70,
      base_cost: 80,
      default_panel_price: 120,
      is_vat_registered: false,
      tax_rate: 20,
      currency: 'GBP',
      years_experience: 2, // Default for new users
      max_supported_dent_size: 'all sizes', // New field
      available_pdr_tools: [],
      specialized_damage_skills: [],
      works_on_aluminum_panels: false,
      primary_vehicle_types: [],
      quote_prefix: 'Q-',
      next_quote_number: 1,
      invoice_prefix: 'INV-',
      next_invoice_number: 1,
      invoice_footer: "Please pay within 30 days of receipt of invoice.",
      pricing_matrix: [], // NEW FIELD
      custom_damage_types: [], // NEW: Store user-defined custom damage types
      custom_size_ranges: [], // NEW: Store user-defined custom size ranges
    });

    // Separate state for global AI settings (admin only)
    const [globalFormData, setGlobalFormData] = useState({
      llm_analysis_instructions: DEFAULT_ANALYSIS_INSTRUCTIONS,
      llm_quote_instructions: DEFAULT_QUOTE_INSTRUCTIONS,
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Auto-update payment method preference based on payment provider
        if (formData.payment_provider && formData.payment_provider !== 'None') {
            if (formData.payment_method_preference === 'Bank Transfer Only') {
                handleInputChange('payment_method_preference', 'Payment Links Only');
            }
        } else if (formData.payment_provider === 'None') {
            if (formData.payment_method_preference !== 'Bank Transfer Only') {
                handleInputChange('payment_method_preference', 'Bank Transfer Only');
            }
        }
    }, [formData.payment_provider]);

    useEffect(() => {
        // Auto-update payment provider based on payment method preference
        if (formData.payment_method_preference === 'Bank Transfer Only') {
            if (formData.payment_provider !== 'None') {
                handleInputChange('payment_provider', 'None');
            }
        }
    }, [formData.payment_method_preference]);

    const loadData = async () => {
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const existingSettings = await UserSetting.filter({ user_email: currentUser.email });
            let loadedSettings = null;

            if (existingSettings.length > 0) {
                loadedSettings = existingSettings[0];
                setSettings(loadedSettings);

                // Initialize pricing matrix with NEW simplified defaults if empty or old structure
                let pricingMatrix = loadedSettings.pricing_matrix || [];
                if (pricingMatrix.length === 0 || !pricingMatrix[0].hasOwnProperty('base_price')) {
                    // Use new simplified structure
                    pricingMatrix = [
                        // Standard Dent - All 10 size ranges
                        { damage_type: "Standard Dent", size_range: "up to 10mm", base_price: 60 },
                        { damage_type: "Standard Dent", size_range: "11mm - 25mm", base_price: 90 },
                        { damage_type: "Standard Dent", size_range: "26mm - 50mm", base_price: 120 },
                        { damage_type: "Standard Dent", size_range: "51mm - 80mm", base_price: 180 },
                        { damage_type: "Standard Dent", size_range: "81mm - 120mm", base_price: 240 },
                        { damage_type: "Standard Dent", size_range: "121mm - 200mm", base_price: 300 },
                        { damage_type: "Standard Dent", size_range: "201mm - 300mm", base_price: 360 },
                        { damage_type: "Standard Dent", size_range: "301mm - 500mm", base_price: 450 },
                        { damage_type: "Standard Dent", size_range: "501mm - 750mm", base_price: 550 },
                        { damage_type: "Standard Dent", size_range: "751mm - 1000mm (or larger)", base_price: 650 },
                        
                        // Crease - First 7 size ranges
                        { damage_type: "Crease", size_range: "11mm - 25mm", base_price: 150 },
                        { damage_type: "Crease", size_range: "26mm - 50mm", base_price: 220 },
                        { damage_type: "Crease", size_range: "51mm - 80mm", base_price: 280 },
                        { damage_type: "Crease", size_range: "81mm - 120mm", base_price: 350 },
                        { damage_type: "Crease", size_range: "121mm - 200mm", base_price: 420 },
                        { damage_type: "Crease", size_range: "201mm - 300mm", base_price: 500 },
                        { damage_type: "Crease", size_range: "301mm - 500mm", base_price: 600 }
                    ];
                }

                const tempFormData = {
                    business_name: loadedSettings.business_name || '',
                    business_address: loadedSettings.business_address || '',
                    contact_email: loadedSettings.contact_email || currentUser.email,
                    business_logo_url: loadedSettings.business_logo_url || '',
                    bank_account_name: loadedSettings.bank_account_name || '',
                    bank_account_number: loadedSettings.bank_account_number || '',
                    bank_sort_code: loadedSettings.bank_sort_code || '',
                    bank_iban: loadedSettings.bank_iban || '',
                    bank_swift_code: loadedSettings.bank_swift_code || '',
                    payment_provider: loadedSettings.payment_provider || "None",
                    payment_method_preference: loadedSettings.payment_method_preference || 'Bank Transfer Only',
                    stripe_secret_key: loadedSettings.stripe_secret_key || '',
                    square_access_token: loadedSettings.square_access_token || '',
                    paypal_client_id: loadedSettings.paypal_client_id || '',
                    paypal_client_secret: loadedSettings.paypal_client_secret || '',
                    dvla_test_api_key: loadedSettings.dvla_test_api_key || '',
                    dvla_prod_api_key: loadedSettings.dvla_prod_api_key || '',
                    dvla_use_test_environment: loadedSettings.dvla_use_test_environment ?? false,
                    hourly_rate: loadedSettings.hourly_rate ?? 70,
                    base_cost: loadedSettings.base_cost ?? 80,
                    default_panel_price: loadedSettings.default_panel_price ?? 120,
                    is_vat_registered: loadedSettings.is_vat_registered ?? false,
                    tax_rate: loadedSettings.tax_rate ?? 20,
                    currency: loadedSettings.currency || 'GBP',
                    years_experience: loadedSettings.years_experience ?? 2,
                    max_supported_dent_size: loadedSettings.max_supported_dent_size || 'all sizes',
                    available_pdr_tools: loadedSettings.available_pdr_tools || [],
                    specialized_damage_skills: loadedSettings.specialized_damage_skills || [],
                    works_on_aluminum_panels: loadedSettings.works_on_aluminum_panels ?? false,
                    primary_vehicle_types: loadedSettings.primary_vehicle_types || [],
                    quote_prefix: loadedSettings.quote_prefix || "Q-",
                    next_quote_number: loadedSettings.next_quote_number ?? 1,
                    invoice_prefix: loadedSettings.invoice_prefix || "INV-", 
                    next_invoice_number: loadedSettings.next_invoice_number ?? 1,
                    invoice_footer: loadedSettings.invoice_footer || "Please pay within 30 days of receipt of invoice.",
                    pricing_matrix: pricingMatrix,
                    custom_damage_types: loadedSettings.custom_damage_types || [], // NEW FIELD
                    custom_size_ranges: loadedSettings.custom_size_ranges || [], // NEW FIELD
                };

                // Check if pricing matrix needs update
                let needsUpdate = false;
                // If pricing matrix was empty or uses old structure and now has defaults, mark for update
                if (loadedSettings.pricing_matrix === null || loadedSettings.pricing_matrix.length === 0 || !loadedSettings.pricing_matrix[0]?.hasOwnProperty('base_price')) {
                    needsUpdate = true;
                }
                
                setFormData(tempFormData); // Set formData after applying defaults and upgrades

                if (loadedSettings.business_logo_url) {
                    setLogoPreview(loadedSettings.business_logo_url);
                }

                if (needsUpdate && loadedSettings.id) { // Only update if there's an ID and changes were made
                    try {
                        // Persist the updated temporary formData back to the database (excluding AI instructions now)
                        const { llm_analysis_instructions, llm_quote_instructions, ...dataWithoutAI } = tempFormData;
                        await UserSetting.update(loadedSettings.id, dataWithoutAI);
                        console.log("Pricing matrix automatically initialized/upgraded.");
                    } catch (updateError) {
                        console.error("Failed to auto-save upgraded settings:", updateError);
                    }
                }

            } else {
                // Initialize formData with defaults for a new user
                const defaultPricingMatrix = [
                    // Standard Dent - All 10 size ranges
                    { damage_type: "Standard Dent", size_range: "up to 10mm", base_price: 60 },
                    { damage_type: "Standard Dent", size_range: "11mm - 25mm", base_price: 90 },
                    { damage_type: "Standard Dent", size_range: "26mm - 50mm", base_price: 120 },
                    { damage_type: "Standard Dent", size_range: "51mm - 80mm", base_price: 180 },
                    { damage_type: "Standard Dent", size_range: "81mm - 120mm", base_price: 240 },
                    { damage_type: "Standard Dent", size_range: "121mm - 200mm", base_price: 300 },
                    { damage_type: "Standard Dent", size_range: "201mm - 300mm", base_price: 360 },
                    { damage_type: "Standard Dent", size_range: "301mm - 500mm", base_price: 450 },
                    { damage_type: "Standard Dent", size_range: "501mm - 750mm", base_price: 550 },
                    { damage_type: "Standard Dent", size_range: "751mm - 1000mm (or larger)", base_price: 650 },
                    
                    // Crease - First 7 size ranges
                    { damage_type: "Crease", size_range: "11mm - 25mm", base_price: 150 },
                    { damage_type: "Crease", size_range: "26mm - 50mm", base_price: 220 },
                    { damage_type: "Crease", size_range: "51mm - 80mm", base_price: 280 },
                    { damage_type: "Crease", size_range: "81mm - 120mm", base_price: 350 },
                    { damage_type: "Crease", size_range: "121mm - 200mm", base_price: 420 },
                    { damage_type: "Crease", size_range: "201mm - 300mm", base_price: 500 },
                    { damage_type: "Crease", size_range: "301mm - 500mm", base_price: 600 }
                ];
                
                setFormData(prev => ({
                    ...prev,
                    contact_email: currentUser.email, // Default contact email
                    pricing_matrix: defaultPricingMatrix,
                    custom_damage_types: [], // NEW FIELD
                    custom_size_ranges: [], // NEW FIELD
                }));
            }

            // Load Global Settings (for admin users to edit AI instructions)
            if (currentUser.role === 'admin') {
                const existingGlobalSettings = await GlobalSetting.filter({ setting_key: 'main' });
                if (existingGlobalSettings.length > 0) {
                    const loadedGlobalSettings = existingGlobalSettings[0];
                    setGlobalSettings(loadedGlobalSettings);
                    setGlobalFormData({
                        llm_analysis_instructions: loadedGlobalSettings.llm_analysis_instructions || DEFAULT_ANALYSIS_INSTRUCTIONS,
                        llm_quote_instructions: loadedGlobalSettings.llm_quote_instructions || DEFAULT_QUOTE_INSTRUCTIONS,
                    });
                } else {
                    // Create initial GlobalSetting record with default instructions
                    const newGlobalSettings = await GlobalSetting.create({
                        setting_key: 'main',
                        llm_analysis_instructions: DEFAULT_ANALYSIS_INSTRUCTIONS,
                        llm_quote_instructions: DEFAULT_QUOTE_INSTRUCTIONS,
                    });
                    setGlobalSettings(newGlobalSettings);
                    setGlobalFormData({
                        llm_analysis_instructions: DEFAULT_ANALYSIS_INSTRUCTIONS,
                        llm_quote_instructions: DEFAULT_QUOTE_INSTRUCTIONS,
                    });
                }
                
                // Load all users
                await loadUsers();
            }
        } catch (err) {
            setError("Failed to load user data. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setError(null);
        try {
            const dataToSave = {
                user_email: user.email,
                ...formData,
                // Ensure array fields are not null/undefined if empty
                available_pdr_tools: formData.available_pdr_tools || [],
                specialized_damage_skills: formData.specialized_damage_skills || [],
                primary_vehicle_types: formData.primary_vehicle_types || [],
                pricing_matrix: formData.pricing_matrix || [], // NEW FIELD: Ensure it's an array
                custom_damage_types: formData.custom_damage_types || [], // NEW FIELD
                custom_size_ranges: formData.custom_size_ranges || [], // NEW FIELD
                // Ensure prefixes and numbers are not null/undefined for saving
                quote_prefix: formData.quote_prefix || 'Q-',
                invoice_prefix: formData.invoice_prefix || 'INV-',
                next_quote_number: formData.next_quote_number ?? 1,
                next_invoice_number: formData.next_invoice_number ?? 1
            };

            if (settings && settings.id) {
                await UserSetting.update(settings.id, dataToSave);
            } else {
                const newSettings = await UserSetting.create(dataToSave);
                setSettings(newSettings); // Store the newly created settings object
            }
            await loadData(); // Reload data to update settings and formData from server
            await showAlert("Settings saved successfully!", "Success");
            } catch (err) {
            setError("Failed to save settings. Please try again.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGlobalInputChange = (field, value) => {
        setGlobalFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveGlobalSettings = async () => {
        if (!user || user.role !== 'admin') return;
        setSavingGlobal(true);
        setError(null);
        try {
            const dataToSave = {
                setting_key: 'main',
                ...globalFormData,
            };

            if (globalSettings && globalSettings.id) {
                await GlobalSetting.update(globalSettings.id, dataToSave);
            } else {
                const newGlobalSettings = await GlobalSetting.create(dataToSave);
                setGlobalSettings(newGlobalSettings);
            }
            await showAlert("Global AI settings saved successfully! All users will now use these instructions.", "Success");
            } catch (err) {
            setError("Failed to save global settings. Please try again.");
            console.error(err);
        } finally {
            setSavingGlobal(false);
        }
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLogoUploading(true);
        setError(null);
        try {
            console.log("Uploading logo file:", file.name);
            const { file_url } = await UploadFile({ file });
            console.log("Logo uploaded successfully. URL:", file_url);
            handleInputChange('business_logo_url', file_url);
            setLogoPreview(file_url); // Set logo preview
        } catch (err) {
            console.error("Logo upload failed:", err);
            setError("Logo upload failed. Please try again.");
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Clear the file input
            }
            setLogoUploading(false);
        }
    };

    const handleArrayChange = (field, value, checked) => {
        setFormData(prev => {
            const currentArray = prev[field] || [];
            if (checked) {
                return { ...prev, [field]: [...currentArray, value] };
            } else {
                return { ...prev, [field]: currentArray.filter(item => item !== value) };
            }
        });
    };

    const handleSkillLevelChange = (type, level) => {
        setFormData(prev => {
            const skills = prev.specialized_damage_skills || [];
            const existingSkillIndex = skills.findIndex(skill => skill.type === type);
            let newSkills;
            if (existingSkillIndex > -1) {
                newSkills = [...skills];
                newSkills[existingSkillIndex] = { type, level };
            } else {
                newSkills = [...skills, { type, level }];
            }
            return { ...prev, specialized_damage_skills: newSkills };
        });
    };
    
    const getSkillLevel = (type) => {
        const skill = formData?.specialized_damage_skills?.find(s => s.type === type);
        return skill?.level || SKILL_LEVELS[0];
    };

    const loadUsers = async () => {
        setLoadingUsers(true);
        try {
            const users = await User.list();
            setAllUsers(users);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const getTierBadgeClass = (tier) => {
        switch(tier) {
            case 'professional':
                return 'bg-purple-600 text-white';
            case 'founder':
                return 'bg-yellow-600 text-white';
            case 'early_bird':
                return 'bg-blue-600 text-white';
            case 'starter':
            default:
                return 'bg-slate-600 text-white';
        }
    };

    const formatTierLabel = (tier) => {
        if (!tier) return 'Starter';
        return tier.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading) {
        return (
            <div className="p-4 max-w-md mx-auto text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                <p className="mt-2 text-slate-400">Loading settings...</p>
            </div>
        );
    }
    
    if (error && !settings) { // Check !settings because formData will always be initialized
         return (
            <div className="p-4 max-w-md mx-auto text-center">
                 <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
                 <p className="mt-2 text-red-400">{error}</p>
            </div>
        );
    }
    
    // settings could be null if no record exists yet, but formData will have defaults
    // so rendering is safe if loading is false.

    return (
        <div className="p-4 max-w-md mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-slate-400 text-sm">Customise your business profile and preferences.</p>
            </div>

            {error && (
                <div className="bg-red-900 border border-red-800 rounded-lg p-3">
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
            )}

            <Tabs defaultValue="company" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900 mb-4">
                    <TabsTrigger value="company" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                        Company info
                    </TabsTrigger>
                    <TabsTrigger value="pricing" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                        Pricing & quoting
                    </TabsTrigger>
                </TabsList>
                
                <TabsList className={`grid w-full ${user?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-1'} bg-slate-900 mb-6`}>
                    <TabsTrigger value="technician" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                        Technician details
                    </TabsTrigger>
                    {user?.role === 'admin' && (
                        <>
                            <TabsTrigger value="users" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                                Users
                            </TabsTrigger>
                            <TabsTrigger value="admin" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                                Admin
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                {/* Tab 1: Company Info */}
                <TabsContent value="company" className="space-y-6">
                    {/* Business Profile */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white"><Building className="w-5 h-5 text-blue-400" />Business Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-white">Business Name</Label>
                                <Input value={formData.business_name} onChange={e => handleInputChange('business_name', e.target.value)} placeholder="e.g., Acme PDR" className="bg-slate-800 border-slate-700 text-white" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">Business Logo</Label>
                                {user?.subscription_tier === 'professional' || user?.subscription_tier === 'founder' || user?.subscription_tier === 'early_bird' ? (
                                    <div className="flex flex-col gap-3">
                                        {logoPreview && (
                                        <div className="relative w-48 h-24 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                                            <img src={logoPreview} alt="Business Logo" className="max-w-full max-h-full object-contain" />
                                        </div>
                                        )}
                                        <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            variant="outline"
                                            className="bg-slate-800 border-slate-700 text-white hover:bg-white hover:text-black hover:border-gray-300"
                                            disabled={logoUploading}
                                        >
                                            {logoUploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Uploading...
                                            </>
                                            ) : (
                                            <>
                                                <Upload className="w-4 h-4 mr-2" />
                                                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                            </>
                                            )}
                                        </Button>
                                        {logoPreview && (
                                            <Button
                                            type="button"
                                            onClick={() => { handleInputChange('business_logo_url', ''); setLogoPreview(null); }}
                                            variant="outline"
                                            className="bg-red-900 border-red-700 text-red-300 hover:bg-red-800 hover:text-white hover:border-red-600"
                                            >
                                            Remove
                                            </Button>
                                        )}
                                        </div>
                                        <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg"
                                        className="hidden"
                                        onChange={handleLogoUpload}
                                        />
                                        <p className="text-slate-400 text-sm">Recommended: PNG with transparent background. Also accepts JPG/JPEG. Max 2MB</p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-gradient-to-r from-rose-900/20 to-purple-900/20 border border-rose-700 rounded-lg">
                                        <p className="text-white font-medium mb-2">Want to add your business logo?</p>
                                        <p className="text-slate-300 text-sm mb-3">Upgrade to Professional to customize your branding on quotes and invoices.</p>
                                        <Link to={createPageUrl('Upgrade')}>
                                            <Button
                                                type="button"
                                                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                                            >
                                                Upgrade to Professional
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">Business Address</Label>
                                <Textarea
                                    value={formData.business_address}
                                    onChange={(e) => handleInputChange('business_address', e.target.value)}
                                    placeholder="123 Main Street&#10;City, Postcode&#10;United Kingdom"
                                    rows={3}
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">Contact Email</Label>
                                <Input
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                                    placeholder="contact@yourbusiness.co.uk"
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Banking Details */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white">Banking Details</CardTitle>
                            <p className="text-slate-400 text-sm">For invoice payments (will appear on completed work invoices)</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-white">Account Name</Label>
                                <Input value={formData.bank_account_name} onChange={e => handleInputChange('bank_account_name', e.target.value)} placeholder="Business Account Name" className="bg-slate-800 border-slate-700 text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white">Account Number</Label>
                                    <Input value={formData.bank_account_number} onChange={e => handleInputChange('bank_account_number', e.target.value)} placeholder="12345678" className="bg-slate-800 border-slate-700 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white">Sort Code</Label>
                                    <Input value={formData.bank_sort_code} onChange={e => handleInputChange('bank_sort_code', e.target.value)} placeholder="12-34-56" className="bg-slate-800 border-slate-700 text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">IBAN (Optional)</Label>
                                <Input value={formData.bank_iban} onChange={e => handleInputChange('bank_iban', e.target.value)} placeholder="GB29 NWBK 6016 1331 9268 19" className="bg-slate-800 border-slate-700 text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">SWIFT/BIC Code (Optional)</Label>
                                <Input value={formData.bank_swift_code} onChange={e => handleInputChange('bank_swift_code', e.target.value)} placeholder="NWBKGB2L" className="bg-slate-800 border-slate-700 text-white" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Integration Section */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <CreditCard className="w-5 h-5 text-green-400" />
                                Payment Integration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="payment_method_preference" className="text-white">Payment Method</Label>
                                <Select
                                    value={formData.payment_method_preference || 'Bank Transfer Only'}
                                    onValueChange={(value) => handleInputChange('payment_method_preference', value)}
                                >
                                    <SelectTrigger id="payment_method_preference" className="bg-slate-800 border-slate-700 text-white">
                                        <SelectValue placeholder="Select payment method" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="Bank Transfer Only" className="text-white hover:bg-slate-700">Bank Transfer</SelectItem>
                                        <SelectItem value="Payment Links Only" className="text-white hover:bg-slate-700">Payment Links</SelectItem>
                                        <SelectItem value="Both" className="text-white hover:bg-slate-700">Both</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">
                                    {formData.payment_method_preference === 'Payment Links Only' && 'Payment links will be auto-generated when invoices are completed.'}
                                    {formData.payment_method_preference === 'Both' && 'Show both bank transfer details and payment links on invoices.'}
                                    {formData.payment_method_preference === 'Bank Transfer Only' && 'Only show bank transfer details on invoices.'}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment_provider" className="text-white">Payment Provider</Label>
                                <Select
                                    value={formData.payment_provider || 'None'}
                                    onValueChange={(value) => handleInputChange('payment_provider', value)}
                                >
                                    <SelectTrigger id="payment_provider" className="bg-slate-800 border-slate-700 text-white">
                                        <SelectValue placeholder="Select payment provider" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="None" className="text-white hover:bg-slate-700">None</SelectItem>
                                        <SelectItem value="Stripe" className="text-white hover:bg-slate-700">Stripe</SelectItem>
                                        <SelectItem value="Square" className="text-white hover:bg-slate-700">Square</SelectItem>
                                        <SelectItem value="PayPal" className="text-white hover:bg-slate-700">PayPal</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">
                                    Choose your preferred payment provider for customer invoices.
                                </p>
                            </div>

                                    {formData.payment_provider && formData.payment_provider !== 'None' && (
                                <div className="space-y-3">
                                    <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
                                        <p className="text-blue-200 text-xs font-medium mb-2">Dynamic Payment Integration</p>
                                        <p className="text-blue-300 text-xs">
                                            Dentifier will automatically generate payment links with the exact quote amount for each completed job. 
                                            Enter your API credentials below to connect your {formData.payment_provider} account.
                                        </p>
                                    </div>

                                    {formData.payment_provider === 'Stripe' && (
                                        <div className="space-y-3">
                                            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                                                <p className="text-xs text-slate-300 font-medium">How to get your Stripe API key:</p>
                                                <div className="text-xs text-slate-400 space-y-1">
                                                    <p>1. Log in to your <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Stripe Dashboard</a></p>
                                                    <p>2. Go to "Developers" → "API keys"</p>
                                                    <p>3. Copy your "Secret key" (starts with sk_live_ or sk_test_)</p>
                                                    <p>4. Paste it below</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor="stripe_secret_key" className="text-white">Stripe Secret Key</Label>
                                                <Input
                                                    id="stripe_secret_key"
                                                    type="password"
                                                    value={formData.stripe_secret_key || ''}
                                                    onChange={(e) => handleInputChange('stripe_secret_key', e.target.value)}
                                                    placeholder="sk_live_..."
                                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                                />
                                                <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2">
                                                    <p className="text-yellow-300 text-xs">⚠️ Keep your secret key private! This will be stored securely.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {formData.payment_provider === 'Square' && (
                                        <div className="space-y-3">
                                            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                                                <p className="text-xs text-slate-300 font-medium">How to get your Square Access Token:</p>
                                                <div className="text-xs text-slate-400 space-y-1">
                                                    <p>1. Log in to your <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Square Developer Dashboard</a></p>
                                                    <p>2. Create a new application or select an existing one</p>
                                                    <p>3. Go to "Credentials" tab</p>
                                                    <p>4. Copy your "Access Token" (Production or Sandbox)</p>
                                                    <p>5. Paste it below</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor="square_access_token" className="text-white">Square Access Token</Label>
                                                <Input
                                                    id="square_access_token"
                                                    type="password"
                                                    value={formData.square_access_token || ''}
                                                    onChange={(e) => handleInputChange('square_access_token', e.target.value)}
                                                    placeholder="EAAAl..."
                                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                                />
                                                <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2">
                                                    <p className="text-yellow-300 text-xs">⚠️ Keep your access token private! This will be stored securely.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {formData.payment_provider === 'PayPal' && (
                                        <div className="space-y-3">
                                            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                                                <p className="text-xs text-slate-300 font-medium">How to get your PayPal API credentials:</p>
                                                <div className="text-xs text-slate-400 space-y-1">
                                                    <p>1. Log in to <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">PayPal Developer Dashboard</a></p>
                                                    <p>2. Go to "Apps & Credentials"</p>
                                                    <p>3. Create a new app or select an existing one</p>
                                                    <p>4. Copy your "Client ID" and "Secret"</p>
                                                    <p>5. Paste them below</p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor="paypal_client_id" className="text-white">PayPal Client ID</Label>
                                                <Input
                                                    id="paypal_client_id"
                                                    type="text"
                                                    value={formData.paypal_client_id || ''}
                                                    onChange={(e) => handleInputChange('paypal_client_id', e.target.value)}
                                                    placeholder="AXX..."
                                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <Label htmlFor="paypal_client_secret" className="text-white">PayPal Client Secret</Label>
                                                <Input
                                                    id="paypal_client_secret"
                                                    type="password"
                                                    value={formData.paypal_client_secret || ''}
                                                    onChange={(e) => handleInputChange('paypal_client_secret', e.target.value)}
                                                    placeholder="EL..."
                                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                                />
                                                <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2">
                                                    <p className="text-yellow-300 text-xs">⚠️ Keep your credentials private! These will be stored securely.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="bg-green-900/20 border border-green-700 rounded p-2">
                                        <p className="text-green-300 text-xs">✓ Once saved, payment links will be automatically generated with the exact quote amount for each completed job.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Pricing & Quoting */}
                <TabsContent value="pricing" className="space-y-6">
                    {/* Quote & Invoice Numbering - MOVED TO TOP */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white">Quote & Invoice Numbering</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white">Quote Prefix</Label>
                                    <Input 
                                        value={formData.quote_prefix} 
                                        onChange={e => handleInputChange('quote_prefix', e.target.value)} 
                                        placeholder="Q-"
                                        className="bg-slate-800 border-slate-700 text-white" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white">Next Quote Number</Label>
                                    <Input 
                                        type="number" 
                                        min="1"
                                        value={formData.next_quote_number} 
                                        onChange={e => handleInputChange('next_quote_number', parseInt(e.target.value) || 1)} 
                                        className="bg-slate-800 border-slate-700 text-white" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white">Invoice Prefix</Label>
                                    <Input 
                                        value={formData.invoice_prefix} 
                                        onChange={e => handleInputChange('invoice_prefix', e.target.value)} 
                                        placeholder="INV-"
                                        className="bg-slate-800 border-slate-700 text-white" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white">Next Invoice Number</Label>
                                    <Input 
                                        type="number" 
                                        min="1"
                                        value={formData.next_invoice_number} 
                                        onChange={e => handleInputChange('next_invoice_number', parseInt(e.target.value) || 1)} 
                                        className="bg-slate-800 border-slate-700 text-white" 
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-slate-800 rounded-lg">
                                <Label className="text-slate-400 text-xs">Your next invoice reference</Label>
                                <p className="text-white font-medium mt-1">
                                    {formData.invoice_prefix}{String(formData.next_invoice_number).padStart(4, '0')}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-white">Invoice Footer</Label>
                                <Textarea
                                    value={formData.invoice_footer}
                                    onChange={(e) => handleInputChange('invoice_footer', e.target.value)}
                                    placeholder="Please pay within 30 days of receipt of invoice."
                                    rows={3}
                                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                                />
                                <p className="text-slate-400 text-xs">This message will appear at the bottom of completed invoices</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing & Tax */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white">Pricing & Tax</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white">Hourly Rate</Label>
                                    <Input type="number" value={formData.hourly_rate} onChange={e => handleInputChange('hourly_rate', parseFloat(e.target.value))} className="bg-slate-800 border-slate-700 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white">Base Cost / Call-out</Label>
                                    <Input type="number" value={formData.base_cost} onChange={e => handleInputChange('base_cost', parseFloat(e.target.value))} className="bg-slate-800 border-slate-700 text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white">Default Panel Price</Label>
                                <Input type="number" value={formData.default_panel_price} onChange={e => handleInputChange('default_panel_price', parseFloat(e.target.value))} className="bg-slate-800 border-slate-700 text-white" />
                                <p className="text-slate-400 text-xs">Used when "Charge Per Panel" option is selected during assessments</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-white">Currency</Label>
                                    <Select value={formData.currency} onValueChange={value => handleInputChange('currency', value)}>
                                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                            <SelectItem value="GBP" className="text-white">GBP (£)</SelectItem>
                                            <SelectItem value="USD" className="text-white">USD ($)</SelectItem>
                                            <SelectItem value="EUR" className="text-white">EUR (€)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Switch 
                                    id="vat-registered" 
                                    checked={formData.is_vat_registered} 
                                    onCheckedChange={checked => handleInputChange('is_vat_registered', checked)}
                                    className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-600"
                                />
                                <Label htmlFor="vat-registered" className="text-white">I am VAT/Tax registered</Label>
                            </div>
                            {formData.is_vat_registered && (
                                 <div className="space-y-2">
                                    <Label className="text-white">Tax Rate (%)</Label>
                                    <Input type="number" value={formData.tax_rate} onChange={e => handleInputChange('tax_rate', parseFloat(e.target.value))} className="bg-slate-800 border-slate-700 text-white" />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pricing Matrix */}
                    <PricingMatrix
                        pricingMatrix={formData.pricing_matrix || []}
                        customDamageTypes={formData.custom_damage_types || []}
                        customSizeRanges={formData.custom_size_ranges || []}
                        onChange={(matrix) => handleInputChange('pricing_matrix', matrix)}
                        onCustomTypesChange={(types) => handleInputChange('custom_damage_types', types)}
                        onCustomSizeRangesChange={(sizes) => handleInputChange('custom_size_ranges', sizes)}
                        currency={formData.currency}
                        worksOnAluminum={formData.works_on_aluminum_panels}
                    />
                </TabsContent>

                {/* Tab 3: Technician Details */}
                <TabsContent value="technician" className="space-y-6">
                    {/* Technician Profile */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white"><Wrench className="w-5 h-5 text-blue-400" />Technician Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="years-experience" className="text-white">Years of Experience</Label>
                                <Input
                                    id="years-experience"
                                    type="number"
                                    min="0"
                                    value={formData.years_experience || ''}
                                    onChange={(e) => handleInputChange('years_experience', parseFloat(e.target.value) || 0)}
                                    className="bg-slate-800 border-slate-700 text-white"
                                    placeholder="e.g., 5"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="max-dent-size" className="text-white">Maximum Dent Size You Work On</Label>
                                <Select
                                    value={formData.max_supported_dent_size || 'all sizes'}
                                    onValueChange={(value) => handleInputChange('max_supported_dent_size', value)}
                                >
                                    <SelectTrigger id="max-dent-size" className="bg-slate-800 border-slate-700 text-white">
                                        <SelectValue placeholder="Select maximum dent size" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="up to 10mm" className="text-white hover:bg-slate-700">Up to 10mm (Micro Dents)</SelectItem>
                                        <SelectItem value="up to 25mm" className="text-white hover:bg-slate-700">Up to 25mm (Small Dents)</SelectItem>
                                        <SelectItem value="up to 50mm" className="text-white hover:bg-slate-700">Up to 50mm (Medium Dents)</SelectItem>
                                        <SelectItem value="up to 80mm" className="text-white hover:bg-slate-700">Up to 80mm (Medium-Large)</SelectItem>
                                        <SelectItem value="up to 120mm" className="text-white hover:bg-slate-700">Up to 120mm (Large Dents)</SelectItem>
                                        <SelectItem value="up to 200mm" className="text-white hover:bg-slate-700">Up to 200mm (Extra Large)</SelectItem>
                                        <SelectItem value="up to 300mm" className="text-white hover:bg-slate-700">Up to 300mm (Giant Dents)</SelectItem>
                                        <SelectItem value="up to 500mm" className="text-white hover:bg-slate-700">Up to 500mm (Super Dents)</SelectItem>
                                        <SelectItem value="up to 750mm" className="text-white hover:bg-slate-700">Up to 750mm (Massive Dents)</SelectItem>
                                        <SelectItem value="up to 1000mm" className="text-white hover:bg-slate-700">Up to 1000mm (Extreme Dents)</SelectItem>
                                        <SelectItem value="all sizes" className="text-white hover:bg-slate-700">All Sizes (No Limit)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-slate-400 text-sm">
                                    Dentifier will flag damage items exceeding this size for your review
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="aluminum-panels-checkbox" // Added ID for accessibility and label association
                                    checked={formData.works_on_aluminum_panels || false}
                                    onChange={(e) => handleInputChange('works_on_aluminum_panels', e.target.checked)}
                                    className="w-4 h-4 rounded border-2 border-slate-600 bg-slate-800 text-green-600 focus:ring-green-500" // Added classes for styling
                                />
                                <Label htmlFor="aluminum-panels-checkbox" className="text-white">I work on aluminum panels</Label>
                            </div>
                            <div>
                                <Label className="text-white block mb-2">Available PDR Tools</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PDR_TOOLS.map(tool => (
                                        <div key={tool} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={tool} 
                                                checked={formData.available_pdr_tools.includes(tool)} 
                                                onCheckedChange={checked => handleArrayChange('available_pdr_tools', tool, checked)}
                                                className="border-2 border-slate-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                            />
                                            <Label htmlFor={tool} className="text-sm text-slate-300">{tool}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label className="text-white block mb-2">Damage Type Skills</Label>
                                <div className="space-y-3">
                                    {DAMAGE_SKILL_TYPES.map(type => (
                                        <div key={type} className="grid grid-cols-2 items-center gap-4">
                                            <Label className="text-sm text-slate-300">{type}</Label>
                                            <Select value={getSkillLevel(type)} onValueChange={level => handleSkillLevelChange(type, level)}>
                                                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent className="bg-slate-800 border-slate-700">
                                                    {SKILL_LEVELS.map(level => <SelectItem key={level} value={level} className="text-white">{level}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <Label className="text-white block mb-2">Primary Vehicle Types</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {VEHICLE_TYPES.map(type => (
                                        <div key={type} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={type} 
                                                checked={formData.primary_vehicle_types.includes(type)} 
                                                onCheckedChange={checked => handleArrayChange('primary_vehicle_types', type, checked)}
                                                className="border-2 border-slate-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                            />
                                            <Label htmlFor={type} className="text-sm text-slate-300">{type}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 4: Users (Only for admin users) */}
                {user?.role === 'admin' && (
                    <TabsContent value="users" className="space-y-6">
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Users className="w-5 h-5 text-blue-400" />
                                    All Users
                                </CardTitle>
                                <p className="text-slate-400 text-sm">Manage user accounts and subscription tiers</p>
                            </CardHeader>
                            <CardContent>
                                {loadingUsers ? (
                                    <div className="text-center py-8">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {allUsers.map((u) => (
                                            <div key={u.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-white font-medium">{u.full_name || 'No Name'}</h3>
                                                            {u.role === 'admin' && (
                                                                <Badge className="bg-rose-600 text-white text-xs">
                                                                    <Shield className="w-3 h-3 mr-1" />
                                                                    Admin
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-slate-400 text-sm mb-2">
                                                            <Mail className="w-3 h-3" />
                                                            {u.email}
                                                        </div>
                                                        <Badge className={`${getTierBadgeClass(u.subscription_tier)} text-xs`}>
                                                            {formatTierLabel(u.subscription_tier)}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-2">
                                                    Joined: {new Date(u.created_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Tab 5: Admin (Only for admin users) */}
                {user?.role === 'admin' && (
                    <TabsContent value="admin" className="space-y-6">
                        <Card className="bg-blue-900/20 border-blue-800">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-blue-200 font-medium">Global Application Settings</p>
                                        <p className="text-blue-300 text-sm mt-1">
                                            These settings are shared across ALL users. Changes here will affect everyone using the application.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* DVLA API Configuration */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-white">DVLA Vehicle Lookup</CardTitle>
                                <p className="text-slate-400 text-sm">Auto-fill vehicle details from UK registration plates</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-white">DVLA Test API Key</Label>
                                    <Input
                                        type="password"
                                        value={formData.dvla_test_api_key || ''}
                                        onChange={(e) => handleInputChange('dvla_test_api_key', e.target.value)}
                                        placeholder="Test API key"
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                                    />
                                    <p className="text-slate-400 text-xs">For testing with fake registrations during development</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-white">DVLA Production API Key</Label>
                                    <Input
                                        type="password"
                                        value={formData.dvla_prod_api_key || ''}
                                        onChange={(e) => handleInputChange('dvla_prod_api_key', e.target.value)}
                                        placeholder="Production API key"
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                                    />
                                    <p className="text-slate-400 text-xs">For live customer data lookups</p>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="dvla-test-env"
                                            checked={formData.dvla_use_test_environment ?? false}
                                            onCheckedChange={(checked) => handleInputChange('dvla_use_test_environment', checked)}
                                            className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-600"
                                        />
                                        <Label htmlFor="dvla-test-env" className="text-white cursor-pointer">
                                            Use Test Environment
                                        </Label>
                                    </div>
                                    <Badge className={formData.dvla_use_test_environment ? 'bg-blue-600' : 'bg-green-600'}>
                                        {formData.dvla_use_test_environment ? 'Test' : 'Production'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <DentifierIcon className="w-5 h-5 text-rose-400" />
                                    Dentifier Analysis Instructions (Global)
                                </CardTitle>
                                <p className="text-slate-400 text-sm">This prompt is used by Dentifier to analyse damage photos for all users.</p>
                            </CardHeader>
                            <CardContent>
                                <Textarea value={globalFormData.llm_analysis_instructions} onChange={e => handleGlobalInputChange('llm_analysis_instructions', e.target.value)} className="bg-slate-800 border-slate-700 text-white h-64 font-mono text-xs" />
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <DentifierIcon className="w-5 h-5 text-rose-400" />
                                    Dentifier Quoting Instructions (Global)
                                </CardTitle>
                                 <p className="text-slate-400 text-sm">This prompt tells Dentifier how to generate a quote from its analysis for all users.</p>
                            </CardHeader>
                            <CardContent>
                                <Textarea value={globalFormData.llm_quote_instructions} onChange={e => handleGlobalInputChange('llm_quote_instructions', e.target.value)} className="bg-slate-800 border-slate-700 text-white h-64 font-mono text-xs" />
                            </CardContent>
                        </Card>

                        <Button onClick={handleSaveGlobalSettings} disabled={savingGlobal} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            {savingGlobal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Global AI Settings
                        </Button>
                    </TabsContent>
                )}
            </Tabs>
            
            <Button onClick={handleSave} disabled={saving} className="w-full pink-gradient text-white font-semibold">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Settings
            </Button>
        </div>
    );
}