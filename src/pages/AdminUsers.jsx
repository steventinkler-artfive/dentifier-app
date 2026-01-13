import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Crown } from "lucide-react";
import { useAlert } from "@/components/ui/CustomAlert";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTierChange = async (userId, newTier) => {
    setSaving(userId);
    try {
      await base44.entities.User.update(userId, { subscription_tier: newTier });
      await loadUsers();
      await showAlert(`Subscription tier updated to ${newTier}`, "Success");
    } catch (error) {
      console.error("Failed to update tier:", error);
      await showAlert("Failed to update subscription tier", "Error");
    } finally {
      setSaving(null);
    }
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case 'professional':
        return 'bg-purple-600';
      case 'founder':
        return 'bg-amber-600';
      case 'early_bird':
        return 'bg-blue-600';
      default:
        return 'bg-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Users className="w-8 h-8" />
          User Management
        </h1>
        <p className="text-slate-400 mt-1">Manage user subscription tiers</p>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-white font-semibold">{user.full_name}</p>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                    </div>
                    <Badge className="bg-slate-700 text-slate-200">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={getTierBadgeColor(user.subscription_tier)}>
                    {user.subscription_tier || 'starter'}
                  </Badge>
                  
                  <Select
                    value={user.subscription_tier || 'starter'}
                    onValueChange={(value) => handleTierChange(user.id, value)}
                    disabled={saving === user.id}
                  >
                    <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="starter" className="text-white">Starter</SelectItem>
                      <SelectItem value="professional" className="text-white">Professional</SelectItem>
                      <SelectItem value="founder" className="text-white">Founder</SelectItem>
                      <SelectItem value="early_bird" className="text-white">Early Bird</SelectItem>
                    </SelectContent>
                  </Select>

                  {saving === user.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}