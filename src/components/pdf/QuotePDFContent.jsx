import React from "react";
import { CreditCard } from "lucide-react";

const DEFAULT_DENTIFIER_LOGO = "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";

/**
 * Pure presentational component — the PDF content rendered identically
 * for both the QuotePDF page view and the off-screen html2canvas capture.
 */
export default function QuotePDFContent({
  assessment,
  customer,
  vehicle,
  vehicles,
  userSettings,
  logoDisplayUrl,
  includeNotes,
}) {
  const getCurrencySymbol = (currency) => {
    const symbols = { GBP: "£", USD: "$", EUR: "€", CAD: "C$", AUD: "A$" };
    return symbols[currency] || "£";
  };

  const currencySymbol = getCurrencySymbol(assessment.currency || "GBP");
  const isDraft = !customer;
  const isCompleted = assessment.status === "completed";
  const isMultiVehicle =
    assessment.is_multi_vehicle &&
    assessment.vehicles &&
    assessment.vehicles.length > 0;

  const businessName = userSettings?.business_name || "Dentifier PDR";
  const businessAddress =
    userSettings?.business_address || "PDR Assessment & Quoting";
  const contactEmail =
    userSettings?.contact_email || "contact@dentifier.com";

  const referenceNumber = isCompleted
    ? assessment.invoice_number || `INV-${assessment.id.slice(-6)}`
    : assessment.quote_number || `Q-${assessment.id.slice(-6)}`;

  const invoiceFooter =
    isCompleted && userSettings?.invoice_footer
      ? userSettings.invoice_footer
      : isCompleted
      ? "Thank you for your business! Payment is due within 7 days."
      : isDraft
      ? "This is a draft quote and subject to change. Quote will be finalised once customer details are confirmed. Thank you for your business!"
      : "This quote is valid for 30 days. Thank you for your business!";

  const shouldIncludeNotes = includeNotes || assessment.include_notes_in_quote;
  const notesForCustomer = shouldIncludeNotes ? assessment.notes || "" : "";

  let subtotal = 0;
  let discountAmount = 0;
  let grandTotal = 0;

  if (isMultiVehicle) {
    subtotal = assessment.vehicles.reduce(
      (sum, v) => sum + (v.quote_amount || 0),
      0
    );
    discountAmount =
      (subtotal * (assessment.discount_percentage || 0)) / 100;
    grandTotal = subtotal - discountAmount;
  } else {
    subtotal = assessment.quote_amount || 0;
    grandTotal = subtotal;
  }

  return (
    <div
      style={{
        background: "white",
        padding: "48px",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        lineHeight: "1.7",
        color: "#1f2937",
        width: "794px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "32px",
        }}
      >
        <div>
          <img
            src={logoDisplayUrl || DEFAULT_DENTIFIER_LOGO}
            alt="Business Logo"
            style={{ width: "192px", objectFit: "contain", marginBottom: "8px" }}
            onError={(e) => {
              e.target.src = DEFAULT_DENTIFIER_LOGO;
            }}
          />
          {!userSettings?.business_logo_url && (
            <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937" }}>
              {businessName}
            </h1>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#374151" }}>
            {isCompleted
              ? isDraft
                ? "DRAFT INVOICE"
                : "INVOICE"
              : isDraft
              ? "DRAFT QUOTE"
              : "QUOTE"}
          </h2>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>#{referenceNumber}</p>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "8px" }}>
            Date: {new Date(assessment.created_date).toLocaleDateString()}
          </p>
          {isMultiVehicle && assessment.assessment_name && (
            <p style={{ color: "#4b5563", fontSize: "14px", marginTop: "4px", fontWeight: "500" }}>
              {assessment.assessment_name}
            </p>
          )}
        </div>
      </div>

      {/* Customer & Vehicle */}
      <div style={{ marginBottom: "32px" }}>
        <h3
          style={{
            fontWeight: "600",
            color: "#6b7280",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "8px",
            marginBottom: "8px",
            fontSize: "14px",
          }}
        >
          BILLED TO
        </h3>
        {customer ? (
          <div>
            {customer.business_name && (
              <p style={{ fontWeight: "bold", color: "#1f2937" }}>{customer.business_name}</p>
            )}
            <p style={{ color: customer.business_name ? "#4b5563" : "#1f2937", fontWeight: customer.business_name ? "normal" : "bold" }}>
              {customer.business_name ? `Contact: ${customer.name}` : customer.name}
            </p>
            {customer.address && (
              <p style={{ color: "#4b5563", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{customer.address}</p>
            )}
            {customer.email && (
              <p style={{ color: "#4b5563", wordBreak: "break-word" }}>{customer.email}</p>
            )}
            {customer.phone && <p style={{ color: "#4b5563" }}>{customer.phone}</p>}
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: "bold", color: "#1f2937" }}>DRAFT - Customer TBD</p>
            <p style={{ color: "#4b5563", fontSize: "14px", marginTop: "8px" }}>
              This is a draft quote.
              <br />
              Customer details will be added when finalized.
            </p>
          </div>
        )}

        {!isMultiVehicle && vehicle && (
          <div style={{ marginTop: "16px" }}>
            <h3
              style={{
                fontWeight: "600",
                color: "#6b7280",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "8px",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              VEHICLE
            </h3>
            <p style={{ fontWeight: "bold", color: "#1f2937" }}>
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            {vehicle.color && <p style={{ color: "#4b5563" }}>Colour: {vehicle.color}</p>}
            {vehicle.license_plate && (
              <p style={{ color: "#4b5563" }}>Licence: {vehicle.license_plate}</p>
            )}
            {vehicle.vin && <p style={{ color: "#4b5563" }}>VIN: {vehicle.vin}</p>}
          </div>
        )}

        {isMultiVehicle && (
          <div style={{ marginTop: "16px" }}>
            <h3
              style={{
                fontWeight: "600",
                color: "#6b7280",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: "8px",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              VEHICLES
            </h3>
            <p style={{ color: "#4b5563" }}>
              {assessment.vehicles.length} Vehicle{assessment.vehicles.length !== 1 ? "s" : ""}
            </p>
            <div style={{ marginTop: "8px" }}>
              {assessment.vehicles.map((vData, idx) => {
                const vehDetails = vehicles[vData.vehicle_id];
                if (!vehDetails) return null;
                return (
                  <p key={idx} style={{ color: "#374151", fontSize: "14px" }}>
                    • {vehDetails.year} {vehDetails.make} {vehDetails.model}
                    {vehDetails.license_plate && ` (${vehDetails.license_plate})`}
                  </p>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Line Items */}
      <h3
        style={{
          fontWeight: "600",
          color: "#6b7280",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: "8px",
          marginBottom: "8px",
          fontSize: "14px",
        }}
      >
        {isCompleted ? "INVOICE DETAILS" : "QUOTE DETAILS"}
      </h3>

      {isMultiVehicle ? (
        <div style={{ marginBottom: "24px" }}>
          {assessment.vehicles.map((vData, vIdx) => {
            const vehDetails = vehicles[vData.vehicle_id];
            if (!vehDetails) return null;
            const vehicleNotes = vData.include_notes_in_quote ? vData.notes || "" : "";
            return (
              <div key={vIdx} style={{ marginBottom: "24px" }}>
                <h4 style={{ fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {vehDetails.year} {vehDetails.make} {vehDetails.model}
                  {vehDetails.license_plate && ` - ${vehDetails.license_plate}`}
                </h4>
                <table style={{ width: "100%", marginBottom: "8px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", fontWeight: "600", color: "#4b5563", padding: "8px 0", fontSize: "14px" }}>Description</th>
                      <th style={{ textAlign: "right", fontWeight: "600", color: "#4b5563", padding: "8px 0", fontSize: "14px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vData.line_items && vData.line_items.length > 0 ? (
                      vData.line_items.map((item, iIdx) => (
                        <tr key={iIdx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "12px 0", color: "#374151", fontWeight: "500" }}>{item.description}</td>
                          <td style={{ textAlign: "right", padding: "12px 0", fontWeight: "500", color: "#1f2937" }}>
                            {currencySymbol}{((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "12px 0", color: "#374151", fontWeight: "500" }}>Paintless Dent Repair Service</td>
                        <td style={{ textAlign: "right", padding: "12px 0", fontWeight: "500", color: "#1f2937" }}>
                          {currencySymbol}{(vData.quote_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {vehicleNotes && (
                  <div style={{ marginBottom: "12px", padding: "12px", background: "#f9fafb", borderRadius: "8px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "4px" }}>Vehicle Notes:</p>
                    <p style={{ fontSize: "14px", color: "#4b5563", whiteSpace: "pre-wrap" }}>{vehicleNotes}</p>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "14px", color: "#4b5563" }}>Vehicle Subtotal: </span>
                  <span style={{ fontWeight: "600", color: "#1f2937", marginLeft: "8px" }}>
                    {currencySymbol}{(vData.quote_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <table style={{ width: "100%", marginBottom: "24px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", fontWeight: "600", color: "#4b5563", padding: "8px 0", fontSize: "14px" }}>Description</th>
              <th style={{ textAlign: "right", fontWeight: "600", color: "#4b5563", padding: "8px 0", fontSize: "14px" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {assessment.line_items && assessment.line_items.length > 0 ? (
              assessment.line_items.map((item, index) => (
                <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "16px 0", color: "#374151", fontWeight: "500" }}>{item.description}</td>
                  <td style={{ textAlign: "right", padding: "16px 0", fontWeight: "500", color: "#1f2937" }}>
                    {currencySymbol}{((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "16px 0", color: "#374151" }}>
                  <p style={{ fontWeight: "500" }}>Paintless Dent Repair Service</p>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>Standard PDR service.</p>
                </td>
                <td style={{ textAlign: "right", padding: "16px 0", fontWeight: "500", color: "#1f2937" }}>
                  {currencySymbol}{(assessment.quote_amount || 0).toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Single-vehicle notes */}
      {!isMultiVehicle && notesForCustomer && (
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontWeight: "600", color: "#6b7280", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "8px", fontSize: "14px" }}>
            ASSESSMENT NOTES
          </h3>
          <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
            <p style={{ fontSize: "14px", color: "#4b5563", whiteSpace: "pre-wrap" }}>{notesForCustomer}</p>
          </div>
        </div>
      )}

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
        <div style={{ width: "50%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontWeight: "500", color: "#4b5563" }}>Subtotal</span>
            <span style={{ fontWeight: "500", color: "#1f2937" }}>{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          {isMultiVehicle && assessment.discount_percentage > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontWeight: "500", color: "#4b5563" }}>Discount ({assessment.discount_percentage}%)</span>
              <span style={{ fontWeight: "500", color: "#dc2626" }}>-{currencySymbol}{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontWeight: "500", color: "#4b5563" }}>VAT (0%)</span>
            <span style={{ fontWeight: "500", color: "#1f2937" }}>{currencySymbol}0.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: "2px solid #d1d5db", marginTop: "8px" }}>
            <span style={{ fontWeight: "bold", fontSize: "20px", color: "#1f2937" }}>Total</span>
            <span style={{ fontWeight: "bold", fontSize: "20px", color: "#1f2937" }}>
              {currencySymbol}{grandTotal.toFixed(2)} {assessment.currency || "GBP"}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Link */}
      {isCompleted &&
        assessment.payment_link_url &&
        userSettings?.payment_method_preference &&
        (userSettings.payment_method_preference === "Payment Links Only" ||
          userSettings.payment_method_preference === "Both") && (
          <div
            style={{
              marginBottom: "48px",
              padding: "24px",
              background: "#f0fdf4",
              border: "2px solid #bbf7d0",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ fontWeight: "600", color: "#374151", marginBottom: "8px", fontSize: "16px" }}>
              Pay Online
            </h3>
            <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "12px" }}>
              Click the button below to pay this invoice securely online:
            </p>
            <a
              href={assessment.payment_link_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                background: "#16a34a",
                color: "#ffffff",
                fontWeight: "600",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Pay Now
            </a>
          </div>
        )}

      {/* Bank details (invoices only) */}
      {isCompleted &&
        userSettings &&
        (userSettings.payment_method_preference === "Bank Transfer Only" ||
          userSettings.payment_method_preference === "Both") &&
        (userSettings.bank_account_name ||
          userSettings.bank_account_number ||
          userSettings.bank_iban) && (
          <div style={{ marginTop: "0", paddingTop: "0" }}>
            <div style={{ padding: "12px", background: "#f9fafb", borderRadius: "4px" }}>
              <h3 style={{ fontWeight: "600", color: "#374151", fontSize: "14px", marginBottom: "8px" }}>
                Bank Transfer Details
              </h3>
              {userSettings.bank_account_name && (
                <p style={{ color: "#4b5563", fontSize: "12px" }}>
                  Account Name: {userSettings.bank_account_name}
                </p>
              )}
              {(userSettings.bank_account_number || userSettings.bank_sort_code) && (
                <p style={{ color: "#4b5563", fontSize: "12px" }}>
                  Account Number: {userSettings.bank_account_number}
                  {userSettings.bank_sort_code && ` | Sort Code: ${userSettings.bank_sort_code}`}
                </p>
              )}
              {userSettings.bank_iban && (
                <p style={{ color: "#4b5563", fontSize: "12px" }}>IBAN: {userSettings.bank_iban}</p>
              )}
            </div>
          </div>
        )}

      {/* Two-column footer: business info left, footer text + branding right */}
      <div style={{ paddingTop: "16px", marginTop: "24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        {/* Left column: business name, address, email */}
        <div style={{ flex: "0 0 auto", maxWidth: "50%" }}>
          <h3 style={{ fontWeight: "600", color: "#374151", fontSize: "13px", marginBottom: "4px" }}>{businessName}</h3>
          <p style={{ color: "#4b5563", fontSize: "11px", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{businessAddress}</p>
          {contactEmail && <p style={{ color: "#4b5563", fontSize: "11px", marginTop: "2px" }}>{contactEmail}</p>}
        </div>

        {/* Right column: footer text + Dentifier branding */}
        <div style={{ flex: "0 0 auto", maxWidth: "46%", textAlign: "right" }}>
          <p style={{ fontSize: "12px", color: "#4b5563", marginBottom: "12px" }}>{invoiceFooter}</p>
          <p style={{ fontSize: "10px", color: "#9ca3af", marginBottom: "4px" }}>POWERED BY DENTIFIER</p>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a8991579d29e7c386105d5/f8b406687_dentifierfullcolourstraphi-res.png"
            alt="Dentifier Logo"
            style={{ height: "20px", display: "inline-block" }}
          />
        </div>
      </div>
    </div>
  );
}