import React, { useState, useEffect } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { User, UserSetting, GlobalSetting } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Target, Clock, CheckCircle, RefreshCw, ArrowRight, ArrowLeft } from "lucide-react";

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
      <path d="M22.98,9.75h-4.22c-.43,0-.8.29-.9.67l-.42,1.29c-.16.6-.84,1.11-1.5,1.11h-2.21c-.43,0-.81.29-.92.72l-.86,3.41c-.07.28-.01.58.17.81s-.45.37.75.37h3.62c3.04,0,6.05-2.39,6.85-5.41l.55-1.77c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37ZM22.19,12.38c-.67,2.51-3.22,4.54-5.7,4.54h-3.3l.73-2.9h2.02c1.19,0,2.35-.87,2.65-1.99l.36-1.09h3.69l-.44,1.43Z"/>
      <path d="M9.92,12.82h-2.67l.58-2.03c.08-.29.02-.59-.16-.82s-.45-.37-.75-.37H2.75c-.16,0-.66,0-.81.58l-.69,2.2L.03,16.93c-.08.29-.02.59.16.82s.45.37.75.37h8.11c.43,0,.81-.29.92-.72l.86-3.41c.07-.28,0-.58-.17-.81s-.45-.36-.75-.36ZM8.86,16.92H1.28l1.12-4.21.6-1.92h3.57l-.57,2.04c-.08.29-.01.58.17.82.18.23.45.37.75.37h2.67l-.73,2.9Z"/>
    </g>
  </svg>
);

export default function DamageAnalysis({ photos, damageItems, vehicle, onAnalysisComplete, onGoBack }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [globalSettings, setGlobalSettings] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentUser = await User.me();
      
      // Load user settings (for technician profile, max dent size, etc.)
      const userSettingsData = await UserSetting.filter({ user_email: currentUser.email });
      if (userSettingsData.length > 0) {
        setUserSettings(userSettingsData[0]);
      } else {
        setError('User settings not found. Please configure your settings first.');
        return;
      }
      
      // Load global settings (for AI instructions)
      const globalSettingsData = await GlobalSetting.filter({ setting_key: 'main' });
      if (globalSettingsData.length > 0) {
        setGlobalSettings(globalSettingsData[0]);
      } else {
        setError('Global AI settings not configured. Please contact your administrator.');
        return;
      }
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
      // Validate required data
      if (!damageItems || damageItems.length === 0) {
        throw new Error('No damage items provided for analysis');
      }

      // Use global settings for AI instructions
      const analysisInstructions = globalSettings?.llm_analysis_instructions || '';
      
      if (!analysisInstructions) {
        throw new Error('Analysis instructions not configured. Please contact your administrator.');
      }

      const vehicleInfo = vehicle 
        ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.color ? ` (${vehicle.color})` : ''}`
        : 'Vehicle details not provided';

      // Build structured damage description from damage items
      const damageDescription = damageItems.map((item, index) => {
        const parts = [`Item ${index + 1}: ${item.panel}`];
        if (item.damage_type) parts.push(`Type: ${item.damage_type}`);
        if (item.size_range) parts.push(`Size: ${item.size_range}`);
        if (item.dent_count > 1) parts.push(`Count: ${item.dent_count} dents`);
        else parts.push(`Count: 1 dent`);
        if (item.material) parts.push(`Material: ${item.material}`);
        if (item.access_type) parts.push(`Access: ${item.access_type}`);
        if (item.depth) parts.push(`Depth: ${item.depth}`);
        if (item.affects_body_line) parts.push(`Affects Body Line: Yes`);
        if (item.notes) parts.push(`Notes: ${item.notes}`);
        return parts.join(' | ');
      }).join('\n');

      // Calculate total dents from structured data
      const totalDentsFromData = damageItems.reduce((sum, item) => sum + (item.dent_count || 1), 0);

      // Check if any damage items exceed technician's stated max size
      const maxSupportedSize = userSettings?.max_supported_dent_size || 'all sizes';
      const sizeFlags = [];
      
      if (maxSupportedSize !== 'all sizes') {
        const sizeMap = {
          'up to 10mm': 10,
          'up to 25mm': 25,
          'up to 50mm': 50,
          'up to 80mm': 80,
          'up to 120mm': 120,
          'up to 200mm': 200,
          'up to 300mm': 300,
          'up to 500mm': 500,
          'up to 750mm': 750,
          'up to 1000mm': 1000
        };

        const techMaxMM = sizeMap[maxSupportedSize] || 10000;

        damageItems.forEach((item, index) => {
          if (item.size_range) {
            const itemSizeStr = item.size_range;
            const match = itemSizeStr.match(/(\d+)mm/g);
            if (match && match.length > 0) {
              const maxInRange = Math.max(...match.map(m => parseInt(m)));
              if (maxInRange > techMaxMM) {
                sizeFlags.push(`Damage item ${index + 1} (${item.panel}): Size ${itemSizeStr} exceeds your stated maximum of ${maxSupportedSize}.`);
              }
            }
          }
        });
      }

      // Build detailed technician profile with skill matrix
      // Only include skills/tools RELEVANT to the damage types and repair methods on this job
      const selectedDamageTypes = [...new Set(damageItems.map(i => (i.damage_type || '').toLowerCase()))];
      const selectedRepairMethods = [...new Set(damageItems.map(i => (i.repair_method || '').toLowerCase()))];
      const hasBodyLineDamage = damageItems.some(i => i.affects_body_line);
      const usesGluePull = selectedRepairMethods.some(m => m.includes('glue pull'));

      // Filter tools to only those relevant to selected repair methods
      let relevantTools = [];
      if (userSettings?.available_pdr_tools?.length > 0) {
        relevantTools = userSettings.available_pdr_tools.filter(tool => {
          const t = tool.toLowerCase();
          if (usesGluePull && (t.includes('glue') || t.includes('pull'))) return true;
          if (!usesGluePull && (t.includes('rod') || t.includes('tap') || t.includes('pick') || t.includes('bar') || t.includes('hook'))) return true;
          // Always include general tools
          if (t.includes('light') || t.includes('lamp') || t.includes('board')) return true;
          return false;
        });
        // Fallback: if filter removes everything, just pass all tools
        if (relevantTools.length === 0) relevantTools = userSettings.available_pdr_tools;
      }

      // Filter skills to only those directly relevant to the damage types/methods on this job
      const relevantSkills = (userSettings?.specialized_damage_skills || []).filter(skill => {
        const skillLower = skill.type.toLowerCase();
        // Match against selected damage types
        const matchesDamageType = selectedDamageTypes.some(dt =>
          skillLower.includes(dt) || dt.includes(skillLower) ||
          (skillLower.includes('door ding') && dt.includes('door ding')) ||
          (skillLower.includes('hail') && dt.includes('hail')) ||
          (skillLower.includes('crease') && dt.includes('crease'))
        );
        // Include body line skill only if body line damage is present
        const isBodyLineSkill = skillLower.includes('body line');
        if (isBodyLineSkill) return hasBodyLineDamage;
        // Include glue pull skill only if glue pull method is selected
        const isGluePullSkill = skillLower.includes('glue');
        if (isGluePullSkill) return usesGluePull;
        return matchesDamageType;
      });

      let technicianContext = `
