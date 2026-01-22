import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Parse query parameters from URL
        const url = new URL(req.url);
        const assessment_id = url.searchParams.get('id');
        const include_notes = url.searchParams.get('include_notes') === 'true';

        if (!assessment_id) {
            return new Response('Assessment ID is required', { status: 400 });
        }

        // Fetch Assessment using list with service-role to bypass RLS
        const allAssessments = await base44.asServiceRole.entities.Assessment.list();
        const assessment = allAssessments.find(a => a.id === assessment_id);
        
        if (!assessment) {
            return new Response('Assessment not found', { status: 404 });
        }

        // Fetch Customer
        let customer = null;
        if (assessment.customer_id) {
            customer = await base44.asServiceRole.entities.Customer.get(assessment.customer_id);
        }

        // Fetch Vehicle(s)
        let vehicle = null;
        let vehicles = {};

        if (assessment.is_multi_vehicle && assessment.vehicles) {
            for (const v of assessment.vehicles) {
                const fetchedVehicle = await base44.asServiceRole.entities.Vehicle.get(v.vehicle_id);
                if (fetchedVehicle) {
                    vehicles[fetchedVehicle.id] = fetchedVehicle;
                }
            }
        } else if (assessment.vehicle_id) {
            vehicle = await base44.asServiceRole.entities.Vehicle.get(assessment.vehicle_id);
        }

        // Fetch UserSettings
        let userSettings = null;
        if (assessment.created_by) {
            const userSettingsList = await base44.asServiceRole.entities.UserSetting.filter({ user_email: assessment.created_by });
            if (userSettingsList.length > 0) {
                userSettings = userSettingsList[0];
            }
        }

        // Build HTML for PDF
        const getCurrencySymbol = (currency) => {
            const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
            return symbols[currency] || '£';
        };

        const currencySymbol = getCurrencySymbol(assessment.currency || 'GBP');
        const isCompleted = assessment.status === 'completed';
        const isMultiVehicle = assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0;

        const businessName = userSettings?.business_name || "Dentifier PDR";
        const businessAddress = userSettings?.business_address || "PDR Assessment & Quoting";
        const contactEmail = userSettings?.contact_email || "contact@dentifier.com";
        const businessLogo = userSettings?.business_logo_url || "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";

        const referenceNumber = isCompleted ?
            (assessment.invoice_number || `INV-${assessment.id.slice(-6)}`) :
            (assessment.quote_number || `Q-${assessment.id.slice(-6)}`);

        const invoiceFooter = isCompleted && userSettings?.invoice_footer ?
            userSettings.invoice_footer :
            (isCompleted ? "Thank you for your business! Payment is due within 7 days." :
                "This quote is valid for 30 days. Thank you for your business!");

        const notesForCustomer = include_notes ? (assessment.notes || '') : '';

        let subtotal = 0;
        let lineItemsHTML = '';

        if (isMultiVehicle) {
            assessment.vehicles.forEach(vData => {
                const vehDetails = vehicles[vData.vehicle_id];
                if (!vehDetails) return;

                lineItemsHTML += `<tr><td colspan="2" style="font-weight: bold; padding-top: 10px;">${vehDetails.year} ${vehDetails.make} ${vehDetails.model}${vehDetails.license_plate ? ` - ${vehDetails.license_plate}` : ''}</td></tr>`;

                const vehicleLineItems = vData.line_items && vData.line_items.length > 0 ? vData.line_items :
                    [{ description: 'Paintless Dent Repair Service', total_price: vData.quote_amount }];

                vehicleLineItems.forEach(item => {
                    lineItemsHTML += `<tr><td><p style="font-weight: 500; margin: 0;">${item.description}</p></td><td>${currencySymbol}${item.total_price.toFixed(2)}</td></tr>`;
                    subtotal += item.total_price;
                });
            });
        } else {
            const lineItems = assessment.line_items && assessment.line_items.length > 0 ? assessment.line_items :
                [{ description: 'Paintless Dent Repair Service', total_price: assessment.quote_amount }];

            lineItems.forEach(item => {
                lineItemsHTML += `<tr><td><p style="font-weight: 500; margin: 0;">${item.description}</p></td><td>${currencySymbol}${item.total_price.toFixed(2)}</td></tr>`;
                subtotal += item.total_price;
            });
        }

        const discountAmount = (subtotal * (assessment.discount_percentage || 0)) / 100;
        const grandTotal = subtotal - discountAmount;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${isCompleted ? 'Invoice' : 'Quote'}_${referenceNumber.replace(/[^a-zA-Z0-9-]/g, '')}_${(businessName || 'BUSINESS').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toUpperCase().substring(0, 20)}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #374151; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .logo { max-width: 192px; height: auto; margin-bottom: 8px; }
        .doc-info { text-align: right; }
        .doc-info h2 { font-size: 20px; color: #4b5563; margin: 0 0 4px 0; }
        .doc-info p { font-size: 14px; color: #6b7280; margin: 2px 0; }
        .section { margin-bottom: 32px; }
        .section-title { font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 8px; font-size: 14px; }
        .section p { margin: 4px 0; font-size: 14px; }
        .section p strong { color: #1f2937; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        table thead th { text-align: left; font-weight: 600; color: #6b7280; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        table thead th:last-child { text-align: right; }
        table tbody td { padding: 16px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        table tbody td:last-child { text-align: right; font-weight: 500; color: #1f2937; }
        .vehicle-header { font-weight: 600; padding-top: 16px; }
        .totals { width: 50%; margin-left: auto; }
        .totals tr td { padding: 8px 0; }
        .totals tr td:first-child { font-weight: 500; color: #6b7280; }
        .totals tr td:last-child { font-weight: 500; color: #1f2937; text-align: right; }
        .totals .total-row { border-top: 2px solid #d1d5db; padding-top: 16px; }
        .totals .total-row td { font-size: 20px; font-weight: 700; color: #1f2937; padding-top: 16px; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; }
        .footer p { font-size: 14px; color: #4b5563; margin: 8px 0; }
        .notes { background: #f9fafb; padding: 16px; margin: 24px 0; border-radius: 8px; }
        .notes strong { display: block; margin-bottom: 8px; font-size: 14px; color: #6b7280; }
        .notes p { font-size: 14px; color: #4b5563; white-space: pre-wrap; margin: 0; }
        .payment-box { background: #f0fdf4; border: 2px solid #86efac; padding: 16px; margin: 24px 0; border-radius: 8px; }
        .bank-box { background: #f9fafb; padding: 16px; margin: 24px 0; border-radius: 8px; }
        .bank-box strong { display: block; margin-bottom: 8px; font-size: 14px; color: #1f2937; }
        .powered-by { text-align: center; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .powered-by p { font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <img src="${businessLogo}" class="logo" alt="Logo" />
            ${!userSettings?.business_logo_url ? `<h2 style="font-size: 20px; margin: 0; color: #1f2937;">${businessName}</h2>` : ''}
        </div>
        <div class="doc-info">
            <h2>${isCompleted ? 'INVOICE' : 'QUOTE'}</h2>
            <p>#${referenceNumber}</p>
            <p>Date: ${new Date(assessment.created_date).toLocaleDateString()}</p>
            ${isMultiVehicle && assessment.assessment_name ? `<p style="font-weight: 500; color: #4b5563; margin-top: 4px;">${assessment.assessment_name}</p>` : ''}
        </div>
    </div>

    <div class="section">
        <div class="section-title">BILLED TO</div>
        ${customer ? `
            ${customer.business_name ? `<p><strong>${customer.business_name}</strong></p>` : ''}
            <p><strong>${customer.business_name ? `Contact: ${customer.name}` : customer.name}</strong></p>
            ${customer.address ? `<p>${customer.address.replace(/\n/g, '<br/>')}</p>` : ''}
            ${customer.email ? `<p>${customer.email}</p>` : ''}
            ${customer.phone ? `<p>${customer.phone}</p>` : ''}
        ` : '<p>DRAFT - Customer TBD</p>'}
    </div>

    ${!isMultiVehicle && vehicle ? `
    <div class="section">
        <div class="section-title">VEHICLE</div>
        <p><strong>${vehicle.year} ${vehicle.make} ${vehicle.model}</strong></p>
        ${vehicle.color ? `<p>Colour: ${vehicle.color}</p>` : ''}
        ${vehicle.license_plate ? `<p>Licence Plate: ${vehicle.license_plate}</p>` : ''}
        ${vehicle.vin ? `<p>VIN: ${vehicle.vin}</p>` : ''}
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">${isCompleted ? 'INVOICE DETAILS' : 'QUOTE DETAILS'}</div>
        ${isMultiVehicle ? `
            ${assessment.vehicles.map((vData, idx) => {
                const vehDetails = vehicles[vData.vehicle_id];
                if (!vehDetails) return '';
                
                let vehicleHTML = `<h4 class="vehicle-header">${vehDetails.year} ${vehDetails.make} ${vehDetails.model}${vehDetails.license_plate ? ` - ${vehDetails.license_plate}` : ''}</h4>`;
                vehicleHTML += `<table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>`;
                
                const vehicleLineItems = vData.line_items && vData.line_items.length > 0 ? vData.line_items : 
                    [{ description: 'Paintless Dent Repair Service', total_price: vData.quote_amount }];
                
                vehicleLineItems.forEach(item => {
                    vehicleHTML += `<tr><td><p style="font-weight: 500; margin: 0;">${item.description}</p></td><td>${currencySymbol}${item.total_price.toFixed(2)}</td></tr>`;
                });
                
                vehicleHTML += `</tbody></table>`;
                
                const vehicleNotes = vData.include_notes_in_quote ? (vData.notes || '') : '';
                if (vehicleNotes) {
                    vehicleHTML += `<div style="margin-bottom: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                        <p style="font-size: 12px; font-weight: 600; color: #6b7280; margin: 0 0 4px 0;">Vehicle Notes:</p>
                        <p style="font-size: 14px; color: #4b5563; margin: 0; white-space: pre-wrap;">${vehicleNotes}</p>
                    </div>`;
                }
                
                vehicleHTML += `<div style="text-align: right; margin-bottom: 24px;"><span style="font-size: 14px; color: #6b7280;">Vehicle Subtotal: </span><span style="font-weight: 600; color: #1f2937;">${currencySymbol}${(vData.quote_amount || 0).toFixed(2)}</span></div>`;
                
                return vehicleHTML;
            }).join('')}
        ` : `
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemsHTML}
                </tbody>
            </table>
        `}
    </div>

    ${!isMultiVehicle && notesForCustomer ? `
    <div class="notes">
        <strong>ASSESSMENT NOTES</strong>
        <p>${notesForCustomer.replace(/\n/g, '<br/>')}</p>
    </div>
    ` : ''}

    <table class="totals">
        <tr><td>Subtotal</td><td>${currencySymbol}${subtotal.toFixed(2)}</td></tr>
        ${isMultiVehicle && assessment.discount_percentage > 0 ? `
        <tr><td>Discount (${assessment.discount_percentage}%)</td><td style="color: #dc2626;">-${currencySymbol}${discountAmount.toFixed(2)}</td></tr>
        ` : ''}
        <tr><td>VAT (0%)</td><td>${currencySymbol}0.00</td></tr>
        <tr class="total-row"><td>Total</td><td>${currencySymbol}${grandTotal.toFixed(2)} ${assessment.currency || 'GBP'}</td></tr>
    </table>

    ${isCompleted && assessment.payment_link_url && userSettings?.payment_method_preference && 
      (userSettings.payment_method_preference === 'Payment Links Only' || userSettings.payment_method_preference === 'Both') ? `
    <div class="payment-box">
        <h3 style="font-weight: 600; color: #1f2937; margin: 0 0 8px 0; font-size: 14px;">Pay Online</h3>
        <p style="font-size: 14px; color: #4b5563; margin: 0 0 12px 0;">Click the link below to pay this invoice securely online:</p>
        <a href="${assessment.payment_link_url}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Pay Now</a>
    </div>
    ` : ''}

    ${isCompleted && userSettings?.payment_method_preference && 
      (userSettings.payment_method_preference === 'Bank Transfer Only' || userSettings.payment_method_preference === 'Both') &&
      (userSettings.bank_account_name || userSettings.bank_account_number || userSettings.bank_iban) ? `
    <div class="bank-box">
        <strong>Bank Transfer Details</strong>
        ${userSettings.bank_account_name ? `<p style="font-size: 12px; color: #4b5563; margin: 2px 0;">Account Name: ${userSettings.bank_account_name}</p>` : ''}
        ${userSettings.bank_account_number || userSettings.bank_sort_code ? `<p style="font-size: 12px; color: #4b5563; margin: 2px 0;">Account Number: ${userSettings.bank_account_number}${userSettings.bank_sort_code ? ` | Sort Code: ${userSettings.bank_sort_code}` : ''}</p>` : ''}
        ${userSettings.bank_iban ? `<p style="font-size: 12px; color: #4b5563; margin: 2px 0;">IBAN: ${userSettings.bank_iban}</p>` : ''}
    </div>
    ` : ''}

    <div class="footer">
        <div style="text-align: center; margin-bottom: 16px;">
            <h3 style="font-weight: 600; color: #1f2937; font-size: 14px; margin: 0 0 8px 0;">${businessName}</h3>
            <p style="color: #4b5563; font-size: 12px; white-space: pre-wrap; margin: 2px 0;">${businessAddress}</p>
            <p style="color: #4b5563; font-size: 12px; margin: 4px 0;">${contactEmail}</p>
        </div>
        <p style="text-align: center;">${invoiceFooter}</p>
    </div>

    <div class="powered-by">
        <p>POWERED BY DENTIFIER</p>
    </div>
</body>
</html>
        `;

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return new Response(`Error generating PDF: ${error.message}`, { status: 500 });
    }
});