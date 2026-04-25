import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Info, Search, Calendar, CreditCard, DollarSign, CheckCircle2, ChevronDown, ArrowLeft, Plus, Edit2, Trash2, Key, Mail, Ban, CheckCircle } from "lucide-react";
import { useAlert } from "@/components/ui/CustomAlert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOption, setFilterOption] = useState("all");
  const [expandedUsers, setExpandedUsers] = useState({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({ full_name: "", email: "", role: "user", subscription_tier: "starter" });
  const [resettingPassword, setResettingPassword] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(null);
  const { showAlert, showConfirm } = useAlert();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      if (user.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      
      loadUsers();
    } catch (error) {
      console.error("Access check failed:", error);
      navigate(createPageUrl('Dashboard'));
    }
  };

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      console.error("Failed to load users:", error);
      await showAlert("Failed to load users. Please try refreshing the page.", "Error");
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

  const handleAddUser = async () => {
    if (!newUser.full_name || !newUser.email) {
      await showAlert("Please fill in all required fields", "Error");
      return;
    }

    try {
      // Send invitation
      await base44.users.inviteUser(newUser.email, newUser.role);
      
      // Send welcome email immediately after invitation
      try {
        await base44.functions.invoke('sendWelcomeEmail', {
          email: newUser.email,
          fullName: newUser.full_name
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
      
      await loadUsers();
      setShowAddDialog(false);
      setNewUser({ full_name: "", email: "", role: "user", subscription_tier: "starter" });
      await showAlert("Invitation sent successfully! Welcome email also sent.", "Success");
    } catch (error) {
      console.error("Failed to add user:", error);
      await showAlert("Failed to add user: " + error.message, "Error");
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      await base44.entities.User.update(editingUser.id, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role,
        subscription_tier: editingUser.subscription_tier,
        subscription_status: editingUser.subscription_status
      });
      await loadUsers();
      setShowEditDialog(false);
      setEditingUser(null);
      await showAlert("User updated successfully", "Success");
    } catch (error) {
      console.error("Failed to update user:", error);
      await showAlert("Failed to update user", "Error");
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = await showConfirm(
      `⚠️ PERMANENT DELETION - Are you sure?`,
      `This will permanently delete all data for ${user.full_name}. This cannot be undone. Only use this for GDPR deletion requests. Type DELETE to confirm.`
    );

    if (!confirmed) return;

    try {
      await base44.entities.User.delete(user.id);
      await loadUsers();
      await showAlert("User permanently deleted", "Success");
    } catch (error) {
      console.error("Failed to delete user:", error);
      await showAlert("Failed to delete user", "Error");
    }
  };

  const handleToggleSubscriptionStatus = async (user) => {
    const isActive = user.subscription_status !== 'cancelled';
    const newStatus = isActive ? 'cancelled' : 'active';
    
    const confirmed = await showConfirm(
      isActive ? 'Deactivate User Subscription?' : 'Reactivate User Subscription?',
      isActive 
        ? `${user.full_name} will lose access to core features. They can view past data but cannot create new assessments.`
        : `${user.full_name} will regain full access to Dentifier.`
    );

    if (!confirmed) return;

    setTogglingStatus(user.id);
    try {
      await base44.entities.User.update(user.id, { subscription_status: newStatus });
      
      // Send appropriate email notification
      if (newStatus === 'cancelled') {
        await base44.functions.invoke('sendSubscriptionCancelledEmail', {
          email: user.email,
          fullName: user.full_name
        });
      } else {
        await base44.functions.invoke('sendSubscriptionReactivatedEmail', {
          email: user.email,
          fullName: user.full_name
        });
      }
      
      await loadUsers();
      await showAlert(
        isActive ? "User subscription deactivated" : "User subscription reactivated", 
        "Success"
      );
    } catch (error) {
      console.error("Failed to toggle subscription status:", error);
      await showAlert("Failed to update subscription status", "Error");
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleResetPassword = async (user) => {
    const isOAuthUser = user.auth_provider === 'google' || !user.password;
    
    if (isOAuthUser) {
      await showAlert("This user logs in with Google OAuth - password reset not available", "Info");
      return;
    }

    const confirmed = await showConfirm(
      `Send password reset email to ${user.full_name}?`,
      `An email will be sent to ${user.email} with password reset instructions.`
    );

    if (!confirmed) return;

    setResettingPassword(user.id);
    try {
      await base44.functions.invoke('sendPasswordReset', { 
        email: user.email,
        isAdminReset: true 
      });
      await showAlert(`Password reset email sent to ${user.email}`, "Success");
    } catch (error) {
      console.error("Failed to send reset email:", error);
      await showAlert("Failed to send password reset email", "Error");
    } finally {
      setResettingPassword(null);
    }
  };

  const getAuthMethod = (user) => {
    if (user.auth_provider === 'google') {
      return { method: 'Google OAuth', color: 'bg-blue-600' };
    }
    return { method: 'Email/Password', color: 'bg-slate-600' };
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

  const getSubscriptionStatus = (user) => {
    // Check subscription_status field first
    if (user.subscription_status === 'cancelled') return 'Inactive';
    if (user.subscription_status === 'past_due') return 'Past Due';
    if (user.subscription_status === 'active') return 'Active';
    
    // Fallback for users without subscription_status set
    const tier = user.subscription_tier || 'starter';
    if (tier === 'professional' || tier === 'early_bird') return 'Active';
    return 'Active'; // All users are active by default
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-600';
      case 'Inactive':
        return 'bg-slate-600';
      case 'Past Due':
        return 'bg-orange-600';
      default:
        return 'bg-slate-600';
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
    const status = getSubscriptionStatus(user);
    const tier = user.subscription_tier || 'starter';
    
    let matchesFilter = true;
    if (filterOption === 'active') matchesFilter = status === 'Active';
    if (filterOption === 'inactive') matchesFilter = status === 'Inactive';
    if (filterOption === 'past_due') matchesFilter = status === 'Past Due';
    if (filterOption === 'free') matchesFilter = tier === 'starter';
    if (filterOption === 'founder') matchesFilter = tier === 'founder';
    if (filterOption === 'early_bird') matchesFilter = tier === 'early_bird';

    return matchesSearch && matchesFilter;
  });

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link to={createPageUrl("Settings")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Settings
            </Button>
          </Link>
        </div>
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
        <p className="text-slate-400">Manage user accounts and subscription tiers</p>
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

      {/* Search, Filter, and Add User Button */}
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
          <SelectTrigger className="w-full sm:w-48 bg-slate-900 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">All Users</SelectItem>
            <SelectItem value="active" className="text-white">Active Subscribers</SelectItem>
            <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
            <SelectItem value="past_due" className="text-white">Past Due</SelectItem>
            <SelectItem value="free" className="text-white">Free Tier Only</SelectItem>
            <SelectItem value="founder" className="text-white">Founder Tier</SelectItem>
            <SelectItem value="early_bird" className="text-white">Early Bird</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const subscriptionStatus = getSubscriptionStatus(user);
          const authInfo = getAuthMethod(user);
          const isOAuthUser = authInfo.method === 'Google OAuth';
          const isInactive = user.subscription_status === 'cancelled';
          
          return (
          <Card key={user.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-700">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-lg">{user.full_name}</p>
                        <Badge className="bg-slate-700 text-slate-200">
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-400 text-sm">{user.email}</p>
                        <Badge className={`${authInfo.color} text-white text-xs`}>
                          {authInfo.method}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar className="w-4 h-4" />
                      <span>Joined: {formatDate(user.created_date)}</span>
                    </div>
                    <button
                      onClick={() => setExpandedUsers(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                      className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedUsers[user.id] ? 'rotate-180' : ''}`} />
                      <span>{expandedUsers[user.id] ? 'Hide' : 'Show'} Details</span>
                    </button>
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
              <Collapsible open={expandedUsers[user.id]}>
                <CollapsibleContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Key className="w-4 h-4" />
                    <span>Authentication Method</span>
                  </div>
                  <p className="text-white text-sm font-medium">{authInfo.method}</p>
                </div>

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
                </CollapsibleContent>
              </Collapsible>

              {/* Tier Management Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4">
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
                
                <div className="flex flex-wrap gap-2 ml-auto">
                  <Button
                    onClick={() => handleToggleSubscriptionStatus(user)}
                    variant="outline"
                    size="sm"
                    disabled={togglingStatus === user.id}
                    className={isInactive 
                      ? "bg-green-900/20 border-green-700 text-green-400 hover:bg-green-900/40"
                      : "bg-orange-900/20 border-orange-700 text-orange-400 hover:bg-orange-900/40"
                    }
                  >
                    {togglingStatus === user.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : isInactive ? (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    ) : (
                      <Ban className="w-4 h-4 mr-1" />
                    )}
                    {isInactive ? 'Reactivate' : 'Deactivate'}
                  </Button>
                  {!isOAuthUser && (
                    <Button
                      onClick={() => handleResetPassword(user)}
                      variant="outline"
                      size="sm"
                      disabled={resettingPassword === user.id}
                      title="Send password reset email"
                      className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                    >
                      {resettingPassword === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Mail className="w-4 h-4 mr-1" />
                      )}
                      Reset Password
                    </Button>
                  )}
                  <Button
                    onClick={() => { setEditingUser(user); setShowEditDialog(true); }}
                    variant="outline"
                    size="sm"
                    className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDeleteUser(user)}
                    variant="outline"
                    size="sm"
                    className="bg-red-900/20 border-red-700 text-red-400 hover:bg-red-900/40"
                    title="⚠️ Permanent deletion - GDPR only"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new user account with specified details and tier
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="John Smith"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="john@example.com"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="user" className="text-white">User</SelectItem>
                  <SelectItem value="admin" className="text-white">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Select value={newUser.subscription_tier} onValueChange={(value) => setNewUser({ ...newUser, subscription_tier: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="starter" className="text-white">Starter</SelectItem>
                  <SelectItem value="professional" className="text-white">Professional</SelectItem>
                  <SelectItem value="founder" className="text-white">Founder</SelectItem>
                  <SelectItem value="early_bird" className="text-white">Early Bird</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="bg-slate-800 border-slate-700 text-white">
              Cancel
            </Button>
            <Button onClick={handleAddUser} className="bg-rose-600 hover:bg-rose-700 text-white">
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update user account details
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingUser.full_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editingUser.role || 'user'} onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="user" className="text-white">User</SelectItem>
                    <SelectItem value="admin" className="text-white">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subscription Tier</Label>
                <Select value={editingUser.subscription_tier || 'starter'} onValueChange={(value) => setEditingUser({ ...editingUser, subscription_tier: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="starter" className="text-white">Starter</SelectItem>
                    <SelectItem value="professional" className="text-white">Professional</SelectItem>
                    <SelectItem value="founder" className="text-white">Founder</SelectItem>
                    <SelectItem value="early_bird" className="text-white">Early Bird</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subscription Status</Label>
                <Select value={editingUser.subscription_status || 'active'} onValueChange={(value) => setEditingUser({ ...editingUser, subscription_status: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active" className="text-white">Active</SelectItem>
                    <SelectItem value="trialing" className="text-white">Trialing</SelectItem>
                    <SelectItem value="past_due" className="text-white">Past Due</SelectItem>
                    <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="bg-slate-800 border-slate-700 text-white">
              Cancel
            </Button>
            <Button onClick={handleEditUser} className="bg-rose-600 hover:bg-rose-700 text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}