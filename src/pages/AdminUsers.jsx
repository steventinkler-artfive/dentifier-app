import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Crown, Info } from "lucide-react";
import { useAlert } from "@/components/ui/CustomAlert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
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

  const handleTierChange = (userId, newTier) => {
    setPendingChanges(prev => ({ ...prev, [userId]: newTier }));
  };

  const saveTierChange = async (userId) => {
    const newTier = pendingChanges[userId];
    if (!newTier) return;

    setSaving(userId);
    try {
      await base44.entities.User.update(userId, { subscription_tier: newTier });
      await loadUsers();
      setPendingChanges(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      await showAlert("Subscription tier updated", "Success");
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
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users className="w-8 h-8" />
            User Management
          </h1>
          <button
            onClick={() => setInfoOpen(!infoOpen)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Subscription tier information"
          >
            <Info className="w-5 h-5 text-blue-400" />
          </button>
        </div>
        <p className="text-slate-400">Manage user subscription tiers</p>
      </div>

      {/* Subscription Tier Guide */}
      <Collapsible open={infoOpen} onOpenChange={setInfoOpen}>
        <CollapsibleContent>
          <Card className="mb-6 bg-blue-900/20 border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-200 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Subscription Tier Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-white font-semibold">Starter (£20/month)</h3>
                <ul className="text-blue-200 text-sm space-y-1 ml-4">
                  <li>• Basic features with Dentifier branding on quotes</li>
                  <li>• Cannot upload custom logo</li>
                  <li>• Basic reports only</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold">Professional (£35/month)</h3>
                <p className="text-blue-200 text-sm">Everything in Starter, plus:</p>
                <ul className="text-blue-200 text-sm space-y-1 ml-4">
                  <li>• Upload custom business logo</li>
                  <li>• Remove Dentifier header branding</li>
                  <li>• Advanced reports with filters and CSV export</li>
                  <li>• Priority support</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Founder (FREE forever)
                  <Badge className="bg-amber-600">Beta Testers</Badge>
                </h3>
                <ul className="text-blue-200 text-sm space-y-1 ml-4">
                  <li>• Beta testers only</li>
                  <li>• Full Professional features for life</li>
                  <li>• Reserved for early supporters who helped build Dentifier</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Early Bird (£20/month forever)
                  <Badge className="bg-blue-600">First 30 Only</Badge>
                </h3>
                <ul className="text-blue-200 text-sm space-y-1 ml-4">
                  <li>• Launch offer - first 30 sign-ups only</li>
                  <li>• Professional features at Starter price</li>
                  <li>• Locked in at £20/month for life (saves £180/year)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

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
                    value={pendingChanges[user.id] || user.subscription_tier || 'starter'}
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

                  {pendingChanges[user.id] && (
                    <Button
                      onClick={() => saveTierChange(user.id)}
                      disabled={saving === user.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      {saving === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
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