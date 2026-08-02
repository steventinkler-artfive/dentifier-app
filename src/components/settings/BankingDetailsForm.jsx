import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isValidAccountNumber,
  isValidSortCode,
  formatSortCode,
} from "@/utils/bankingValidation";

/**
 * Shared banking details fields (Account Name, Account Number, Sort Code,
 * IBAN, SWIFT) with inline UK-format validation.
 *
 * Props:
 *   formData  - the form state object holding bank_* fields
 *   onChange   - (field, value) => void  (same signature used by both
 *                OnboardingWizard.handleChange and Settings.handleInputChange)
 *
 * Sort code is auto-formatted to XX-XX-XX as the user types; account number
 * is restricted to 8 numeric digits. Inline errors appear once a field is
 * blurred so the user gets immediate, clear feedback.
 */
export default function BankingDetailsForm({ formData, onChange }) {
  const [touched, setTouched] = useState({});

  const accountName = formData.bank_account_name || '';
  const accountNumber = formData.bank_account_number || '';
  const sortCode = formData.bank_sort_code || '';

  const accountNameError =
    touched.accountName && !accountName.trim() ? 'Account name is required.' : null;
  const accountNumberError =
    touched.accountNumber && !isValidAccountNumber(accountNumber)
      ? 'Account number must be exactly 8 digits.'
      : null;
  const sortCodeError =
    touched.sortCode && !isValidSortCode(sortCode)
      ? 'Sort code must be 6 digits, e.g. 12-34-56.'
      : null;

  const markTouched = (field) => () =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white">Account Name *</Label>
        <Input
          value={accountName}
          onChange={(e) => onChange('bank_account_name', e.target.value)}
          onBlur={markTouched('accountName')}
          placeholder="Business Account Name"
          className={`bg-slate-800 border-slate-700 text-white ${accountNameError ? 'border-red-500' : ''}`}
        />
        {accountNameError && <p className="text-red-400 text-xs">{accountNameError}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white">Account Number *</Label>
          <Input
            value={accountNumber}
            onChange={(e) =>
              onChange('bank_account_number', e.target.value.replace(/\D/g, '').slice(0, 8))
            }
            onBlur={markTouched('accountNumber')}
            placeholder="12345678"
            inputMode="numeric"
            className={`bg-slate-800 border-slate-700 text-white ${accountNumberError ? 'border-red-500' : ''}`}
          />
          {accountNumberError && <p className="text-red-400 text-xs">{accountNumberError}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-white">Sort Code *</Label>
          <Input
            value={sortCode}
            onChange={(e) => onChange('bank_sort_code', formatSortCode(e.target.value))}
            onBlur={markTouched('sortCode')}
            placeholder="12-34-56"
            inputMode="numeric"
            className={`bg-slate-800 border-slate-700 text-white ${sortCodeError ? 'border-red-500' : ''}`}
          />
          {sortCodeError && <p className="text-red-400 text-xs">{sortCodeError}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white">IBAN (Optional)</Label>
        <Input
          value={formData.bank_iban || ''}
          onChange={(e) => onChange('bank_iban', e.target.value)}
          placeholder="GB29 NWBK 6016 1331 9268 19"
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-white">SWIFT/BIC Code (Optional)</Label>
        <Input
          value={formData.bank_swift_code || ''}
          onChange={(e) => onChange('bank_swift_code', e.target.value)}
          placeholder="NWBKGB2L"
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>
    </div>
  );
}