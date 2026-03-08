import React, { useState, useEffect } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { base44 } from "@/api/base44Client";
import { User, UserSetting, GlobalSetting } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle, RefreshCw, ArrowLeft, Save, ShieldCheck, Eye } from "lucide-react";

const DentifierIcon = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 25.24 18.12" fill="currentColor"
    style={{ width: '1.75rem', height: '1.25rem' }} preserveAspectRatio="xMidYMid meet">
    <g>
      <path d="M3.39,8.1h4.16c.43,0,.8-.29.9-.66l.64-2.14h3.12c.44,0,.81-.29.92-.72l.86-3.41c.07-.28.01-.58-.17-.81-.18-.23-.45-.37-.75-.37h-7.95c-.43,0-.8.29-.91.7l-1.25,4.71-.48,1.5c-.08.29-.02.59.16.82s.45.37.75.37ZM4.1,5.75l1.21-4.54h7.43l-.73,2.9h-3.12c-.43,0-.8.29-.91.7l-.44,1.6-.17.51h-3.63l.37-1.16Z"/>
      <path d="M24.38,1.62c-.8-1.04-2.06-1.62-3.54-1.62h-3.99c-.35,0-.91.22-1.03.72l-.86,3.41c-.07.29-.01.58.17.81.18.23.45.37.75.37h2.22c.27,0,.48.08.6.24.11.14.13.34.09.51l-.31.86c-.08.29-.02.59.16.82s.45.37.75.37h4.22c.43,0,.8-.29.91-.68l.52-1.68c.41-1.56.18-3.03-.67-4.12ZM23.89,5.41l-.46,1.49h-3.67l.17-.49c.16-.59.06-1.16-.28-1.6-.35-.45-.91-.71-1.55-.71h-1.9l.73-2.9h3.9c1.1,0,2.02.41,2.59,1.15.61.8.78,1.89.47,3.06Z"/>
      <path d="M22.98,9.75h-4.22c-.43,0-.8.29-.9.67l-.42,1.29c-.16.6-.84,1.11-1.5,1.11h-2.21c-.43,0-.81.29-.92.72l-.86,3.41c-.07.28-.01.58.17.81s.45.37.75.37h3.62c3.04,0,6.05-2.39,6.85-5.41l.55-1.77c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37ZM22.19,12.38c-.67,2.51-3.22,4.54-5.7,4.54h-3.3l.73-2.9h2.02c1.19,0,2.35-.87,2.65-1.99l.36-1.09h3.69l-.44,1.43Z"/>
      <path d="M9.92,12.82h-2.67l.58-2.03c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37H2.75c-.16,0-.66,0-.81.58l-.69,2.2L.03,16.93c-.08.29-.02.59.16.82s.45.37.75.37h8.11c.43,0,.81-.29.92-.72l.86-3.41c.07-.28,0-.58-.17-.81s-.45-.36-.75-.36ZM8.86,16.92H1.28l1.12-4.21.6-1.92h3.57l-.57,2.04c-.08.29-.01.58.17.82.18.23.45.37.75.37h2.67l-.73,2.9Z"/>
    </g>
  </svg>
);

