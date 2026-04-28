import React, { useState, useEffect } from "react";
import { Assessment, Customer, Vehicle, UserSetting } from "@/entities/all";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Search, 
  Calendar,
  TrendingUp,
  Coins, 
  CheckCircle,
  Clock,
  ExternalLink,
  ArrowUpDown,
  Loader2,
  Mail
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ReactDOM from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";
import ClientStatementPDF from "@/components/reports/ClientStatementPDF";
import EmailModal from "@/components/EmailModal";

export default function Reports() {
  const [assessments, setAssessments] = useState([]);
  const [customers, setCustomers] = useState({});
  const [vehicles, setVehicles] = useState({});
  const [filteredAssessments, setFilteredAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState(null);
  const [userSettings, setUserSettings] = useState(null);

  // Filter states
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc' or 'desc'

  // Summary stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    paidCount: 0,
    pendingCount: 0,
    averageJobValue: 0,
    currency: 'GBP'
  });

  const navigate = useNavigate();

  // Statement state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalDefaults, setEmailModalDefaults] = useState({ to: "", subject: "", message: "" });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [assessments, selectedCustomerId, paymentStatus, selectedMonth, selectedYear, fromDate, toDate, sortOrder]);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      const [assessmentData, customerData, vehicleData] = await Promise.all([
        Assessment.filter({ created_by: currentUser.email }, '-created_date'),
        Customer.filter({ created_by: currentUser.email }),
        Vehicle.filter({ created_by: currentUser.email })
      ]);

      // Filter only completed assessments
      const completedAssessments = assessmentData.filter(a => a.status === 'completed');
      setAssessments(completedAssessments);
      setUser(currentUser);

      // Create customer lookup
      const customerLookup = customerData.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
      setCustomers(customerLookup);

      // Create vehicle lookup
      const vehicleLookup = vehicleData.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
      setVehicles(vehicleLookup);

      // Load user settings for currency
      const settings = await UserSetting.filter({ user_email: currentUser.email });
      if (settings.length > 0) {
        setUserSettings(settings[0]);
      }
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
      setLoadingUser(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assessments];

    // Client filter
    if (selectedCustomerId !== "all") {
      filtered = filtered.filter(assessment => assessment.customer_id === selectedCustomerId);
    }

    // Payment status filter
    if (paymentStatus !== "all") {
      filtered = filtered.filter(a => a.payment_status === paymentStatus);
    }

    // Date filters
    if (selectedMonth && selectedYear) {
      filtered = filtered.filter(assessment => {
        const date = new Date(assessment.created_date);
        return date.getMonth() === parseInt(selectedMonth) && 
               date.getFullYear() === parseInt(selectedYear);
      });
    } else if (fromDate || toDate) {
      filtered = filtered.filter(assessment => {
        const date = new Date(assessment.created_date);
        const from = fromDate ? new Date(fromDate) : null;
        const to = toDate ? new Date(toDate) : null;
        
        if (from && to) {
          // Ensure 'to' date includes the entire day by setting time to end of day
          const adjustedTo = to ? new Date(to.setHours(23, 59, 59, 999)) : null;
          return date >= from && date <= adjustedTo;
        } else if (from) {
          return date >= from;
        } else if (to) {
          const adjustedTo = new Date(to.setHours(23, 59, 59, 999));
          return date <= adjustedTo;
        }
        return true;
      });
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_date);
      const dateB = new Date(b.created_date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredAssessments(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (data) => {
    const currency = userSettings?.currency || 'GBP';
    const taxRate = userSettings?.tax_rate || 0;
    const isVatRegistered = userSettings?.is_vat_registered || false;

    const totalRevenue = data.reduce((sum, a) => sum + (a.quote_amount || 0), 0);
    const paidCount = data.filter(a => a.payment_status === 'paid').length;
    const pendingCount = data.filter(a => a.payment_status === 'pending').length;
    const averageJobValue = data.length > 0 ? totalRevenue / data.length : 0;

    setStats({
      totalRevenue,
      paidCount,
      pendingCount,
      averageJobValue,
      currency,
      taxRate,
      isVatRegistered
    });
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
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  };

  const calculateVAT = (amount) => {
    if (!stats.isVatRegistered) return 0;
    return (amount * stats.taxRate) / 100;
  };

  const getPeriodLabel = () => {
    if (selectedMonth && selectedYear) {
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      return `${monthNames[parseInt(selectedMonth)]} ${selectedYear}`;
    }
    if (fromDate || toDate) {
      const f = fromDate ? new Date(fromDate).toLocaleDateString("en-GB") : "Start";
      const t = toDate ? new Date(toDate).toLocaleDateString("en-GB") : "Today";
      return `${f} to ${t}`;
    }
    return "All dates";
  };

  const generateStatementPdfBase64 = async () => {
    const selectedCustomer = customers[selectedCustomerId];
    const periodLabel = getPeriodLabel();

    // Fetch logo as blob URL for cross-origin safety (same as AssessmentDetail)
    let logoDisplayUrl = null;
    if (userSettings?.business_logo_url) {
      try {
        const r = await fetch(userSettings.business_logo_url);
        if (r.ok) {
          const blob = await r.blob();
          logoDisplayUrl = URL.createObjectURL(blob);
        }
      } catch (_) {}
    }

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.zIndex = "-1";
    container.style.width = "794px";
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);
    await new Promise((resolve) => {
      root.render(
        React.createElement(ClientStatementPDF, {
          assessments: filteredAssessments,
          customer: selectedCustomer,
          userSettings,
          periodLabel,
          currency: stats.currency,
          logoDisplayUrl,
        })
      );
      setTimeout(resolve, 800);
    });

    let pdfBase64 = null;
    try {
      const contentEl = container.firstChild;
      const canvas = await html2canvas(contentEl, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ unit: "px", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let yOffset = 0;
      let remainingHeight = imgHeight;
      let firstPage = true;
      while (remainingHeight > 0) {
        if (!firstPage) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -yOffset, imgWidth, imgHeight);
        yOffset += pageHeight;
        remainingHeight -= pageHeight;
        firstPage = false;
      }

      pdfBase64 = pdf.output("datauristring").split(",")[1];
    } finally {
      root.unmount();
      document.body.removeChild(container);
      if (logoDisplayUrl) URL.revokeObjectURL(logoDisplayUrl);
    }
    return pdfBase64;
  };

  const handlePDFStatement = async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfBase64 = await generateStatementPdfBase64();
      if (!pdfBase64) return;
      // Open in browser for preview (same behaviour as quote/invoice PDFs)
      const dataUrl = `data:application/pdf;base64,${pdfBase64}`;
      window.open(dataUrl, "_blank");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleEmailStatement = () => {
    const customer = customers[selectedCustomerId];
    const periodLabel = getPeriodLabel();
    const bizName = userSettings?.business_name || "Dentifier PDR";
    const replyTo = userSettings?.contact_email || "";
    const sym = getCurrencySymbol(stats.currency);

    const totalInvoiced = filteredAssessments.reduce((s, a) => s + (a.quote_amount || 0), 0);
    const totalPaid = filteredAssessments.filter(a => a.payment_status === "paid").reduce((s, a) => s + (a.quote_amount || 0), 0);
    const outstanding = totalInvoiced - totalPaid;

    const subject = `Statement of Account — ${bizName} — ${periodLabel}`;

    let message = `Hi ${customer?.business_name || customer?.name},\n\nPlease find attached your statement of account for the period: ${periodLabel}.\n\n`;
    message += `INVOICES\n${"─".repeat(50)}\n`;
    filteredAssessments.forEach((a) => {
      const date = new Date(a.sent_date || a.created_date).toLocaleDateString("en-GB");
      const invNo = a.invoice_number || a.quote_number || `#${a.id.slice(-6)}`;
      const amt = `${sym}${(a.quote_amount || 0).toFixed(2)}`;
      const status = a.payment_status === "paid" ? "Paid" : "Pending Payment";
      message += `${date}  ${invNo}  ${amt}  ${status}\n`;
    });
    message += `\n${"─".repeat(50)}\n`;
    message += `Total Invoiced:   ${sym}${totalInvoiced.toFixed(2)}\n`;
    message += `Total Paid:       ${sym}${totalPaid.toFixed(2)}\n`;
    message += `Outstanding:      ${sym}${outstanding.toFixed(2)}\n\n`;
    message += `Best regards,\n${bizName}`;
    if (replyTo) message += `\n${replyTo}`;

    setEmailModalDefaults({ to: customer?.email || "", subject, message });
    setEmailModalOpen(true);
  };

  const handleSendStatementEmail = async (to, cc, subject, message) => {
    setIsSendingEmail(true);
    try {
      const pdfBase64 = await generateStatementPdfBase64();
      if (!pdfBase64) return;

      const customer = customers[selectedCustomerId];
      const bizName = userSettings?.business_name || "Dentifier PDR";
      const replyTo = userSettings?.contact_email || "";
      const periodLabel = getPeriodLabel();
      const filename = `Statement_${(customer?.business_name || customer?.name || "client").replace(/\s+/g, "_")}_${periodLabel.replace(/\s+/g, "_")}.pdf`;

      const response = await base44.functions.invoke("sendQuoteInvoiceEmail", {
        type: "quote",
        to,
        cc,
        subject,
        body: message,
        customer_name: customer?.business_name || customer?.name,
        business_name: bizName,
        reply_to_email: replyTo,
        pdf_base64: pdfBase64,
        quote_number: `Statement-${periodLabel}`,
        invoice_number: `Statement-${periodLabel}`,
      });

      if (response.data?.success) {
        setEmailModalOpen(false);
        alert(`Statement emailed to ${to}`);
      } else {
        alert(response.data?.error || "Failed to send email.");
      }
    } catch (error) {
      console.error("Error sending statement email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const exportToCSV = () => {
    if (filteredAssessments.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Invoice Number',
      'Date',
      'Client Name',
      'Client Email',
      'Vehicle',
      'Total Amount',
      'VAT Amount',
      'Payment Status',
      'Notes'
    ];

    const rows = filteredAssessments.map(assessment => {
      const customer = customers[assessment.customer_id];
      const invoiceNumber = assessment.invoice_number || assessment.quote_number || `#${assessment.id.slice(-6)}`;
      const date = new Date(assessment.created_date).toLocaleDateString();
      const clientName = customer?.business_name || customer?.name || 'N/A';
      const clientEmail = customer?.email || 'N/A';
      
      let vehicle = 'N/A';
      if (assessment.is_multi_vehicle && assessment.vehicles) {
        vehicle = `${assessment.vehicles.length} Vehicles`;
      } else if (assessment.vehicle_id) {
        const veh = vehicles[assessment.vehicle_id];
        vehicle = veh ? `${veh.year} ${veh.make} ${veh.model}` : 'Vehicle details available';
      }

      const totalAmount = assessment.quote_amount || 0;
      const vatAmount = calculateVAT(totalAmount);
      const paymentStatus = assessment.payment_status || 'pending';
      const notes = (assessment.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');

      return [
        invoiceNumber,
        date,
        clientName,
        clientEmail,
        vehicle,
        totalAmount.toFixed(2),
        vatAmount.toFixed(2),
        paymentStatus,
        notes
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dentifier-reports-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = [
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
  ];

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  const isStarterTier = user?.subscription_tier === 'starter' || !user?.subscription_tier;
  const isPremiumTier = ['professional', 'founder', 'early_bird'].includes(user?.subscription_tier);

  if (loading || loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reports & Accounting</h1>
        <p className="text-slate-400 text-sm">Track completed jobs and revenue</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-green-900 to-green-800 border-green-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-4 h-4 text-green-300" /> 
              <p className="text-green-300 text-xs font-medium">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(stats.totalRevenue, stats.currency)}
            </p>
            {stats.isVatRegistered && (
              <p className="text-green-300 text-xs mt-1">
                VAT: {formatCurrency(calculateVAT(stats.totalRevenue), stats.currency)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-300" />
              <p className="text-blue-300 text-xs font-medium">Avg Job Value</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(stats.averageJobValue, stats.currency)}
            </p>
            <p className="text-blue-300 text-xs mt-1">
              {filteredAssessments.length} jobs
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900 to-emerald-800 border-emerald-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <p className="text-emerald-300 text-xs font-medium">Paid Invoices</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.paidCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900 to-orange-800 border-orange-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-300" />
              <p className="text-orange-300 text-xs font-medium">Pending Payment</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters or Upgrade Prompt */}
      {isStarterTier ? (
        <Card className="bg-gradient-to-br from-rose-900/30 to-purple-900/30 border-rose-700">
          <CardContent className="p-6 text-center">
            <h3 className="text-white font-semibold text-lg mb-2">Want advanced reports and CSV exports?</h3>
            <p className="text-slate-300 text-sm mb-4">
              Upgrade to Professional to unlock advanced filters, date ranges, and CSV export functionality.
            </p>
            <Link to={createPageUrl('Upgrade')}>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold">
                Upgrade to Professional
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client Dropdown */}
            <div className="space-y-2">
              <Label className="text-white">Select Client</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                  <SelectItem value="all" className="text-white">All Clients</SelectItem>
                  {Object.values(customers).sort((a, b) => {
                    const nameA = a.business_name || a.name;
                    const nameB = b.business_name || b.name;
                    return nameA.localeCompare(nameB);
                  }).map(customer => (
                    <SelectItem key={customer.id} value={customer.id} className="text-white hover:!bg-slate-700 focus:bg-slate-700">
                      {customer.business_name || customer.name}
                      {customer.business_name && <span className="text-slate-400 text-xs ml-1">({customer.name})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label className="text-white">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white">All</SelectItem>
                  <SelectItem value="paid" className="text-white">Paid</SelectItem>
                  <SelectItem value="pending" className="text-white">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month/Year Filter */}
            <div className="space-y-2">
              <Label className="text-white">Filter by Month</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value={null} className="text-white">All Months</SelectItem>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-white">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {years.map(y => (
                      <SelectItem key={y.value} value={y.value} className="text-white">
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-white">Or use Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-slate-400 text-xs">From</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setSelectedMonth(""); // Clear month/year when date range is used
                      setSelectedYear(new Date().getFullYear().toString()); 
                    }}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">To</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setSelectedMonth(""); // Clear month/year when date range is used
                      setSelectedYear(new Date().getFullYear().toString()); 
                    }}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Statement Buttons — only show when a specific client is selected */}
            {selectedCustomerId !== "all" && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handlePDFStatement}
                  disabled={isGeneratingPDF || filteredAssessments.length === 0}
                  style={{ backgroundColor: "#F2034D" }}
                  className="text-white font-semibold hover:opacity-90"
                >
                  {isGeneratingPDF ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-2" />PDF Statement</>
                  )}
                </Button>
                <Button
                  onClick={handleEmailStatement}
                  disabled={isSendingEmail || filteredAssessments.length === 0 || !customers[selectedCustomerId]?.email}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {isSendingEmail ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><Mail className="w-4 h-4 mr-2" />Email Statement</>
                  )}
                </Button>
              </div>
            )}

            {/* Export Button */}
            <Button 
              onClick={exportToCSV} 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={filteredAssessments.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export to CSV ({filteredAssessments.length} records)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Completed Jobs ({filteredAssessments.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <ArrowUpDown className="w-4 h-4 mr-1" />
            {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </Button>
        </div>

        {loading ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-700 rounded mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ) : filteredAssessments.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No completed jobs found</p>
              <p className="text-slate-500 text-sm">
                {assessments.length === 0 
                  ? 'Complete some assessments to see them here' 
                  : 'Try adjusting your filters'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAssessments.map((assessment) => {
            const customer = customers[assessment.customer_id];
            const invoiceNumber = assessment.invoice_number || assessment.quote_number || `#${assessment.id.slice(-6)}`;
            const amount = assessment.quote_amount || 0;
            const vatAmount = calculateVAT(amount);
            const isPaid = assessment.payment_status === 'paid';
            const customerName = customer ? (customer.business_name || customer.name) : 'Unknown Customer';

            let vehicleInfo = 'N/A';
            if (assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0) {
              vehicleInfo = `${assessment.vehicles.length} Vehicles`;
            } else if (assessment.vehicle_id) {
              const veh = vehicles[assessment.vehicle_id];
              vehicleInfo = veh ? `${veh.year} ${veh.make} ${veh.model}` : 'Vehicle details available';
            }

            return (
              <Card 
                key={assessment.id}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800/60 transition-colors duration-200 cursor-pointer"
                onClick={() => navigate(createPageUrl(`AssessmentDetail?id=${assessment.id}`))}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold text-sm">{invoiceNumber}</h4>
                        <Badge className={`text-xs ${isPaid ? 'bg-green-600 text-white' : 'bg-orange-600 text-white'}`}>
                          {isPaid ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-slate-300 text-sm">{customerName}</p>
                      {customer?.business_name && (
                        <p className="text-slate-500 text-xs">Contact: {customer.name}</p>
                      )}
                      <p className="text-slate-400 text-xs">{vehicleInfo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-semibold text-lg">
                        {formatCurrency(amount, stats.currency)}
                      </p>
                      {stats.isVatRegistered && (
                        <p className="text-slate-400 text-xs">
                          VAT: {formatCurrency(vatAmount, stats.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link to={createPageUrl(`AssessmentDetail?id=${assessment.id}`)} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                        View Details
                      </Button>
                    </Link>
                    <Link to={createPageUrl(`QuotePDF?id=${assessment.id}`)} target="_blank" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Invoice
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Statement Email Modal */}
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        initialTo={emailModalDefaults.to}
        initialSubject={emailModalDefaults.subject}
        initialMessage={emailModalDefaults.message}
        onSend={handleSendStatementEmail}
        isSending={isSendingEmail}
        docType="quote"
        contactEmail={userSettings?.contact_email}
      />
    </div>
  );
}