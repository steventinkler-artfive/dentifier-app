import React from "react";

const DEFAULT_DENTIFIER_LOGO = "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";

const getCurrencySymbol = (currency) => {
  const symbols = { GBP: "£", USD: "$", EUR: "€", CAD: "C$", AUD: "A$" };
  return symbols[currency] || "£";
};

export default function ClientStatementPDF({ assessments, customer, userSettings, periodLabel, currency = "GBP", logoDisplayUrl }) {
  const sym = getCurrencySymbol(currency);
  const fmt = (amount) => `${sym}${(amount || 0).toFixed(2)}`;

  const totalInvoiced = assessments.reduce((s, a) => s + (a.quote_amount || 0), 0);
  const totalPaid = assessments.filter((a) => a.payment_status === "paid").reduce((s, a) => s + (a.quote_amount || 0), 0);
  const outstanding = totalInvoiced - totalPaid;

  const businessName = userSettings?.business_name || "Dentifier PDR";
  const businessAddress = userSettings?.business_address || "";
  const contactEmail = userSettings?.contact_email || "";

  return (
    <div
      style={{
        background: "white",
        padding: "48px",
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        lineHeight: "1.4",
        color: "#1f2937",
        width: "794px",
        boxSizing: "border-box",
      }}
    >
      {/* Header — logo left, title right (mirrors QuotePDFContent) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <img
            src={userSettings?.business_logo_url || logoDisplayUrl || DEFAULT_DENTIFIER_LOGO}
            alt="Business Logo"
            style={{ maxHeight: "110px", maxWidth: "200px", width: "auto", height: "auto", marginBottom: "8px" }}
            onError={(e) => { e.target.src = DEFAULT_DENTIFIER_LOGO; }}
          />
          {!userSettings?.business_logo_url && (
            <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#1f2937" }}>{businessName}</h1>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "#374151" }}>STATEMENT OF ACCOUNT</h2>
          <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "8px" }}>Period: {periodLabel}</p>
        </div>
      </div>

      {/* Billed To */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ fontWeight: "600", color: "#6b7280", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "8px", fontSize: "14px" }}>
          BILLED TO
        </h3>
        {customer?.business_name && (
          <p style={{ fontWeight: "bold", color: "#1f2937" }}>{customer.business_name}</p>
        )}
        <p style={{ color: customer?.business_name ? "#4b5563" : "#1f2937", fontWeight: customer?.business_name ? "normal" : "bold" }}>
          {customer?.business_name ? `Contact: ${customer.name}` : customer?.name}
        </p>
        {customer?.address && (
          <p style={{ color: "#4b5563", whiteSpace: "pre-wrap" }}>{customer.address}</p>
        )}
        {customer?.email && <p style={{ color: "#4b5563" }}>{customer.email}</p>}
      </div>

      {/* Invoice Table */}
      <h3 style={{ fontWeight: "600", color: "#6b7280", borderBottom: "1px solid #e5e7eb", paddingBottom: "8px", marginBottom: "8px", fontSize: "14px" }}>
        INVOICE DETAILS
      </h3>

      <table style={{ width: "100%", marginBottom: "24px", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "20%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "25%" }} />
          <col style={{ width: "25%" }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ fontWeight: "600", color: "#4b5563", padding: "8px 0", fontSize: "14px" }}>Date</th>
            <th style={{ fontWeight: "600", color: "#4b5563", padding: "8px 0", fontSize: "14px" }}>Invoice No.</th>
            <th style={{ fontWeight: "600", color: "#4b5563", padding: "8px 0", fontSize: "14px", textAlign: "right" }}>Amount</th>
            <th style={{ fontWeight: "600", color: "#4b5563", padding: "8px 0", fontSize: "14px", textAlign: "right" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map((a) => {
            const date = new Date(a.sent_date || a.created_date).toLocaleDateString("en-GB");
            const invNo = a.invoice_number || a.quote_number || `#${a.id.slice(-6)}`;
            const isPaid = a.payment_status === "paid";
            return (
              <tr key={a.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "16px 0", fontWeight: "500", color: "#1f2937" }}>{date}</td>
                <td style={{ padding: "16px 0", fontWeight: "500", color: "#1f2937" }}>{invNo}</td>
                <td style={{ padding: "16px 0", fontWeight: "500", color: "#1f2937", textAlign: "right" }}>{fmt(a.quote_amount || 0)}</td>
                <td style={{ padding: "16px 0", fontWeight: "500", color: "#1f2937", textAlign: "right" }}>
                  {isPaid ? "Paid" : "Pending Payment"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary totals — right-aligned, mirrors QuotePDFContent totals block */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
        <div style={{ width: "50%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontWeight: "500", color: "#4b5563" }}>Total Invoiced</span>
            <span style={{ fontWeight: "500", color: "#1f2937" }}>{fmt(totalInvoiced)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontWeight: "500", color: "#4b5563" }}>Total Paid</span>
            <span style={{ fontWeight: "500", color: "#1f2937" }}>{fmt(totalPaid)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderTop: "2px solid #d1d5db", marginTop: "8px" }}>
            <span style={{ fontWeight: "bold", fontSize: "20px", color: "#1f2937" }}>Outstanding</span>
            <span style={{ fontWeight: "bold", fontSize: "20px", color: "#1f2937" }}>
              {fmt(outstanding)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer — mirrors QuotePDFContent two-column footer */}
      <div style={{ paddingTop: "16px", marginTop: "24px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ flex: "0 0 auto", maxWidth: "50%" }}>
          <h3 style={{ fontWeight: "600", color: "#374151", fontSize: "13px", marginBottom: "4px" }}>{businessName}</h3>
          {businessAddress && <p style={{ color: "#4b5563", fontSize: "11px", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{businessAddress}</p>}
          {contactEmail && <p style={{ color: "#4b5563", fontSize: "11px", marginTop: "2px" }}>{contactEmail}</p>}
        </div>
        <div style={{ flex: "0 0 auto", maxWidth: "46%", textAlign: "right" }}>
          <p style={{ fontSize: "12px", color: "#4b5563", marginBottom: "12px" }}>Thank you for your business.</p>
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