// ─── Programmatic Risk Flag Engine ───────────────────────────────────────────
function computeRiskFlags(damageItems) {
  const flags = [];
  const hasGluePull = damageItems.some(i => i.repair_method === 'Glue Pull Only' || i.repair_method === 'Glue Pull + Rod Finish');

  const hasStretchedMetal = damageItems.some(i => i.has_stretched_metal);
  const hasBodyLine = damageItems.some(i => i.affects_body_line);
  const hasLimitedAccess = damageItems.some(i => i.repair_method === 'Limited Tool Access');
  const hasNoAccess = false;
  const hasAluminium = damageItems.some(i => i.material === 'Aluminum');
  const hasDeep = damageItems.some(i => i.depth === 'Deep/Sharp');

  if (hasGluePull && (hasDeep || hasStretchedMetal || hasBodyLine)) {
    const reasons = [];
    if (hasDeep) reasons.push('depth');
    if (hasStretchedMetal) reasons.push('stretched metal');
    if (hasBodyLine) reasons.push('body line');
    flags.push({
      level: 'warning',
      text: `GLUE PULL WARNING: Glue pull may not achieve full results on this job due to ${reasons.join(', ')}. Consider whether alternative methods are available.`
    });
  }
  if (hasStretchedMetal) {
    flags.push({
      level: 'warning',
      text: 'STRETCHED METAL: Metal stretch is present. A complete factory restoration may not be achievable. Ensure the customer is aware before proceeding.'
    });
  }
  if (hasBodyLine) {
    flags.push({
      level: 'warning',
      text: 'BODY LINE: This dent affects a styling line which increases repair complexity.'
    });
  }
  if (hasNoAccess) {
    flags.push({
      level: 'warning',
      text: 'NO TOOL ACCESS: No rod access available. Glue pull or alternative approach required.'
    });
  }
  if (hasLimitedAccess) {
    flags.push({
      level: 'warning',
      text: 'LIMITED ACCESS: Restricted tool access may affect repair quality and time.'
    });
  }
  if (hasAluminium) {
    flags.push({
      level: 'info',
      text: 'ALUMINIUM PANEL: Aluminium requires specialist handling. Results can vary more than on steel.'
    });
  }
  return flags;
}

// ─── Depth-driven confidence score ───────────────────────────────────────────
function computeConfidenceScore(damageItems) {
  const hasStretchedMetal = damageItems.some(i => i.has_stretched_metal);
  const hasBodyLine = damageItems.some(i => i.affects_body_line);
  const hasNoAccess = false;
  const hasDeep = damageItems.some(i => i.depth === 'Deep/Sharp');
  const hasShallow = damageItems.every(i => i.depth === 'Shallow' || !i.depth);

  if (hasNoAccess) return 1;
  if (hasDeep && (hasBodyLine || hasStretchedMetal)) return 2;
  if (hasDeep) return 3;
  if (hasBodyLine || hasStretchedMetal) return 3;
  if (hasShallow) return 5;
  return 4;
}

function confidenceLabel(score) {
  switch (score) {
    case 5: return 'Excellent — repair is well suited to PDR';
    case 4: return 'Good — no significant concerns identified';
    case 3: return 'Moderate — repair complexity is higher than standard, proceed with care';
    case 2: return 'Difficult — this job has significant complexity, assess carefully before proceeding';
    case 1: return 'High risk — consider whether PDR is appropriate for this damage';
    default: return 'Unable to determine';
  }
}

function confidenceBadgeClass(score) {
  if (score >= 5) return 'bg-green-900/40 border-green-700';
  if (score === 4) return 'bg-blue-900/40 border-blue-700';
  if (score === 3) return 'bg-yellow-900/40 border-yellow-700';
  if (score === 2) return 'bg-orange-900/40 border-orange-700';
  return 'bg-red-900/40 border-red-700';
}

function confidenceTextClass(score) {
  if (score >= 5) return 'text-green-300';
  if (score === 4) return 'text-blue-300';
  if (score === 3) return 'text-yellow-300';
  if (score === 2) return 'text-orange-300';
  return 'text-red-300';
}

