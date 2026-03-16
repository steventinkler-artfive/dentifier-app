import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import CustomerForm from "@/components/customers/CustomerForm";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  User as UserIcon,
  FileText,
  Mail,
  Phone,
  Share2,
  CreditCard,
  CheckCircle,
  CheckCircle2,
  Plus,
  Briefcase,
  Loader2,
  Edit,
  Save,
  Search,
  UserPlus,
} from "lucide-react";

export default function QuoteTab({
  assessment,
  customer,
  userSettings,
  vehicleIndex,
  currentLineItems,
  loadAssessmentDetails,
  isUpdating,
  isAssigningCustomer,
  setIsAssigningCustomer,
  customerList,
  setCustomerList,
  searchTerm,
  setSearchTerm,
  showAddCustomerForm,
  setShowAddCustomerForm,
  editedNotes,
  setEditedNotes,
  editingNotes,
  setEditingNotes,
  includeNotesInQuote,
  copied,
  isSendingEmail,
  checkingPayment,
  isGeneratingPDF,
  handleAssignCustomer,
  handleCreateAndAssignCustomer,
  handleSaveNotes,
  handleToggleNotesInQuote,
  handleViewPDF,
  handleShare,
  handleEmail,
  handleCheckPaymentStatus,
  handleStatusChange,
  formatCurrency,
  getCurrencySymbol,
}) {
  const [isGeneratingPaymentLink, setIsGeneratingPaymentLink] = useState(false);
  const [discountInput, setDiscountInput] = useState(
    assessment.discount_percentage > 0 ? String(assessment.discount_percentage) : ""
  );
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);

  useEffect(() => {
    setDiscountInput(assessment.discount_percentage > 0 ? String(assessment.discount_percentage) : "");
  }, [assessment.discount_percentage]);

  const handleGeneratePaymentLink = async () => {
    if (!assessment || !userSettings) return;
    setIsGeneratingPaymentLink(true);
    try {
      const response = await base44.functions.invoke("generatePaymentLink", {
        assessment_id: assessment.id,
      });
      if (response.data.success && response.data.payment_link) {
        const paymentLink = response.data.payment_link;
        await loadAssessmentDetails();
        await navigator.clipboard.writeText(paymentLink);
        if (
          window.confirm(
            `Payment link generated and copied to clipboard!\n\nProvider: ${response.data.provider}\n\nWould you like to open the link?`
          )
        ) {
          window.open(paymentLink, "_blank");
        }
      } else {
        alert("Failed to generate payment link. Please check your payment provider settings.");
      }
    } catch (error) {
      console.error("Error generating payment link:", error);
      alert(
        `Failed to generate payment link: ${error.message || "Please check your payment provider settings and try again."}`
      );
    } finally {
      setIsGeneratingPaymentLink(false);
    }
  };

  const handleSaveDiscount = async (value) => {
    const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
    setIsSavingDiscount(true);
    try {
      await base44.entities.Assessment.update(assessment.id, {
        discount_percentage: pct,
      });
      await loadAssessmentDetails();
    } catch (error) {
      console.error("Error saving discount:", error);
    } finally {
      setIsSavingDiscount(false);
    }
  };

  // Totals calculations
  const currencySymbol = getCurrencySymbol(assessment.currency || "GBP");
  const lineItemsTotal = currentLineItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const subtotal = lineItemsTotal > 0 ? lineItemsTotal : assessment.quote_amount || 0;
  const discountPct = assessment.discount_percentage || 0;
  const discountAmt = (subtotal * discountPct) / 100;
  const netTotal = subtotal - discountAmt;
  const isVat = userSettings?.is_vat_registered;
  const vatRate = userSettings?.tax_rate || 0;
  const vatAmt = isVat ? (netTotal * vatRate) / 100 : 0;
  const grandTotal = netTotal + vatAmt;

  return (
    <>
      {/* Customer Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <UserIcon className="w-4 h-4 text-blue-400" />
              Customer
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const user = await base44.auth.me();
                const customers = await base44.entities.Customer.filter({ created_by: user.email });
                setCustomerList(customers);
                setIsAssigningCustomer(true);
              }}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 text-xs h-auto py-1"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              {customer ? "Change" : "Assign"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-sm">
          {customer ? (
            <div className="space-y-2">
              {customer.business_name && (
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">{customer.business_name}</p>
                    <p className="text-slate-400 text-xs">Contact: {customer.name}</p>
                  </div>
                </div>
              )}
              {!customer.business_name && (
                <div className="flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-white">{customer.name}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${customer.email}`} className="text-blue-400 hover:text-blue-300 text-xs">
                    {customer.email}
                  </a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${customer.phone}`} className="text-blue-400 hover:text-blue-300 text-xs">
                    {customer.phone}
                  </a>
                </div>
              )}
            </div>
          ) : !isAssigningCustomer && !customer ? (
            <p className="text-slate-400 text-xs">No customer assigned</p>
          ) : null}
          {isAssigningCustomer &&
            (showAddCustomerForm ? (
              <div className="space-y-4">
                <CustomerForm
                  onSave={handleCreateAndAssignCustomer}
                  onCancel={() => {
                    setShowAddCustomerForm(false);
                    setIsAssigningCustomer(false);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-slate-800 border-slate-700 text-white text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {customerList
                    .filter(
                      (c) =>
                        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleAssignCustomer(c.id)}
                        className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors"
                      >
                        <p className="text-white font-medium text-sm">{c.business_name || c.name}</p>
                        {c.business_name && <p className="text-slate-400 text-xs">Contact: {c.name}</p>}
                        {c.email && <p className="text-slate-500 text-xs">{c.email}</p>}
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAddCustomerForm(true)}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Customer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAssigningCustomer(false);
                      setSearchTerm("");
                    }}
                    className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white text-base">
              <FileText className="w-4 h-4 text-yellow-400" />
              Line Items
            </CardTitle>
            {currentLineItems.length > 0 && (
              <Link
                to={createPageUrl(
                  `EditQuote?id=${assessment.id}${vehicleIndex !== null ? `&vehicle=${vehicleIndex}` : ""}`
                )}
              >
                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 text-xs h-auto py-1">
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm">
          {currentLineItems.length > 0 ? (
            <div className="space-y-3">
              {currentLineItems.map((item, index) => (
                <div key={index} className="p-3 bg-slate-800 rounded-lg">
                  <div className="flex justify-between items-start">
                    <p className="text-white font-medium text-sm flex-1">{item.description}</p>
                    <span className="text-white font-medium text-sm ml-2">
                      {formatCurrency(item.total_price, assessment.currency || "GBP")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs">No quote details available</p>
          )}
        </CardContent>
      </Card>

      {/* Totals Section */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-slate-400 text-sm w-28 shrink-0">Discount (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                onBlur={(e) => handleSaveDiscount(e.target.value)}
                placeholder="0"
                className="w-24 bg-slate-800 border-slate-700 text-white text-sm"
              />
              {isSavingDiscount && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
          </div>
          <div className="border-t border-slate-700 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal</span>
              <span>{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            {discountPct > 0 && (
              <>
                <div className="flex justify-between text-green-400">
                  <span>Discount ({discountPct}%)</span>
                  <span>-{currencySymbol}{discountAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Net Total</span>
                  <span>{currencySymbol}{netTotal.toFixed(2)}</span>
                </div>
              </>
            )}
            {isVat && (
              <div className="flex justify-between text-slate-400">
                <span>VAT ({vatRate}%)</span>
                <span>{currencySymbol}{vatAmt.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-semibold pt-1.5 border-t border-slate-700">
              <span>Total</span>
              <span className="text-green-400">{currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">Assessment Notes</CardTitle>
            {!editingNotes && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingNotes(true)}
                className="text-blue-400 hover:text-blue-300 text-xs h-auto py-1"
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {editingNotes ? (
            <div className="space-y-3">
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                rows={4}
                placeholder="Add notes..."
                className="bg-slate-800 border-slate-700 text-white text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingNotes(false);
                    setEditedNotes(assessment.notes || "");
                  }}
                  className="bg-slate-800 border-slate-700 text-white text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-slate-400 whitespace-pre-wrap text-xs">
                {assessment.notes || "No notes added"}
              </p>
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <Label htmlFor="include-notes" className="text-white text-sm cursor-pointer">
                  Include notes in PDF quote
                </Label>
                <Switch
                  id="include-notes"
                  checked={includeNotesInQuote}
                  onCheckedChange={handleToggleNotesInQuote}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleViewPDF}
            disabled={isGeneratingPDF}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {isGeneratingPDF ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" />{assessment.status === "completed" ? "PDF Invoice" : "PDF Quote"}</>
            )}
          </Button>
          <Button
            onClick={handleShare}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>

        {customer?.email && (
          <Button
            onClick={handleEmail}
            disabled={isSendingEmail}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {isSendingEmail ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
            ) : (
              <><Mail className="w-4 h-4 mr-2" />Email {assessment.status === "completed" ? "Invoice" : "Quote"}</>
            )}
          </Button>
        )}

        {assessment.status === "completed" && assessment.payment_link_url && assessment.payment_status !== "paid" && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCheckPaymentStatus}
              disabled={checkingPayment}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {checkingPayment ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
              ) : (
                <><CreditCard className="w-4 h-4 mr-2" />Check Payment</>
              )}
            </Button>
            <Button
              onClick={() => navigator.clipboard.writeText(assessment.payment_link_url)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
          </div>
        )}

        {assessment.status === "completed" && assessment.payment_status === "paid" && (
          <Button disabled className="w-full bg-green-600 text-white font-semibold opacity-70">
            <CreditCard className="w-4 h-4 mr-2" />
            Paid ✓
          </Button>
        )}

        {assessment.status === "completed" &&
          userSettings?.payment_provider &&
          userSettings.payment_provider !== "None" &&
          !assessment.payment_link_url && (
            <Button
              onClick={handleGeneratePaymentLink}
              disabled={isGeneratingPaymentLink}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
            >
              {isGeneratingPaymentLink ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Generate Payment Link
            </Button>
          )}

        {assessment.status === "draft" && currentLineItems.length === 0 && (
          <Link
            to={createPageUrl(
              `EditQuote?id=${assessment.id}${vehicleIndex !== null ? `&vehicle=${vehicleIndex}` : ""}`
            )}
          >
            <Button className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Quote Details
            </Button>
          </Link>
        )}

        {assessment.status === "quoted" && (
          <Button
            onClick={() => handleStatusChange("approved")}
            disabled={isUpdating}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Mark as Approved
          </Button>
        )}

        {(assessment.status === "approved" || assessment.status === "quoted") && (
          <Button
            onClick={() => handleStatusChange("completed")}
            disabled={isUpdating}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Mark as Completed
          </Button>
        )}
      </div>
    </>
  );
}