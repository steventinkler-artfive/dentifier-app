import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Crown, Info, Search, Calendar, CreditCard, DollarSign, CheckCircle2 } from "lucide-react";
import { useAlert } from "@/components/ui/CustomAlert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOption, setFilterOption] = useState("all");
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

  const getSubscriptionStatus = (tier) => {
    if (tier === 'professional' || tier === 'early_bird') return 'Active';
    if (tier === 'founder' || tier === 'starter') return 'Free';
    return 'Free';
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-600';
      case 'Cancelled':
        return 'bg-gray-600';
      case 'Past Due':
        return 'bg-red-600';
      case 'Trial':
        return 'bg-blue-600';
      case 'Free':
        return 'bg-gray-600';
      default:
        return 'bg-gray-600';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredUsers = users.filter((user) => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower);

    // Status filter
    const tier = user.subscription_tier || 'starter';
    const status = getSubscriptionStatus(tier);
    
    let matchesFilter = true;
    if (filterOption === 'active') matchesFilter = status === 'Active';
    else if (filterOption === 'cancelled') matchesFilter = status === 'Cancelled';
    else if (filterOption === 'past_due') matchesFilter = status === 'Past Due';
    else if (filterOption === 'free') matchesFilter = tier === 'starter';
    else if (filterOption === 'founder') matchesFilter = tier === 'founder';
    else if (filterOption === 'early_bird') matchesFilter = tier === 'early_bird';

    return matchesSearch && matchesFilter;
  });

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

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name, email, or Stripe Customer ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-white"
          />
        </div>
        <Select value={filterOption} onValueChange={setFilterOption}>
          <SelectTrigger className="w-full sm:w-64 bg-slate-900 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">All Users</SelectItem>
            <SelectItem value="active" className="text-white">Active Subscribers</SelectItem>
            <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
            <SelectItem value="past_due" className="text-white">Past Due</SelectItem>
            <SelectItem value="free" className="text-white">Free Tier Only</SelectItem>
            <SelectItem value="founder" className="text-white">Founder Tier</SelectItem>
            <SelectItem value="early_bird" className="text-white">Early Bird</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const subscriptionStatus = getSubscriptionStatus(user.subscription_tier || 'starter');
          
          return (
          <Card key={user.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-700">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <p className="text-white font-semibold text-lg">{user.full_name}</p>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                    </div>
                    <Badge className="bg-slate-700 text-slate-200">
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>Joined: {formatDate(user.created_date)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={getStatusBadgeColor(subscriptionStatus)}>
                    {subscriptionStatus}
                  </Badge>
                  <Badge className={getTierBadgeColor(user.subscription_tier)}>
                    {user.subscription_tier || 'starter'}
                  </Badge>
                </div>
              </div>

              {/* Subscription Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <CreditCard className="w-4 h-4" />
                    <span>Stripe Customer ID</span>
                  </div>
                  <p className="text-white text-sm font-medium">-</p>
                </div>

                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Next Billing Date</span>
                  </div>
                  <p className="text-white text-sm font-medium">-</p>
                </div>

                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Total Revenue</span>
                  </div>
                  <p className="text-white text-sm font-medium">£0.00</p>
                </div>

                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Last Payment Date</span>
                  </div>
                  <p className="text-white text-sm font-medium">-</p>
                </div>
              </div>

              {/* Tier Management Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <span>Subscription Tier:</span>
                </div>
                <Select
                  value={pendingChanges[user.id] || user.subscription_tier || 'starter'}
                  onValueChange={(value) => handleTierChange(user.id, value)}
                  disabled={saving === user.id}
                >
                  <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
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
            </CardContent>
          </Card>
        );
        })}
      </div>
    </div>
  );
}