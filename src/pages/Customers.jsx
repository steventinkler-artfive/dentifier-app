import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Customer } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import CustomerForm from "../components/customers/CustomerForm";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery) ||
      customer.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) // Add business_name to search
    );
    setFilteredCustomers(filtered);
  }, [customers, searchQuery]);

  const loadCustomers = async () => {
    try {
      const user = await base44.auth.me();
      const data = await Customer.filter({ created_by: user.email }, '-created_date');
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      if (selectedCustomer) {
        await Customer.update(selectedCustomer.id, customerData);
      } else {
        await Customer.create(customerData);
      }
      await loadCustomers();
      setShowForm(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setSelectedCustomer(null);
    setShowForm(true);
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Delete ${customer.business_name || customer.name}? This cannot be undone.`)) return;
    try {
      await Customer.delete(customer.id);
      await loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (showForm) {
    return (
      <CustomerForm
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
        onCancel={() => {
          setShowForm(false);
          setSelectedCustomer(null);
        }}
      />
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-slate-400 text-sm">{customers.length} total customers</p>
        </div>
        <Button onClick={handleAddNew} className="pink-gradient text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-400"
        />
      </div>

      {/* Customer List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-slate-900 border-slate-800">
                <CardContent className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-slate-700 rounded mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">
                {customers.length === 0 ? 'No customers yet' : 'No customers found'}
              </p>
              <p className="text-slate-500 text-sm mb-4">
                {customers.length === 0 ? 'Add your first customer to get started' : 'Try adjusting your search'}
              </p>
              {customers.length === 0 && (
                <Button onClick={handleAddNew} className="pink-gradient text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Customer
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="bg-slate-900 border-slate-800 hover:bg-slate-800/60 transition-colors duration-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-600 to-rose-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">
                          {customer.business_name || customer.name}
                        </h3>
                        {customer.business_name && (
                          <p className="text-slate-400 text-sm">Contact: {customer.name}</p>
                        )}
                        <p className="text-slate-400 text-sm">
                          Customer since {new Date(customer.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 ml-13">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">{customer.phone}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300 line-clamp-1">{customer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCustomer(customer)}
                      className="text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}