export default function DamageAnalysis({ photos, damageItems, vehicle, onAnalysisComplete, onGoBack }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const currentUser = await User.me();
      const userSettingsData = await UserSetting.filter({ user_email: currentUser.email });
      if (userSettingsData.length > 0) setUserSettings(userSettingsData[0]);
      else { setError('User settings not found. Please configure your settings first.'); return; }
      const globalSettingsData = await GlobalSetting.filter({ setting_key: 'main' });
      if (globalSettingsData.length > 0) setGlobalSettings(globalSettingsData[0]);
      else setGlobalSettings({}); // Fall back to defaults — analysis instructions handled in performAnalysis
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings. Please check your settings page.');
    }
  };

  useEffect(() => {
    if (userSettings && globalSettings && !analysis && !analyzing && !error) {
      performAnalysis();
    }
  }, [userSettings, globalSettings, analysis, analyzing, error]);

  const performAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      if (!damageItems || damageItems.length === 0) throw new Error('No damage items provided for analysis');
      const analysisInstructions = globalSettings?.llm_analysis_instructions || '';
      if (!analysisInstructions) throw new Error('Analysis instructions not configured. Please contact your administrator.');

      const vehicleInfo = vehicle
        ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.color ? ` (${vehicle.color})` : ''}`
        : 'Vehicle details not provided';

      const damageDescription = damageItems.map((item, index) => {
        const parts = [`Item ${index + 1}: ${item.panel}`];
        if (item.damage_type) parts.push(`Type: ${item.damage_type}`);
        if (item.size_range) parts.push(`Size: ${item.size_range}`);
        parts.push(`Count: ${item.dent_count || 1} dent(s)`);
        if (item.material) parts.push(`Material: ${item.material}`);
        if (item.repair_method) parts.push(`Repair Method: ${item.repair_method}`);
        if (item.depth) parts.push(`Depth: ${item.depth}`);
        if (item.affects_body_line) parts.push(`Affects Body Line: Yes`);
        if (item.has_stretched_metal) parts.push(`Stretched Metal: Yes`);
        if (item.notes) parts.push(`Notes: ${item.notes}`);
        return parts.join(' | ');
      }).join('\n');

      const totalDentsFromData = damageItems.reduce((sum, item) => sum + (item.dent_count || 1), 0);

      const prompt = `You are Dentifier, an AI assistant for PDR technicians. Your job is to provide a brief, valuable second opinion based on BOTH the photos AND the technician's manual inputs.

VEHICLE: ${vehicleInfo}

TECHNICIAN-ENTERED DAMAGE DATA:
${damageDescription}

PHOTOS: ${photos.length} photo(s) provided.

YOUR TASK — respond in JSON with exactly these two fields:

1. "confidence_check": ONE short sentence (max 20 words) comparing what's visible in the photos to the entered inputs. 
   - If photos match inputs: "Photos appear consistent with the selected inputs."
   - If photos suggest shallower: "Photos suggest the damage may be shallower than selected — worth reviewing before proceeding."
   - If photos suggest deeper: "Photos suggest the damage may be deeper than selected — worth reviewing before proceeding."
   - If no photos: "No photos provided — analysis based on manual inputs only."
   - DO NOT repeat the full damage description. ONE sentence only.

2. "photo_observation": ONE sentence of genuine AI insight from the photos that the technician did NOT enter themselves. Examples: where on the panel the damage is located, whether the edge reflects cleanly, whether the damage appears consistent with the described cause. If nothing meaningful can be observed beyond what was entered, output exactly: "No additional observations from photo analysis."
   - DO NOT mention skill levels, PDR suitability, pricing, or anything the tech already entered.
   - ONE sentence only.

