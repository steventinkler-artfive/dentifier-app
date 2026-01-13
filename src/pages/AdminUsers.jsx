import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Info, Search, Calendar, CreditCard, DollarSign, CheckCircle2, ChevronDown, ArrowLeft, Plus, Edit2, Trash2, Key, Mail, Shield } from "lucide-react";
import { useAlert } from "@/components/ui/CustomAlert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [newUser, setNewUser] = useState({ full_name: "", email: "", password: "", role: "user", subscription_tier: "starter" });
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(null);
  const { showAlert, showConfirm } = useAlert();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      if (user.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      
      await loadUsers();
    } catch (error) {
      console.error("Failed to check admin access:", error);
      navigate(createPageUrl('Dashboard'));
    }
  };

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

  const handleAddUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      await showAlert("Please fill in all required fields", "Error");
      return;
    }

    try {
      await base44.users.inviteUser(newUser.email, newUser.role);
      await base44.entities.User.update(newUser.email, {
        full_name: newUser.full_name,
        subscription_tier: newUser.subscription_tier
      });
      await loadUsers();
      setShowAddDialog(false);
      setNewUser({ full_name: "", email: "", password: "", role: "user", subscription_tier: "starter" });
      await showAlert("User added successfully", "Success");
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
        subscription_tier: editingUser.subscription_tier
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
      `Are you sure you want to delete ${user.full_name}?`,
      "This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await base44.entities.User.delete(user.id);
      await loadUsers();
      await showAlert("User deleted successfully", "Success");
    } catch (error) {
      console.error("Failed to delete user:", error);
      await showAlert("Failed to delete user", "Error");
    }
  };

  const handleResetPassword = async (user) => {
    const isOAuthUser = user.auth_provider === 'google';
    
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

  const isOAuthUser = (user) => {
    return user.auth_provider === 'google';
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

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <TooltipProvider>
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
            <SelectItem value="cancelled" className="text-white">Cancelled</SelectItem>
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
          const subscriptionStatus = getSubscriptionStatus(user.subscription_tier || 'starter');
          const isOAuth = isOAuthUser(user);
          
          return (
          <Card key={user.id} className="bg-slate-900 border-slate-800">
            <CardContent className="p-6">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-700">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <p className="text-white font-semibold text-lg">{user.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-400 text-sm">{user.email}</p>
                        {isOAuth && (
                          <Badge className="bg-blue-600/20 border border-blue-500 text-blue-300 text-xs px-2 py-0.5">
                            <svg className="w-3 h-3 mr-1 inline-block" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-slate-700 text-slate-200">
                      {user.role}
                    </Badge>
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
                  <div className="flex items-center gap-2 text-white text-sm font-medium">
                    {isOAuth ? (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google OAuth
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Email & Password
                      </>
                    )}
                  </div>
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
                
                <div className="flex gap-2 ml-auto">
                  {isOAuth ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed opacity-60"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Reset Password
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 border-slate-700 text-white">
                        <p>This user logs in with Google OAuth</p>
                        <p className="text-xs text-slate-400">Password reset not available</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      onClick={() => handleResetPassword(user)}
                      variant="outline"
                      size="sm"
                      disabled={resettingPassword === user.id}
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
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="bg-slate-800 border-slate-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <span className="text-xs">Hide</span> : <span className="text-xs">Show</span>}
                </button>
              </div>
              {newUser.password && newUser.password.length < 8 && (
                <p className="text-xs text-red-400">Password must be at least 8 characters</p>
              )}
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
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
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
                  value={editingUser.full_name}
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editingUser.role} onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}>
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
    </TooltipProvider>
  );
}