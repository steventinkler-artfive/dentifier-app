import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Assessment, Customer, Vehicle } from "@/entities/all";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  Car,
  ArrowRight,
  Loader2
} from "lucide-react";

export default function Quotes() {
  const [assessments, setAssessments] = useState([]);
  const [customers, setCustomers] = useState({});
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const navigate = useNavigate();

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const user = await base44.auth.me();
      const [assessmentData, customerData, vehicleData] = await Promise.all([
        Assessment.filter({ created_by: user.email }, '-created_date'),
        Customer.filter({ created_by: user.email }),
        Vehicle.filter({ created_by: user.email })
      ]);

      setAssessments(assessmentData);

      const customerLookup = customerData.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
      setCustomers(customerLookup);

      const vehicleLookup = vehicleData.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
      setVehicles(vehicleLookup);

    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quotes only show non-completed statuses
  const quoteAssessments = assessments.filter(a => a.status !== 'completed');

  const filteredAssessments = quoteAssessments.filter((assessment) => {
    if (filter === 'all') return true;
    return assessment.status === filter;
  });

  const filterOptions = [
    { value: 'all',      label: 'All',      count: quoteAssessments.length },
    { value: 'draft',    label: 'Draft',    count: quoteAssessments.filter(a => a.status === 'draft').length },
    { value: 'ready',    label: 'Ready',    count: quoteAssessments.filter(a => a.status === 'ready').length },
    { value: 'sent',     label: 'Sent',     count: quoteAssessments.filter(a => a.status === 'sent').length },
    { value: 'approved', label: 'Approved', count: quoteAssessments.filter(a => a.status === 'approved').length },
    { value: 'declined', label: 'Declined', count: quoteAssessments.filter(a => a.status === 'declined').length },
  ];

  const getCurrencySymbol = (currency) => {
    const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
    return symbols[currency] || '£';
  };

  const formatCardPrice = (amount, currency) => {
    if (!amount) return null;
    return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
  };

  const getDisplayReference = (assessment) => {
    if (assessment.status === 'completed') {
      if (assessment.invoice_number) return { label: `Invoice: ${assessment.invoice_number}`, isInvoice: true };
      if (assessment.quote_number)   return { label: `Quote: ${assessment.quote_number}`, isInvoice: false };
      return { label: `Ref: #${assessment.id.slice(-6)}`, isInvoice: false };
    }
    if (assessment.quote_number) return { label: `Quote: ${assessment.quote_number}`, isInvoice: false };
    return { label: `Ref: #${assessment.id.slice(-6)}`, isInvoice: false };
  };

  const getBadge = (assessment) => {
    if (assessment.status === 'completed' && assessment.payment_status === 'paid') {
      return { label: 'Paid', className: 'bg-green-600 text-white' };
    }
    switch (assessment.status) {
      case 'draft':     return { label: 'Draft',     className: 'bg-slate-600 text-slate-200' };
      case 'ready':     return { label: 'Ready',     className: 'bg-blue-600 text-white' };
      case 'sent':      return { label: 'Sent',      className: 'bg-teal-600 text-white' };
      case 'approved':  return { label: 'Approved',  className: 'bg-green-600 text-white' };
      case 'completed': return { label: 'Completed', className: 'bg-purple-600 text-white' };
      case 'declined':  return { label: 'Declined',  className: 'bg-red-600 text-white' };
      default:          return { label: assessment.status, className: 'bg-slate-600 text-slate-200' };
    }
  };

  const getBottomLine = (assessment) => {
    const { status, payment_status, sent_date } = assessment;
    const { isInvoice } = getDisplayReference(assessment);
    const docLabel = isInvoice ? 'INVOICE' : 'QUOTE';
    const formatDate = (d) => new Date(d).toLocaleDateString('en-GB');

    if (status === 'draft') return null;
    if (status === 'ready') return 'Ready to send';
    if (status === 'sent') {
      return sent_date ? `${docLabel} sent ${formatDate(sent_date)}` : `${docLabel} sent`;
    }
    if (['approved', 'completed'].includes(status) || payment_status === 'paid') {
      if (sent_date) return `${docLabel} sent ${formatDate(sent_date)}`;
      return 'Not yet marked as sent';
    }
    return null;
  };

  const getVehicleDisplay = (assessment) => {
    // Per-panel quotes: have assessment.vehicles but no vehicle_id (single or multi)
    if (!assessment.vehicle_id && assessment.vehicles && assessment.vehicles.length > 0) {
      return { isMulti: true, count: assessment.vehicles.length, isPerPanel: true };
    }
    if (assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0) {
      return { isMulti: true, count: assessment.vehicles.length, isPerPanel: false };
    }
    if (assessment.vehicle_id) {
      const v = vehicles[assessment.vehicle_id];
      return { isMulti: false, label: v ? `${v.year} ${v.make} ${v.model}` : null };
    }
    return { isMulti: false, label: null };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
          <p className="text-slate-400 text-sm">{filteredAssessments.length} quote{filteredAssessments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-slate-900 p-1 rounded-lg overflow-x-auto">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(option.value)}
            className={`flex-shrink-0 ${
              filter === option.value
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {option.label}
            {option.count > 0 && (
              <Badge variant="secondary" className="ml-1 bg-slate-800 text-slate-300 text-xs">
                {option.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Quotes List */}
      <div className="space-y-3">
        {filteredAssessments.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">
                {quoteAssessments.length === 0 ? 'No quotes yet' : 'No quotes found for this filter'}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                {quoteAssessments.length === 0 ? 'Create an assessment to see quotes here' : 'Try selecting a different filter'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAssessments.map((assessment) => {
            if (!assessment.id || assessment.id === 'undefined') return null;

            const customer = customers[assessment.customer_id];
            const customerName = customer ? (customer.business_name || customer.name) : null;
            const ref = getDisplayReference(assessment);
            const badge = getBadge(assessment);
            const bottomLine = getBottomLine(assessment);
            const vehicleInfo = getVehicleDisplay(assessment);
            const isPanelQuote = !assessment.vehicle_id && assessment.vehicles && assessment.vehicles.length > 0;
            const price = formatCardPrice(assessment.total_amount ?? assessment.quote_amount, assessment.currency || 'GBP');

            return (
              <Card
                key={assessment.id}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800/60 transition-colors duration-200 cursor-pointer"
                onClick={() => navigate(createPageUrl(`AssessmentDetail?id=${assessment.id}&from=quotes`))}
              >
                <CardContent className="p-4 space-y-2">
                  {/* Line 1 — Reference + Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-lg leading-tight">{ref.label}</span>
                    <Badge className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </Badge>
                  </div>

                  {/* Line 2 — Customer + Price */}
                  <div className="flex items-center justify-between">
                    <span className={`text-base ${customerName ? 'text-slate-400' : 'text-slate-600'}`}>
                      {customerName || 'No Customer'}
                    </span>
                    {price && (
                      <span className="text-green-400 font-bold text-xl leading-tight">{price}</span>
                    )}
                  </div>

                  {/* Line 3 — Vehicle */}
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {vehicleInfo.isMulti ? (
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{vehicleInfo.count} Vehicles</span>
                        {isPanelQuote && (
                          <span className="text-xs border border-rose-500 text-rose-400 rounded-full px-2 py-0.5">
                            Panel quote
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className={`text-sm font-bold ${vehicleInfo.label ? 'text-white' : 'text-slate-600'}`}>
                        {vehicleInfo.label || 'No vehicle'}
                      </span>
                    )}
                  </div>

                  {/* Line 4 — Bottom line + Arrow */}
                  {bottomLine ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="text-slate-500 text-sm">{bottomLine}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}