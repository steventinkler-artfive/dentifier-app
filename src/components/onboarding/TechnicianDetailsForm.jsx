import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const PDR_TOOLS = [
  "PDR rods & flat bars", "Knockdown tools", "Glue pulling", "Slide hammer",
  "Mini lifter", "Lateral tension tools", "Fog light", "Line board",
  "LED lights/UV lights", "Heat gun/hair dryer", "Polisher", "Nibbing block",
  "Blending hammers", "Detail spray/lubricants"
];

const DAMAGE_SKILL_TYPES = [
  "Door dings and small parking damage",
  "Hail damage",
  "Large conventional dents",
  "Creases and sharp dents",
  "Body line repairs",
  "Collision/impact damage"
];

const SKILL_LEVELS = ["Don't do this type", "Beginner", "Intermediate", "Advanced", "Expert"];

const VEHICLE_TYPES = [
  "Standard passenger cars",
  "Luxury vehicles",
  "Commercial vehicles/trucks",
  "Motorcycles",
  "RVs/large vehicles",
  "Classic/vintage cars"
];

export default function TechnicianDetailsForm({ formData, onChange }) {
  const handleArrayChange = (field, value, checked) => {
    const currentArray = formData[field] || [];
    if (checked) {
      onChange(field, [...currentArray, value]);
    } else {
      onChange(field, currentArray.filter(item => item !== value));
    }
  };

  const handleSkillLevelChange = (type, level) => {
    const skills = formData.specialized_damage_skills || [];
    const existingSkillIndex = skills.findIndex(skill => skill.type === type);
    let newSkills;
    if (existingSkillIndex > -1) {
      newSkills = [...skills];
      newSkills[existingSkillIndex] = { type, level };
    } else {
      newSkills = [...skills, { type, level }];
    }
    onChange('specialized_damage_skills', newSkills);
  };

  const getSkillLevel = (type) => {
    const skill = formData.specialized_damage_skills?.find(s => s.type === type);
    return skill?.level || SKILL_LEVELS[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Profile</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Years of Experience</Label>
            <Input
              type="number"
              min="0"
              value={formData.years_experience || ''}
              onChange={e => onChange('years_experience', parseFloat(e.target.value) || 0)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="e.g., 5"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">Maximum Dent Size You Work On</Label>
            <Select
              value={formData.max_supported_dent_size || 'all sizes'}
              onValueChange={value => onChange('max_supported_dent_size', value)}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="up to 80mm" className="text-white">Up to 80mm</SelectItem>
                <SelectItem value="up to 120mm" className="text-white">Up to 120mm</SelectItem>
                <SelectItem value="up to 200mm" className="text-white">Up to 200mm</SelectItem>
                <SelectItem value="all sizes" className="text-white">All Sizes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="aluminum-panels"
              checked={formData.works_on_aluminum_panels || false}
              onChange={e => onChange('works_on_aluminum_panels', e.target.checked)}
              className="w-4 h-4 rounded border-2 border-slate-600 bg-slate-800"
            />
            <Label htmlFor="aluminum-panels" className="text-white">I work on aluminum panels</Label>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Available PDR Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          {PDR_TOOLS.map(tool => (
            <div key={tool} className="flex items-center space-x-2">
              <Checkbox
                id={tool}
                checked={(formData.available_pdr_tools || []).includes(tool)}
                onCheckedChange={checked => handleArrayChange('available_pdr_tools', tool, checked)}
                className="border-2 border-slate-600 data-[state=checked]:bg-green-600"
              />
              <Label htmlFor={tool} className="text-sm text-slate-300">{tool}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Damage Type Skills *</h3>
        <p className="text-slate-400 text-sm mb-3">Set your skill level for each damage type</p>
        <div className="space-y-3">
          {DAMAGE_SKILL_TYPES.map(type => (
            <div key={type} className="grid grid-cols-2 items-center gap-4">
              <Label className="text-sm text-slate-300">{type}</Label>
              <Select
                value={getSkillLevel(type)}
                onValueChange={level => handleSkillLevelChange(type, level)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {SKILL_LEVELS.map(level => (
                    <SelectItem key={level} value={level} className="text-white">{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Primary Vehicle Types</h3>
        <div className="grid grid-cols-2 gap-2">
          {VEHICLE_TYPES.map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={type}
                checked={(formData.primary_vehicle_types || []).includes(type)}
                onCheckedChange={checked => handleArrayChange('primary_vehicle_types', type, checked)}
                className="border-2 border-slate-600 data-[state=checked]:bg-green-600"
              />
              <Label htmlFor={type} className="text-sm text-slate-300">{type}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}