OUTPUT: JSON only. No other text.`;

      const response = await InvokeLLM({
        prompt,
        file_urls: photos.length > 0 ? photos : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            confidence_check: { type: "string" },
            photo_observation: { type: "string" }
          },
          required: ["confidence_check", "photo_observation"]
        }
      });

      // Compute confidence score and risk flags programmatically
      const confidenceScore = computeConfidenceScore(damageItems);
      const riskFlags = computeRiskFlags(damageItems);

      // Build the full analysis object (for downstream use)
      const fullAnalysis = {
        damage_report: {
          vehicle_panel: damageItems.map(i => i.panel).join(', '),
          dent_count: totalDentsFromData,
        },
        confidence_assessment: {
          quote_confidence: confidenceScore,
          repair_suitability: confidenceLabel(confidenceScore),
        },
        risk_assessment: {
          technical_risks: riskFlags.length > 0
            ? riskFlags.map(f => f.text)
            : ['Standard repair within your capabilities. No unusual risks identified.'],
        },
        // UI-specific fields
        _ui: {
          confidence_check: response?.confidence_check || 'No photos provided — analysis based on manual inputs only.',
          photo_observation: response?.photo_observation || 'No additional observations from photo analysis.',
          confidenceScore,
          riskFlags
        }
      };

      setAnalysis(fullAnalysis);
    } catch (err) {
      console.error('Error performing analysis:', err);
      setError(err.message || 'Failed to analyze damage');
      // Fallback
      const confidenceScore = computeConfidenceScore(damageItems);
      const riskFlags = computeRiskFlags(damageItems);
      setAnalysis({
        damage_report: {
          vehicle_panel: damageItems[0]?.panel || 'Multiple panels',
          dent_count: damageItems.reduce((sum, item) => sum + (item.dent_count || 1), 0),
        },
        confidence_assessment: {
          quote_confidence: confidenceScore,
          repair_suitability: confidenceLabel(confidenceScore),
        },
        risk_assessment: {
          technical_risks: riskFlags.length > 0 ? riskFlags.map(f => f.text) : ['Standard repair. No unusual risks identified.'],
        },
        _ui: {
          confidence_check: 'Could not complete photo analysis — based on manual inputs only.',
          photo_observation: 'No additional observations from photo analysis.',
          confidenceScore,
          riskFlags
        }
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAndView = () => {
    if (analysis) onAnalysisComplete(analysis);
  };



  if (analyzing) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <DentifierIcon className="text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Dentifier Analyzing...</h3>
          <p className="text-slate-400 mb-4">Cross-referencing photos with your inputs</p>
          <Loader2 className="w-6 h-6 text-rose-400 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (error && !analysis) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-white mb-2">Analysis Error</h3>
            <p className="text-slate-400 text-sm">{error}</p>
          </div>
          <Button onClick={onGoBack} className="w-full bg-rose-600 hover:bg-rose-700 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />Go Back to Edit
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const ui = analysis._ui || {};
  const riskFlags = ui.riskFlags || [];
  const score = ui.confidenceScore ?? analysis.confidence_assessment?.quote_confidence ?? 4;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
          <DentifierIcon className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Dentifier Analysis</h3>
          <p className="text-slate-400 text-xs">Review before saving</p>
        </div>
      </div>

      {/* 1. ASSESSMENT CONFIDENCE (combined score + label) */}
      <div className={`p-4 rounded-lg border ${confidenceBadgeClass(score)}`}>
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">Assessment Confidence</p>
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-3xl font-bold ${confidenceTextClass(score)}`}>{score}</span>
          <span className="text-slate-500 text-sm">/5</span>
        </div>
        <p className={`text-sm font-medium ${confidenceTextClass(score)}`}>{confidenceLabel(score)}</p>
      </div>

      {/* 2. CONFIDENCE CHECK (photo vs inputs) */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Photo vs Inputs</p>
              <p className="text-white text-sm">{ui.confidence_check}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. RISK FLAGS */}
      <div className="space-y-2">
        {riskFlags.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-800 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm">No unusual risks identified for this job.</p>
          </div>
        ) : (
          riskFlags.map((flag, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-200 text-sm">{flag.text}</p>
            </div>
          ))
        )}
      </div>

      {/* 4. PHOTO OBSERVATION */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Photo Observation</p>
              <p className="text-white text-sm">{ui.photo_observation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-2 pt-2">
        <Button
          onClick={handleSaveAndView}
          disabled={saving}
          className="w-full pink-gradient text-white font-semibold"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save & View Quote</>}
        </Button>
        <Button
          onClick={onGoBack}
          variant="outline"
          className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />Amend Inputs
        </Button>
      </div>
    </div>
  );
}