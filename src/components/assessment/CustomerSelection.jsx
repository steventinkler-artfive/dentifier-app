import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Customer } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, Plus, Phone, Mail, FileText } from "lucide-react";
import CustomerForm from "../customers/CustomerForm";

export default function CustomerSelection({ selectedCustomer, onCustomerSelect }) {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const user = await base44.auth.me();
      const data = await Customer.filter({ created_by: user.email }, '-created_date');
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (customerData) => {
    try {
      const newCustomer = await Customer.create(customerData);
      await loadCustomers();
      setShowForm(false);
      onCustomerSelect(newCustomer);
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  const handleCreateDraft = () => {
    onCustomerSelect(null);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  if (showForm) {
    return (
      <CustomerForm
        onSave={handleCreateCustomer}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <h3 className="text-white font-semibold mb-4">Select Customer</h3>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              onClick={() => setShowForm(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Customer
            </Button>
            
            <Button
              onClick={handleCreateDraft}
              className="bg-sky-600 hover:bg-sky-700 text-white border-sky-600"
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Draft
            </Button>
          </div>

          {/* Customer List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-800 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-400">No customers found</p>
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <Card
                  key={customer.id}
                  className={`cursor-pointer transition-colors duration-200 ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-rose-600 border-rose-500'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                  }`}
                  onClick={() => onCustomerSelect(customer)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedCustomer?.id === customer.id
                          ? 'bg-rose-700'
                          : 'bg-gradient-to-br from-rose-600 to-rose-500'
                      }`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${
                          selectedCustomer?.id === customer.id ? 'text-white' : 'text-white'
                        }`}>
                          {customer.name}
                        </p>
                        <div className="flex flex-col gap-1 text-xs">
                          {customer.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className={`w-3 h-3 ${
                                selectedCustomer?.id === customer.id ? 'text-rose-200' : 'text-rose-400'
                              }`} />
                              <span className={selectedCustomer?.id === customer.id ? 'text-rose-100' : 'text-slate-400'}>
                                {customer.phone}
                              </span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-1">
                              <Mail className={`w-3 h-3 ${
                                selectedCustomer?.id === customer.id ? 'text-rose-200' : 'text-rose-400'
                              }`} />
                              <span className={`truncate ${selectedCustomer?.id === customer.id ? 'text-rose-100' : 'text-slate-400'}`}>
                                {customer.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}