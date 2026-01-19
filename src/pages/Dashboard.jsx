import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Camera,
  Users,
  FileText,
  TrendingUp,
  Clock,
  Coins,
  Plus,
  ArrowRight } from
"lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { BankingIncompleteBanner } from "@/components/onboarding/OnboardingBanners";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalQuotes: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    avgQuoteValue: 0,
    currency: 'GBP'
  });
  const [recentAppraisals, setRecentAppraisals] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [vehiclesMap, setVehiclesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingUserSettings, setLoadingUserSettings] = useState(true);
  const [welcomeEmailSent, setWelcomeEmailSent] = useState(false);
  const [user, setUser] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    loadDashboardData();
    checkAndSendWelcomeEmail();
  }, []);

  const checkAndSendWelcomeEmail = async () => {
    try {
      const user = await base44.auth.me();
      const sessionKey = `welcome_email_sent_${user.id}`;
      
      // Check if welcome email was already sent in this browser session
      if (sessionStorage.getItem(sessionKey)) {
        return;
      }

      // Check if user joined recently (within last 5 minutes = new user)
      const userCreatedDate = new Date(user.created_date);
      const now = new Date();
      const minutesSinceCreation = (now - userCreatedDate) / (1000 * 60);

      if (minutesSinceCreation <= 5 && !welcomeEmailSent) {
        // Send welcome email
        await base44.functions.invoke('sendWelcomeEmail', {
          email: user.email,
          fullName: user.full_name
        });
        
        // Mark as sent in session storage
        sessionStorage.setItem(sessionKey, 'true');
        setWelcomeEmailSent(true);
      }
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const user = await base44.auth.me();
      setUser(user);
      
      const [assessmentsData, customersData, vehiclesData, settingsData] = await Promise.all([
        base44.entities.Assessment.filter({ created_by: user.email }, '-created_date'),
        base44.entities.Customer.filter({ created_by: user.email }),
        base44.entities.Vehicle.filter({ created_by: user.email }),
        base44.entities.UserSetting.filter({ user_email: user.email })
      ]);

      const settings = settingsData.length > 0 ? settingsData[0] : null;
      setUserSettings(settings);
      
      if (settings && !settings.onboarding_completed) {
        setShowOnboarding(true);
      }
      setLoadingUserSettings(false);

      const customersMap = customersData.reduce((map, customer) => {
        map[customer.id] = customer;
        return map;
      }, {});
      setCustomersMap(customersMap);

      const vehiclesMap = vehiclesData.reduce((map, vehicle) => {
        map[vehicle.id] = vehicle;
        return map;
      }, {});
      setVehiclesMap(vehiclesMap);

      // Get current month and year date ranges
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

      // Filter quotes from this month (not drafts)
      const quotesThisMonth = assessmentsData.filter((a) => {
        const assessmentDate = new Date(a.created_date);
        return a.status !== 'draft' && 
               assessmentDate >= monthStart && 
               assessmentDate <= monthEnd;
      });

      // Filter completed assessments from this month for revenue
      const completedThisMonth = assessmentsData.filter((a) => {
        const assessmentDate = new Date(a.created_date);
        return a.status === 'completed' && 
               assessmentDate >= monthStart && 
               assessmentDate <= monthEnd &&
               (a.quote_amount || 0) > 0;
      });

      // Filter completed assessments from this year for average quote
      const completedThisYear = assessmentsData.filter((a) => {
        const assessmentDate = new Date(a.created_date);
        return a.status === 'completed' && 
               assessmentDate >= yearStart && 
               assessmentDate <= yearEnd &&
               (a.quote_amount || 0) > 0;
      });

      // Calculate revenue from this month
      const revenueByCurrency = {};
      completedThisMonth.forEach((assessment) => {
        const currency = assessment.currency || 'GBP';
        const amount = assessment.quote_amount || 0;

        if (!revenueByCurrency[currency]) {
          revenueByCurrency[currency] = 0;
        }
        revenueByCurrency[currency] += amount;
      });

      const totalRevenueInfo = Object.entries(revenueByCurrency).
      reduce((max, [currency, amount]) =>
      amount > max.amount ? { currency, amount } : max,
      { currency: 'GBP', amount: 0 }
      );

      // Calculate average from this year
      const avgRevenueByCurrency = {};
      completedThisYear.forEach((assessment) => {
        const currency = assessment.currency || 'GBP';
        const amount = assessment.quote_amount || 0;

        if (!avgRevenueByCurrency[currency]) {
          avgRevenueByCurrency[currency] = 0;
        }
        avgRevenueByCurrency[currency] += amount;
      });

      const avgRevenueInfo = Object.entries(avgRevenueByCurrency).
      reduce((max, [currency, amount]) =>
      amount > max.amount ? { currency, amount } : max,
      { currency: 'GBP', amount: 0 }
      );

      setStats({
        totalQuotes: quotesThisMonth.length,
        totalCustomers: customersData.length,
        totalRevenue: totalRevenueInfo.amount,
        currency: totalRevenueInfo.currency,
        avgQuoteValue: completedThisYear.length > 0 ? avgRevenueInfo.amount / completedThisYear.length : 0
      });

      setRecentAppraisals(assessmentsData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'GBP': '£',
      'USD': '$',
      'EUR': '€',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[currency] || '£';
  };

  const formatCurrency = (amount, currency) => {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${Math.round(amount)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-500 text-white';
      case 'quoted':
        return 'bg-blue-500 text-white';
      case 'declined':
        return 'bg-red-500 text-white';
      case 'draft':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getVehicleDisplay = (assessment) => {
    if (assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0) {
      return `${assessment.vehicles.length} Vehicles`;
    } else if (assessment.vehicle_id) {
      const vehicle = vehiclesMap[assessment.vehicle_id];
      return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle details loading...';
    }
    return 'N/A';
  };

  const getDisplayIdentifier = (assessment) => {
    // Same logic as AssessmentDetail and Quotes pages
    if (assessment.status === 'completed') {
      return assessment.invoice_number || assessment.quote_number || `#${assessment.id.slice(-6)}`;
    }
    return assessment.quote_number || `#${assessment.id.slice(-6)}`;
  };

  const StatCard = ({ title, value, icon: Icon, color, trend, linkTo }) => {
    const cardContent = (
      <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800/60 transition-colors duration-200 h-full">
        <CardContent className="p-4 h-full">
          <div className="flex items-center justify-between h-full">
            <div>
              <p className="text-slate-400 text-sm font-medium">{title}</p>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
              {trend &&
            <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {trend}
                </p>
            }
            </div>
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    );

    return linkTo ? <Link to={linkTo} className="block h-full">{cardContent}</Link> : cardContent;
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    await loadDashboardData();
  };

  if (loadingUserSettings) {
    return null;
  }

  if (showOnboarding && user) {
    return <OnboardingWizard user={user} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      {userSettings && <BankingIncompleteBanner settings={userSettings} />}
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-rose-600 to-rose-500 rounded-2xl p-6 text-white custom-shadow">
        <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
        <p className="text-rose-100 mb-4">Ready to assess some dents? Let's get started.</p>
        <Link to={createPageUrl("Assessment")}>
          <Button className="bg-white text-rose-600 hover:bg-rose-50 font-semibold">
            <Camera className="w-4 h-4 mr-2" />
            New Assessment
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl("Assessment")}>
            <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800/60 transition-colors duration-200 h-full">
              <CardContent className="p-4 text-center">
                <Camera className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                <p className="text-white font-medium">Take Photos</p>
                <p className="text-slate-400 text-xs">Start assessment</p>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("Customers")}>
            <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800/60 transition-colors duration-200 h-full">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-white font-medium">Customers</p>
                <p className="text-slate-400 text-xs">Manage customers</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Overview</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Quotes"
            value={stats.totalQuotes}
            icon={FileText}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            trend="This month"
            linkTo={createPageUrl("Quotes")} />

          <StatCard
            title="Customers"
            value={stats.totalCustomers}
            icon={Users}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            trend="All customers"
            linkTo={createPageUrl("Customers")} />

          <StatCard
            title="Revenue"
            value={formatCurrency(stats.totalRevenue, stats.currency)}
            icon={Coins}
            color="bg-gradient-to-br from-green-500 to-green-600"
            trend="This month"
            linkTo={createPageUrl("Reports")} />

          <StatCard
            title="Avg Quote"
            value={formatCurrency(stats.avgQuoteValue, stats.currency)}
            icon={Clock}
            color="bg-gradient-to-br from-orange-500 to-orange-600"
            trend="This year"
            linkTo={createPageUrl("Reports")} />
        </div>
      </div>

      {/* Recent Appraisals */}
      {recentAppraisals.length > 0 &&
      <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-white">Recent Quotes</h2>
            <Link to={createPageUrl("Quotes")}>
              <Button variant="ghost" className="text-rose-400 hover:text-white hover:bg-slate-800 px-2 py-1 h-auto text-sm">
                View All
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {recentAppraisals.slice(0, 3).map((assessment) => {
            const customer = customersMap[assessment.customer_id];
            const customerName = customer ? (customer.business_name || customer.name) :
            (assessment.customer_id ? 'Customer details loading...' : 'Draft Assessment');


            if (!assessment.id || assessment.id === 'undefined') {
              return null;
            }

            const displayIdentifier = getDisplayIdentifier(assessment);

            return (
              <Link
                key={assessment.id}
                to={createPageUrl(`AssessmentDetail?id=${assessment.id}`)}
                className="block"
              >
                  <Card className="bg-slate-900 text-card-foreground my-4 rounded-lg border shadow-sm border-slate-800 hover:bg-slate-800/60 transition-colors duration-200 cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium">{displayIdentifier}</h4>
                            <Badge className={`text-xs ${getStatusColor(assessment.status)}`}>
                              {assessment.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-white font-medium truncate mb-1">
                            {getVehicleDisplay(assessment)}
                          </p>
                          <p className="text-slate-400 text-sm truncate">
                            {customerName}
                          </p>
                          {customer?.business_name && (
                            <p className="text-slate-500 text-xs truncate">Contact: {customer.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {assessment.quote_amount > 0 &&
                        <span className={`font-semibold whitespace-nowrap ${assessment.status === 'declined' ? 'text-slate-500 line-through' : 'text-green-400'}`}>
                              {formatCurrency(assessment.quote_amount, assessment.currency || 'GBP')}
                            </span>
                        }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>);

          })}
          </div>
        </div>
      }
    </div>);

}