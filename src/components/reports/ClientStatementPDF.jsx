import React from "react";

const getCurrencySymbol = (currency) => {
  const symbols = { GBP: "£", USD: "$", EUR: "€", CAD: "C$", AUD: "A$" };
  return symbols[currency] || "£";
};

const fmt = (amount, currency) => {
  const sym = getCurrencySymbol(currency);
  return `${sym}${(amount || 0).toFixed(2)}`;
};

export default function ClientStatementPDF({ assessments, customer, userSettings, periodLabel, currency = "GBP" }) {
  const totalInvoiced = assessments.reduce((s, a) => s + (a.quote_amount || 0), 0);
  const totalPaid = assessments
    .filter((a) => a.payment_status === "paid")
    .reduce((s, a) => s + (a.quote_amount || 0), 0);
  const outstanding = totalInvoiced - totalPaid;

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#1e293b",
        background: "#fff",
        padding: "48px",
        width: "794px",
        minHeight: "1123px",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "36px" }}>
        <div>
          {userSettings?.business_name && (
            <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>
              {userSettings.business_name}
            </div>
          )}
          {userSettings?.business_address && (
            <div style={{ color: "#475569", whiteSpace: "pre-line", marginBottom: "4px" }}>
              {userSettings.business_address}
            </div>
          )}
          {userSettings?.contact_email && (
            <div style={{ color: "#475569" }}>{userSettings.contact_email}</div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          {customer?.business_name && (
            <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "4px" }}>
              {customer.business_name}
            </div>
          )}
          <div style={{ fontWeight: customer?.business_name ? "normal" : "bold", fontSize: customer?.business_name ? "13px" : "15px", marginBottom: "4px" }}>
            {customer?.name}
          </div>
          {customer?.address && (
            <div style={{ color: "#475569", whiteSpace: "pre-line" }}>{customer.address}</div>
          )}
        </div>
      </div>

      {/* Title & Period */}
      <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "24px", marginBottom: "24px" }}>
        <div style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "6px" }}>
          Statement of Account
        </div>
        <div style={{ color: "#64748b", fontSize: "13px" }}>Period: {periodLabel}</div>
      </div>

      {/* Invoice Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            {["Date", "Invoice No.", "Amount", "Status"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "10px 12px",
                  textAlign: h === "Amount" ? "right" : "left",
                  fontWeight: "600",
                  fontSize: "12px",
                  color: "#475569",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assessments.map((a, i) => {
            const date = new Date(a.sent_date || a.created_date).toLocaleDateString("en-GB");
            const invNo = a.invoice_number || a.quote_number || `#${a.id.slice(-6)}`;
            const amount = fmt(a.quote_amount || 0, currency);
            const status = a.payment_status === "paid" ? "Paid" : "Pending Payment";
            return (
              <tr key={a.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{date}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{invNo}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", textAlign: "right", color: "#334155" }}>{amount}</td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "11px",
                      fontWeight: "600",
                      background: a.payment_status === "paid" ? "#dcfce7" : "#fff7ed",
                      color: a.payment_status === "paid" ? "#166534" : "#9a3412",
                    }}
                  >
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary */}
      <div
        style={{
          marginLeft: "auto",
          width: "300px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "48px",
        }}
      >
        {[
          { label: "Total Invoiced:", value: fmt(totalInvoiced, currency) },
          { label: "Total Paid:", value: fmt(totalPaid, currency) },
          { label: "Outstanding:", value: fmt(outstanding, currency), bold: true, color: outstanding > 0 ? "#dc2626" : "#16a34a" },
        ].map(({ label, value, bold, color }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#475569", fontWeight: bold ? "600" : "normal" }}>{label}</span>
            <span style={{ fontWeight: bold ? "700" : "500", color: color || "#1e293b" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "20px", color: "#94a3b8", fontSize: "12px", textAlign: "center" }}>
        <div style={{ marginBottom: "4px" }}>Thank you for your business.</div>
        <div>
          {userSettings?.business_name}
          {userSettings?.contact_email ? ` · ${userSettings.contact_email}` : ""}
        </div>
      </div>
    </div>
  );
}