TECHNICIAN PROFILE AND BUSINESS CONTEXT:
- Years of Experience: ${userSettings?.years_experience || 'Not specified'} years
- Works on Aluminium Panels: ${userSettings?.works_on_aluminum_panels ? 'Yes' : 'No'}
- Maximum Dent Size You Work On: ${maxSupportedSize}
${sizeFlags.length > 0 ? `\nWARNING - Size Flags:\n${sizeFlags.join('\n')}` : ''}
`;

      if (relevantTools.length > 0) {
        technicianContext += `- Relevant Available Tools: ${relevantTools.join(', ')}\n`;
      }

      if (relevantSkills.length > 0) {
        technicianContext += `\nSPECIALIZED DAMAGE SKILLS RELEVANT TO THIS JOB:\n`;
        relevantSkills.forEach(skill => {
          technicianContext += `  * ${skill.type}: ${skill.level}\n`;
        });
        technicianContext += `\nIMPORTANT: Consider the technician's skill level for each damage type listed above when assessing Technical Risks and Repair Suitability.\n`;
      }

      // Cross-reference damage items with RELEVANT skills only
      const skillWarnings = [];
      relevantSkills.forEach(skill => {
        damageItems.forEach((item, index) => {
          const skillLower = skill.type.toLowerCase();
          const isBodyLineSkill = skillLower.includes('body line');

          if (isBodyLineSkill && item.affects_body_line) {
            if (skill.level === "Don't do this type") {
              skillWarnings.push(`⚠️ CRITICAL: Damage item ${index + 1} (${item.panel} - Body Line) - Technician indicates they DON'T do body line repairs.`);
            } else if (skill.level === "Beginner") {
              skillWarnings.push(`⚠️ WARNING: Damage item ${index + 1} (${item.panel} - Body Line) - Technician is BEGINNER at body line repairs. This significantly increases technical risk.`);
            }
          } else if (!isBodyLineSkill && item.damage_type) {
            const damageTypeLower = item.damage_type.toLowerCase();
            const matches = skillLower.includes(damageTypeLower) || damageTypeLower.includes(skillLower);
            if (matches) {
              if (skill.level === "Don't do this type") {
                skillWarnings.push(`⚠️ CRITICAL: Damage item ${index + 1} (${item.panel} - ${item.damage_type}) - Technician indicates they DON'T do this type of repair.`);
              } else if (skill.level === "Beginner") {
                skillWarnings.push(`⚠️ WARNING: Damage item ${index + 1} (${item.panel} - ${item.damage_type}) - Technician's skill level is BEGINNER for this damage type.`);
              }
            }
          }
        });
      });

      if (skillWarnings.length > 0) {
        technicianContext += `\nSKILL LEVEL WARNINGS FOR THIS ASSESSMENT:\n${skillWarnings.join('\n')}\n`;
      }

      const prompt = `You are Dentifier, an AI damage analysis assistant for PDR (Paintless Dent Repair) technicians.

VEHICLE: ${vehicleInfo}

${analysisInstructions}

═══════════════════════════════════════════════════════════════
CRITICAL: STRUCTURED DAMAGE DATA PROVIDED BY TECHNICIAN
═══════════════════════════════════════════════════════════════

The technician has provided detailed, structured information about EACH damage item:

${damageDescription}

**TOTAL DENT COUNT (from structured data): ${totalDentsFromData}**

EXTREMELY IMPORTANT - DENT COUNT RULES:
1. The technician has ALREADY counted and specified the exact number of dents
2. Each damage item has a "dent_count" field - this is the AUTHORITATIVE count
3. DO NOT try to count dents from photos - photos may show the same dent from multiple angles
4. If you see ${photos.length} photos, this does NOT mean ${photos.length} dents
5. Multiple photos are typically different angles of the SAME damage
6. YOU MUST use the dent_count from the structured data above: ${totalDentsFromData} total dents
7. In your dent_summary, state the EXACT number from the structured data

PHOTOS: ${photos.length} photos provided (these are supporting evidence for the ${totalDentsFromData} dent(s) listed above)

═══════════════════════════════════════════════════════════════

${technicianContext}

CRITICAL ANALYSIS REQUIREMENTS:
1. Use the EXACT dent_count from the structured damage items (${totalDentsFromData} total)
2. For EACH damage item, cross-reference its damage_type against the technician's Specialized Damage Skills
3. If the technician's skill level for a damage type is "Beginner" or "Don't do this type", this MUST be reflected in:
   - Lower repair_suitability rating
   - Explicit mention in technical_risks
   - Lower quote_confidence
4. Consider the technician's years of experience and available tools when assessing difficulty
5. Flag any dents exceeding the technician's stated maximum size

CRITICAL: You MUST always provide technical_risks in your risk_assessment. Never omit this field.

TECHNICAL RISKS RULES — these are driven by the manually entered flags, NOT by photo interpretation:
- If has_stretched_metal=true on ANY item: you MUST include "Stretched metal present — full restoration to factory finish may not be achievable." as a risk. This is MANDATORY.
- If affects_body_line=true on ANY item: you MUST include a risk about the body line complexity.
- If repair_method is "Limited Tool Access": include a risk about limited access increasing difficulty.
- If repair_method is "Glue Pull Only": include a note about glue pull limitations if tool finishing is also needed.
- ONLY use "Standard repair within your capabilities. No unusual risks identified." if has_stretched_metal=false AND affects_body_line=false AND repair_method is NOT "Limited Tool Access" or "Glue Pull Only" for complex damage.

DEPTH INTERPRETATION GUIDELINES:
- "Shallow" dents are the EASIEST to repair - mention this is favorable for PDR
- "Medium" dents require more skill but are still standard PDR work
- "Deep/Sharp" dents are CHALLENGING and may require advanced techniques
- DO NOT say shallow dents are challenging - this is incorrect
- Shallow = Easy/Favorable, Medium = Moderate, Deep = Difficult

ADDITIONAL NOTES REQUIREMENTS:
Your additional_notes field must be a concise factual summary of the key manually-entered parameters — NOT a re-interpretation of photos. Format it as a plain confirmation of what was entered, for example: "Medium depth standard dent on the rear quarter panel, glue pull access required, stretched metal present."
- Always include: depth level, damage type, repair method
- If stretched metal: include "stretched metal present"
- If body line: include "affects body line"
- If aluminium: include "aluminium panel"
- Keep to 1-2 short sentences. Factual only — no opinions on difficulty or suitability here (those go in other fields).

GLUE PULL LIABILITY NOTICE (MANDATORY): If ANY damage item has repair_method = "Glue Pull Only", you MUST append the following to the end of additional_notes, exactly as written:
"PLEASE NOTE: Glue pulling carries a small risk of paint lift. While rare, by accepting this job the vehicle owner acknowledges and accepts this risk. The technician accepts no liability for such occurrences."
This notice is tech-facing only and must appear without exception when glue pull is selected.

${sizeFlags.length > 0 ? '\nCRITICAL: ' + sizeFlags.join(' ') + ' Mention this in your additional_notes and consider lowering repair_suitability if appropriate.' : ''}

${skillWarnings.length > 0 ? '\nCRITICAL SKILL WARNINGS: ' + skillWarnings.join(' ') + ' These MUST be addressed in your risk_assessment and additional_notes.' : ''}

MANUAL INPUT FLAGS — THESE MUST DRIVE technical_risks AND additional_notes (not photo analysis):
${damageItems.map((item, idx) => {
  const flags = [];
  if (item.has_stretched_metal) flags.push('HAS_STRETCHED_METAL=TRUE');
  if (item.affects_body_line) flags.push('AFFECTS_BODY_LINE=TRUE');
  if (item.repair_method === 'Limited Tool Access') flags.push('REPAIR_METHOD=LIMITED_TOOL_ACCESS');
  if (item.repair_method === 'Glue Pull Only') flags.push('REPAIR_METHOD=GLUE_PULL_ONLY');
  return `Item ${idx + 1} (${item.panel}): depth=${item.depth || 'not set'}, repair_method=${item.repair_method || 'not set'}, material=${item.material || 'Steel'}${flags.length > 0 ? ', FLAGS: ' + flags.join(', ') : ', FLAGS: none'}`;
}).join('\n')}

Provide a professional damage analysis report that genuinely reflects this technician's capabilities and experience level.

REMINDER: dent_count in your response MUST be ${totalDentsFromData} (from the structured data), NOT the number of photos (${photos.length}).`;

      console.log('Performing analysis with prompt:', prompt);

      const response = await InvokeLLM({
        prompt,
        file_urls: photos.length > 0 ? photos : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            damage_report: {
              type: "object",
              properties: {
                vehicle_panel: { type: "string" },
                dent_location: { type: "string" },
                dent_count: { type: "integer" },
                dent_summary: { type: "string" },
                dent_details: {
                  type: "object",
                  properties: {
                    size_range: { type: "string" },
                    depth: { type: "string" },
                    access_difficulty: { type: "string" }
                  }
                }
              },
              required: ["dent_summary"]
            },
            confidence_assessment: {
              type: "object",
              properties: {
                quote_confidence: { 
                  type: "integer",
                  minimum: 1,
                  maximum: 5,
                  description: "Confidence level 1-5, where 5 is highest"
                },
                repair_suitability: {
                  type: "string",
                  enum: ["Excellent for PDR", "Good for PDR", "Moderate - May require additional work", "Difficult - High risk", "Not suitable for PDR"]
                },
                additional_notes: { type: "string" }
              },
              required: ["quote_confidence", "repair_suitability"]
            },
            risk_assessment: {
              type: "object",
              properties: {
                technical_risks: {
                  type: "array",
                  items: { type: "string" },
                  description: "MANDATORY: List of specific technical risks and guidance for this repair. If no risks, provide: ['Standard repair within your capabilities. No unusual risks identified.']"
                },
                requires_special_tools: { type: "boolean" },
                estimated_difficulty: {
                  type: "string",
                  enum: ["Easy", "Moderate", "Difficult", "Very Difficult"]
                }
              },
              required: ["technical_risks"]
            }
          },
          required: ["damage_report", "confidence_assessment", "risk_assessment"]
        }
      });

      console.log('Analysis response:', response);

      if (!response || !response.damage_report) {
        throw new Error('Invalid analysis response from AI');
      }

      // Override the dent_count from LLM with the actual count from structured data
      if (response.damage_report) {
        response.damage_report.dent_count = totalDentsFromData;
      }

      setAnalysis(response);
    } catch (err) {
      console.error('Error performing analysis:', err);
      const errorMessage = err.message || 'Failed to analyze damage';
      setError(errorMessage);
      
      // Provide a basic fallback analysis
      const fallbackAnalysis = {
        damage_report: {
          vehicle_panel: damageItems.length > 0 ? damageItems[0].panel : "Multiple panels",
          dent_location: "As specified in damage items",
          dent_count: damageItems.reduce((sum, item) => sum + (item.dent_count || 1), 0),
          dent_summary: damageItems.map((item, idx) => 
            `${idx + 1}. ${item.panel}${item.damage_type ? ` - ${item.damage_type}` : ''}${item.dent_count && item.dent_count > 1 ? ` (${item.dent_count} dents)` : ' (1 dent)'}${item.notes ? `: ${item.notes}` : ''}`
          ).join('; ') || 'Damage details provided by technician'
        },
        confidence_assessment: {
          quote_confidence: 3,
          repair_suitability: "Moderate - May require additional work",
          additional_notes: `Analysis failed (${errorMessage}), using structured damage data provided by technician. Please review carefully before finalizing quote.`
        }
      };
      
      setAnalysis(fallbackAnalysis);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    }
  };

  const handleContinue = () => {
    if (analysis) {
      onAnalysisComplete(analysis);
    }
  };

  if (analyzing) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <DentifierIcon className="text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Dentifier Analyzing...</h3>
          <p className="text-slate-400 mb-4">Processing damage information and photos</p>
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
          <Button onClick={handleGoBack} className="w-full bg-rose-600 hover:bg-rose-700 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back to Edit
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-4">
      {error && (
        <Card className="bg-yellow-900/20 border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-200 text-sm mb-2">{error}</p>
                <p className="text-yellow-300/80 text-xs">Using fallback analysis based on your damage items. Please review carefully.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {photos && photos.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Uploaded Photos ({photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <img 
                  key={index} 
                  src={photo} 
                  alt={`Damage ${index + 1}`}
                  loading="lazy"
                  className="w-full aspect-square object-cover rounded-lg"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            Analysis Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-rose-400" />
                <span className="text-slate-300 text-sm">Dent Count</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {analysis.damage_report?.dent_count || damageItems.reduce((sum, item) => sum + (item.dent_count || 1), 0)}
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-slate-300 text-sm">Confidence</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {analysis.confidence_assessment?.quote_confidence || 3}/5
              </p>
            </div>
          </div>

          {analysis.damage_report && (
            <div>
              <p className="text-slate-300 text-sm font-medium mb-2">Damage Summary</p>
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-slate-200 leading-relaxed">
                  {analysis.damage_report.dent_summary}
                </p>
              </div>
            </div>
          )}

          {analysis.confidence_assessment?.repair_suitability && (
            <div>
              <p className="text-slate-300 text-sm font-medium mb-2">PDR Suitability</p>
              <Badge className={`
                ${analysis.confidence_assessment.repair_suitability.includes('Excellent') ? 'bg-green-900 text-green-300' : ''}
                ${analysis.confidence_assessment.repair_suitability.includes('Good') ? 'bg-blue-900 text-blue-300' : ''}
                ${analysis.confidence_assessment.repair_suitability.includes('Moderate') ? 'bg-yellow-900 text-yellow-300' : ''}
                ${analysis.confidence_assessment.repair_suitability.includes('Difficult') ? 'bg-orange-900 text-orange-300' : ''}
                ${analysis.confidence_assessment.repair_suitability.includes('Not suitable') ? 'bg-red-900 text-red-300' : ''}
              `}>
                {analysis.confidence_assessment.repair_suitability}
              </Badge>
            </div>
          )}

          {analysis.confidence_assessment?.additional_notes && (
            <div>
              <p className="text-slate-300 text-sm font-medium mb-2">Analysis Notes</p>
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-slate-200 text-sm leading-relaxed">
                  {analysis.confidence_assessment.additional_notes}
                </p>
              </div>
            </div>
          )}

          {analysis.risk_assessment?.technical_risks && analysis.risk_assessment.technical_risks.length > 0 && (
            <div>
              <p className="text-slate-300 text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Technical Risks
              </p>
              <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                {analysis.risk_assessment.technical_risks.map((risk, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span className="text-slate-200 text-sm">{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 space-y-3">
            <Button 
              onClick={handleContinue} 
              className="w-full pink-gradient text-white font-semibold"
            >
              Continue to Quote
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Button 
              onClick={handleGoBack} 
              variant="outline" 
              className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Amend Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}