
import React, { useState, useEffect, useRef } from "react";
import { User } from "@/entities/User";
import { UserSetting } from "@/entities/UserSetting";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, AlertTriangle, Loader2, Building, UserCircle, Wrench, Upload, CreditCard } from "lucide-react";
import PricingMatrix from "../components/settings/PricingMatrix";

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
- Do NOT assess repair difficulty or technician capability
- Do NOT mention skill levels, complexity, or pricing
- Do NOT suggest techniques or methods
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
Based on the technician's profile settings, you may provide internal guidance about repair difficulty, skill level considerations, and technique suggestions. This information is ONLY for the technician and will NEVER appear in customer quotes.`;

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
  "Creases and sharp dents", "Collision/impact damage"
];

const SKILL_LEVELS = ["Don't do this type", "Beginner", "Intermediate", "Advanced", "Expert"];

const VEHICLE_TYPES = [
  "Standard passenger cars", "Luxury vehicles", "Commercial vehicles/trucks", 
  "Motorcycles", "RVs/large vehicles", "Classic/vintage cars"
];

export default function Settings() {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState(null); // Stores the UserSetting object including its ID
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoPreview, setLogoPreview] = useState(null);
    const [error, setError] = useState(null);

    const fileInputRef = useRef(null);

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
      payment_link_template: '',
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
      llm_analysis_instructions: DEFAULT_ANALYSIS_INSTRUCTIONS,
      llm_quote_instructions: DEFAULT_QUOTE_INSTRUCTIONS,
      pricing_matrix: [], // NEW FIELD
      custom_damage_types: [], // NEW: Store user-defined custom damage types
    });

    useEffect(() => {
        loadData();
    }, []);

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
                    payment_link_template: loadedSettings.payment_link_template || "",
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
                    llm_analysis_instructions: loadedSettings.llm_analysis_instructions || DEFAULT_ANALYSIS_INSTRUCTIONS,
                    llm_quote_instructions: loadedSettings.llm_quote_instructions || DEFAULT_QUOTE_INSTRUCTIONS,
                    pricing_matrix: pricingMatrix,
                    custom_damage_types: loadedSettings.custom_damage_types || [], // NEW FIELD
                };

                // Aggressive upgrade logic for LLM instructions and new fields
                let needsUpdate = false;
                // Check if the current instructions match the old, or if a specific new phrase is missing
                if (!tempFormData.llm_analysis_instructions.includes('INTERNAL TECHNICIAN ADVISORY')) { 
                    tempFormData.llm_analysis_instructions = DEFAULT_ANALYSIS_INSTRUCTIONS;
                    needsUpdate = true;
                }
                
                // Updated check for the new quote instructions changes
                if (!tempFormData.llm_quote_instructions.includes('PRE-CALCULATED line items') || 
                    !tempFormData.llm_quote_instructions.includes('DO NOT recalculate or modify any prices') ||
                    !tempFormData.llm_quote_instructions.includes('Size range') || // New check
                    !tempFormData.llm_quote_instructions.includes('OUTPUT FORMAT FOR DESCRIPTIONS')) { // New check
                    tempFormData.llm_quote_instructions = DEFAULT_QUOTE_INSTRUCTIONS;
                    needsUpdate = true;
                }

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
                        // Persist the updated temporary formData back to the database
                        await UserSetting.update(loadedSettings.id, tempFormData);
                        console.log("AI instructions and pricing matrix automatically initialized/upgraded.");
                    } catch (updateError) {
                        console.error("Failed to auto-save upgraded instructions/settings:", updateError);
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
                    llm_analysis_instructions: DEFAULT_ANALYSIS_INSTRUCTIONS,
                    llm_quote_instructions: DEFAULT_QUOTE_INSTRUCTIONS,
                    pricing_matrix: defaultPricingMatrix,
                    custom_damage_types: [], // NEW FIELD
                }));
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
            alert("Settings saved successfully!");
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
                
                <TabsList className="grid w-full grid-cols-2 bg-slate-900 mb-6">
                    <TabsTrigger value="technician" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                        Technician details
                    </TabsTrigger>
                    {user?.role === 'admin' && (
                        <TabsTrigger value="admin" className="data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                            Admin
                        </TabsTrigger>
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
                                        <SelectItem value="Other" className="text-white hover:bg-slate-700">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-400">
                                    Choose your preferred payment provider for customer invoices.
                                </p>
                            </div>

                            {formData.payment_provider && formData.payment_provider !== 'None' && (
                                <div className="space-y-2">
                                    <Label htmlFor="payment_link_template" className="text-white">Payment Link</Label>
                                    <Input
                                        id="payment_link_template"
                                        value={formData.payment_link_template || ''}
                                        onChange={(e) => handleInputChange('payment_link_template', e.target.value)}
                                        placeholder="https://..."
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                                    />
                                    <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                                        <p className="text-xs text-slate-300 font-medium">How to get your payment link:</p>
                                        {formData.payment_provider === 'Stripe' && (
                                            <div className="text-xs text-slate-400 space-y-1">
                                                <p>1. Log in to your Stripe Dashboard</p>
                                                <p>2. Go to "Payment Links" in the left sidebar</p>
                                                <p>3. Create a new payment link for your PDR services</p>
                                                <p>4. Copy the shareable link and paste it here</p>
                                                <p className="text-slate-500 italic mt-2">Example: https://buy.stripe.com/test_abc123</p>
                                            </div>
                                        )}
                                        {formData.payment_provider === 'Square' && (
                                            <div className="text-xs text-slate-400 space-y-1">
                                                <p>1. Log in to your Square Dashboard</p>
                                                <p>2. Go to "Online" → "Checkout"</p>
                                                <p>3. Create a checkout link for your services</p>
                                                <p>4. Copy the link and paste it here</p>
                                                <p className="text-slate-500 italic mt-2">Example: https://square.link/u/abc123</p>
                                            </div>
                                        )}
                                        {formData.payment_provider === 'PayPal' && (
                                            <div className="text-xs text-slate-400 space-y-1">
                                                <p>1. Set up PayPal.Me from your PayPal account</p>
                                                <p>2. Your PayPal.Me link is your unique URL</p>
                                                <p>3. Copy your PayPal.Me link and paste it here</p>
                                                <p className="text-slate-500 italic mt-2">Example: https://paypal.me/yourbusiness</p>
                                            </div>
                                        )}
                                        {formData.payment_provider === 'Other' && (
                                            <div className="text-xs text-slate-400">
                                                <p>Paste your payment link from your chosen provider.</p>
                                            </div>
                                        )}
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
                        onChange={(matrix) => handleInputChange('pricing_matrix', matrix)}
                        onCustomTypesChange={(types) => handleInputChange('custom_damage_types', types)}
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

                {/* Tab 4: Admin (Only for admin users) */}
                {user?.role === 'admin' && (
                    <TabsContent value="admin" className="space-y-6">
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <DentifierIcon className="w-5 h-5 text-rose-400" />
                                    Dentifier Analysis Instructions (Admin)
                                </CardTitle>
                                <p className="text-slate-400 text-sm">This prompt is used by Dentifier to analyse damage photos.</p>
                            </CardHeader>
                            <CardContent>
                                <Textarea value={formData.llm_analysis_instructions} onChange={e => handleInputChange('llm_analysis_instructions', e.target.value)} className="bg-slate-800 border-slate-700 text-white h-64 font-mono text-xs" />
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <DentifierIcon className="w-5 h-5 text-rose-400" />
                                    Dentifier Quoting Instructions (Admin)
                                </CardTitle>
                                 <p className="text-slate-400 text-sm">This prompt tells Dentifier how to generate a quote from its analysis.</p>
                            </CardHeader>
                            <CardContent>
                                <Textarea value={formData.llm_quote_instructions} onChange={e => handleInputChange('llm_quote_instructions', e.target.value)} className="bg-slate-800 border-slate-700 text-white h-64 font-mono text-xs" />
                            </CardContent>
                        </Card>
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
