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

        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return new Response('Unauthorized', { status: 401 });
        }

        // Fetch Assessment (RLS-enforced via standard client)
        const assessment = await base44.entities.Assessment.get(assessment_id);
        
        if (!assessment) {
            return new Response('Assessment not found', { status: 404 });
        }

        // Verify ownership
        if (assessment.created_by !== user.email) {
            return new Response('Forbidden', { status: 403 });
        }

        // Validate URL scheme to prevent javascript: and other dangerous schemes
        const isSafeUrl = (url) => {
            if (!url || typeof url !== 'string') return false;
            return url.startsWith('http://') || url.startsWith('https://');
        };

        // HTML-encode helper to prevent injection of user-supplied content
        const encodeHtml = (str) => {
            if (str == null) return '';
            return String(str).replace(/[&<>"']/g, (ch) => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[ch]));
        };

        // Fetch Customer
        let customer = null;
        if (assessment.customer_id) {
            try {
                customer = await base44.entities.Customer.get(assessment.customer_id);
            } catch (e) {
                console.error('Customer fetch failed:', e);
            }
        }

        // Fetch Vehicle(s)
        let vehicle = null;
        let vehicles = {};

        if (assessment.is_multi_vehicle && assessment.vehicles) {
            for (const v of assessment.vehicles) {
                try {
                    const fetchedVehicle = await base44.entities.Vehicle.get(v.vehicle_id);
                    if (fetchedVehicle) {
                        vehicles[fetchedVehicle.id] = fetchedVehicle;
                    }
                } catch (e) {
                    console.error('Vehicle fetch failed:', e);
                }
            }
        } else if (assessment.vehicle_id) {
            try {
                vehicle = await base44.entities.Vehicle.get(assessment.vehicle_id);
            } catch (e) {
                console.error('Vehicle fetch failed:', e);
            }
        }

        // Fetch UserSettings
        let userSettings = null;
        if (assessment.created_by) {
            try {
                const userSettingsList = await base44.entities.UserSetting.filter({ user_email: assessment.created_by });
                if (userSettingsList.length > 0) {
                    userSettings = userSettingsList[0];
                }
            } catch (e) {
                console.error('Settings fetch failed:', e);
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

        const businessName = encodeHtml(userSettings?.business_name || "Dentifier PDR");
        const businessAddress = encodeHtml(userSettings?.business_address || "PDR Assessment & Quoting");
        const contactEmail = encodeHtml(userSettings?.contact_email || "contact@dentifier.com");
        const defaultLogo = "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";
        const businessLogo = isSafeUrl(userSettings?.business_logo_url) ? userSettings.business_logo_url : defaultLogo;

        const referenceNumber = encodeHtml(isCompleted ?
            (assessment.invoice_number || `INV-${assessment.id.slice(-6)}`) :
            (assessment.quote_number || `Q-${assessment.id.slice(-6)}`));

        const invoiceFooter = encodeHtml(isCompleted && userSettings?.invoice_footer ?
            userSettings.invoice_footer :
            (isCompleted ? "Thank you for your business! Payment is due within 7 days." :
                "This quote is valid for 30 days. Thank you for your business!"));

        const notesForCustomer = include_notes ? (assessment.notes || '') : '';
        const encodedNotesForCustomer = notesForCustomer ? encodeHtml(notesForCustomer).replace(/\n/g, '<br/>') : '';
        const assessmentName = assessment.assessment_name ? encodeHtml(assessment.assessment_name) : '';

        let subtotal = 0;
        let lineItemsHTML = '';

        if (isMultiVehicle) {
            assessment.vehicles.forEach(vData => {
                const vehDetails = vehicles[vData.vehicle_id];
                if (!vehDetails) return;

                lineItemsHTML += `<tr><td colspan="2" style="font-weight: bold; padding-top: 10px;">${encodeHtml(vehDetails.year)} ${encodeHtml(vehDetails.make)} ${encodeHtml(vehDetails.model)}${vehDetails.license_plate ? ` - ${encodeHtml(vehDetails.license_plate)}` : ''}</td></tr>`;

                const vehicleLineItems = vData.line_items && vData.line_items.length > 0 ? vData.line_items :
                    [{ description: 'Paintless Dent Repair Service', quantity: 1, unit_price: vData.quote_amount }];

                vehicleLineItems.forEach(item => {
                    const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
                    lineItemsHTML += `<tr><td><p style="font-weight: 500; margin: 0;">${encodeHtml(item.description)}</p></td><td>${currencySymbol}${itemTotal.toFixed(2)}</td></tr>`;
                    subtotal += itemTotal;
                });
            });
        } else {
            const lineItems = assessment.line_items && assessment.line_items.length > 0 ? assessment.line_items :
                [{ description: 'Paintless Dent Repair Service', quantity: 1, unit_price: assessment.quote_amount }];

            lineItems.forEach(item => {
                const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
                lineItemsHTML += `<tr><td><p style="font-weight: 500; margin: 0;">${encodeHtml(item.description)}</p></td><td>${currencySymbol}${itemTotal.toFixed(2)}</td></tr>`;
                subtotal += itemTotal;
            });
        }

        const discountAmount = (subtotal * (assessment.discount_percentage || 0)) / 100;
        const grandTotal = subtotal - discountAmount;

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${isCompleted ? 'Invoice' : 'Quote'}_${String(referenceNumber).replace(/[^a-zA-Z0-9-]/g, '')}_${String(businessName).replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toUpperCase().substring(0, 20)}</title>
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
            <img src="${encodeHtml(businessLogo)}" class="logo" alt="Logo" />
            ${!userSettings?.business_logo_url ? `<h2 style="font-size: 20px; margin: 0; color: #1f2937;">${businessName}</h2>` : ''}
        </div>
        <div class="doc-info">
            <h2>${isCompleted ? 'INVOICE' : 'QUOTE'}</h2>
            <p>#${referenceNumber}</p>
            <p>Date: ${new Date(assessment.created_date).toLocaleDateString()}</p>
            ${isMultiVehicle && assessmentName ? `<p style="font-weight: 500; color: #4b5563; margin-top: 4px;">${assessmentName}</p>` : ''}
        </div>
    </div>

    <div class="section">
        <div class="section-title">BILLED TO</div>
        ${customer ? `
            ${customer.business_name ? `<p><strong>${encodeHtml(customer.business_name)}</strong></p>` : ''}
            <p><strong>${customer.business_name ? `Contact: ${encodeHtml(customer.name)}` : encodeHtml(customer.name)}</strong></p>
            ${customer.address ? `<p>${encodeHtml(customer.address).replace(/\n/g, '<br/>')}</p>` : ''}
            ${customer.email ? `<p>${encodeHtml(customer.email)}</p>` : ''}
            ${customer.phone ? `<p>${encodeHtml(customer.phone)}</p>` : ''}
        ` : '<p>DRAFT - Customer TBD</p>'}
    </div>

    ${!isMultiVehicle && vehicle ? `
    <div class="section">
        <div class="section-title">VEHICLE</div>
        <p><strong>${encodeHtml(vehicle.year)} ${encodeHtml(vehicle.make)} ${encodeHtml(vehicle.model)}</strong></p>
        ${vehicle.color ? `<p>Colour: ${encodeHtml(vehicle.color)}</p>` : ''}
        ${vehicle.license_plate ? `<p>Licence Plate: ${encodeHtml(vehicle.license_plate)}</p>` : ''}
        ${vehicle.vin ? `<p>VIN: ${encodeHtml(vehicle.vin)}</p>` : ''}
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">${isCompleted ? 'INVOICE DETAILS' : 'QUOTE DETAILS'}</div>
        ${isMultiVehicle ? `
            ${assessment.vehicles.map((vData, idx) => {
                const vehDetails = vehicles[vData.vehicle_id];
                if (!vehDetails) return '';
                
                let vehicleHTML = `<h4 class="vehicle-header">${encodeHtml(vehDetails.year)} ${encodeHtml(vehDetails.make)} ${encodeHtml(vehDetails.model)}${vehDetails.license_plate ? ` - ${encodeHtml(vehDetails.license_plate)}` : ''}</h4>`;
                vehicleHTML += `<table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>`;
                
                const vehicleLineItems = vData.line_items && vData.line_items.length > 0 ? vData.line_items : 
                    [{ description: 'Paintless Dent Repair Service', quantity: 1, unit_price: vData.quote_amount }];
                
                vehicleLineItems.forEach(item => {
                    const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
                    vehicleHTML += `<tr><td><p style="font-weight: 500; margin: 0;">${encodeHtml(item.description)}</p></td><td>${currencySymbol}${itemTotal.toFixed(2)}</td></tr>`;
                });
                
                vehicleHTML += `</tbody></table>`;
                
                const vehicleNotes = vData.include_notes_in_quote ? (vData.notes || '') : '';
                if (vehicleNotes) {
                    vehicleHTML += `<div style="margin-bottom: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                        <p style="font-size: 12px; font-weight: 600; color: #6b7280; margin: 0 0 4px 0;">Vehicle Notes:</p>
                        <p style="font-size: 14px; color: #4b5563; margin: 0; white-space: pre-wrap;">${encodeHtml(vehicleNotes).replace(/\n/g, '<br/>')}</p>
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

    ${!isMultiVehicle && encodedNotesForCustomer ? `
    <div class="notes">
        <strong>ASSESSMENT NOTES</strong>
        <p>${encodedNotesForCustomer}</p>
    </div>
    ` : ''}

    <table class="totals">
        <tr><td>Subtotal</td><td>${currencySymbol}${subtotal.toFixed(2)}</td></tr>
        ${isMultiVehicle && assessment.discount_percentage > 0 ? `
        <tr><td>Discount (${assessment.discount_percentage}%)</td><td style="color: #dc2626;">-${currencySymbol}${discountAmount.toFixed(2)}</td></tr>
        ` : ''}
        <tr><td>VAT (0%)</td><td>${currencySymbol}0.00</td></tr>
        <tr class="total-row"><td>Total</td><td>${currencySymbol}${grandTotal.toFixed(2)} ${encodeHtml(assessment.currency || 'GBP')}</td></tr>
    </table>

    ${isCompleted && assessment.payment_link_url && userSettings?.payment_method_preference && 
      (userSettings.payment_method_preference === 'Payment Links Only' || userSettings.payment_method_preference === 'Both') ? `
    <div class="payment-box">
        <h3 style="font-weight: 600; color: #1f2937; margin: 0 0 8px 0; font-size: 14px;">Pay Online</h3>
        <p style="font-size: 14px; color: #4b5563; margin: 0 0 12px 0;">Click the link below to pay this invoice securely online:</p>
        ${isSafeUrl(assessment.payment_link_url) ? `<a href="${encodeHtml(assessment.payment_link_url)}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">Pay Now</a>` : '<p style="font-size: 14px; color: #6b7280; margin: 0;">Payment link unavailable.</p>'}
    </div>
    ` : ''}

    ${isCompleted && userSettings?.payment_method_preference && 
      (userSettings.payment_method_preference === 'Bank Transfer Only' || userSettings.payment_method_preference === 'Both') &&
      (userSettings.bank_account_name || userSettings.bank_account_number || userSettings.bank_iban) ? `
    <div class="bank-box">
        <strong>Bank Transfer Details</strong>
        ${userSettings.bank_account_name ? `<p style="font-size: 12px; color: #4b5563; margin: 2px 0;">Account Name: ${encodeHtml(userSettings.bank_account_name)}</p>` : ''}
        ${userSettings.bank_account_number || userSettings.bank_sort_code ? `<p style="font-size: 12px; color: #4b5563; margin: 2px 0;">Account Number: ${encodeHtml(userSettings.bank_account_number)}${userSettings.bank_sort_code ? ` | Sort Code: ${encodeHtml(userSettings.bank_sort_code)}` : ''}</p>` : ''}
        ${userSettings.bank_iban ? `<p style="font-size: 12px; color: #4b5563; margin: 2px 0;">IBAN: ${encodeHtml(userSettings.bank_iban)}</p>` : ''}
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