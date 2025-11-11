import React, { useState, useEffect } from "react";
import { Assessment, Customer, Vehicle } from "@/entities/all";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  User,
  Car,
  ArrowRight
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
      const [assessmentData, customerData, vehicleData] = await Promise.all([
        Assessment.list('-created_date'),
        Customer.list(),
        Vehicle.list()
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

  const filteredAssessments = assessments.filter((assessment) => {
    if (filter === 'all') return true;
    return assessment.status === filter;
  });

  const filterOptions = [
    { value: 'all', label: 'All', count: assessments.length },
    { value: 'draft', label: 'Draft', count: assessments.filter(a => a.status === 'draft').length },
    { value: 'quoted', label: 'Quoted', count: assessments.filter(a => a.status === 'quoted').length },
    { value: 'approved', label: 'Approved', count: assessments.filter(a => a.status === 'approved').length },
    { value: 'completed', label: 'Completed', count: assessments.filter(a => a.status === 'completed').length },
    { value: 'declined', label: 'Declined', count: assessments.filter(a => a.status === 'declined').length }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-slate-700 text-slate-300';
      case 'quoted': return 'bg-blue-900 text-blue-300';
      case 'approved': return 'bg-green-900 text-green-300';
      case 'completed': return 'bg-purple-900 text-purple-300';
      case 'declined': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-700 text-gray-300';
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

  const getVehicleDisplay = (assessment) => {
    if (assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0) {
      return `${assessment.vehicles.length} Vehicles`;
    } else if (assessment.vehicle_id) {
      const vehicle = vehicles[assessment.vehicle_id];
      return vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle details loading...';
    }
    return 'N/A';
  };

  // Get the display reference based on status - same logic as AssessmentDetail
  const getDisplayReference = (assessment) => {
    // If status is completed, show invoice number (if exists), otherwise show quote number
    if (assessment.status === 'completed') {
      if (assessment.invoice_number) {
        return `Invoice: ${assessment.invoice_number}`;
      } else if (assessment.quote_number) {
        return `Quote: ${assessment.quote_number}`;
      } else {
        return `Ref: #${assessment.id.slice(-6)}`;
      }
    }
    
    // For all other statuses, show quote number (even if invoice_number exists)
    if (assessment.quote_number) {
      return `Quote: ${assessment.quote_number}`;
    }
    
    return `Ref: #${assessment.id.slice(-6)}`;
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
          <p className="text-slate-400 text-sm">
            {filteredAssessments.length} quotes
          </p>
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
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAssessments.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">
                {assessments.length === 0 ? 'No quotes yet' : 'No quotes found for this filter'}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                {assessments.length === 0 ? 'Create an assessment to see quotes here' : 'Try selecting a different filter'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAssessments.map((assessment) => {
            const customer = customers[assessment.customer_id];

            // Use the new display reference logic
            const displayIdentifier = getDisplayReference(assessment);

            // Determine customer display name
            const customerName = customer ? (customer.business_name || customer.name) : 'No Customer';

            // Get vehicle display information
            const vehicleInfo = getVehicleDisplay(assessment);

            if (!assessment.id || assessment.id === 'undefined') {
              return null;
            }

            return (
              <Card
                key={assessment.id}
                className="bg-slate-900 text-card-foreground my-4 rounded-lg border shadow-sm border-slate-800 hover:bg-slate-800/60 transition-colors duration-200 cursor-pointer"
                onClick={() => navigate(createPageUrl(`AssessmentDetail?id=${assessment.id}`))}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {/* Identifier and Status Badges */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{displayIdentifier}</h3>
                        <Badge className={`text-xs ${getStatusColor(assessment.status)}`}>
                          {assessment.status}
                        </Badge>
                        {assessment.is_multi_vehicle && (
                          <Badge variant="outline" className="text-xs border-purple-800 text-purple-300">
                            Multi-Vehicle
                          </Badge>
                        )}
                      </div>

                      {/* Customer Name and optional Contact */}
                      <p className="text-slate-400 text-sm">{customerName}</p>
                      {customer?.business_name && (
                        <p className="text-slate-500 text-xs">Contact: {customer.name}</p>
                      )}

                      {/* Vehicle Info */}
                      <p className="text-slate-500 text-xs">{vehicleInfo}</p>

                      {/* Date Info */}
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-300">
                          {new Date(assessment.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      {assessment.quote_amount && (
                        <div className="flex items-center gap-1 text-green-400 font-semibold mb-1">
                          <span className="text-sm">
                            {formatCurrency(assessment.quote_amount, assessment.currency || 'GBP')}
                          </span>
                        </div>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}