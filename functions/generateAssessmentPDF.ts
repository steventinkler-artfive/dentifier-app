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

        // Fetch Assessment using service-role to bypass RLS
        const assessment = await base44.asServiceRole.entities.Assessment.get(assessment_id);
        
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

                lineItemsHTML += `<tr><td colspan="2" style="font-weight: bold; padding-top: 10px;">${vehDetails.year} ${vehDetails.make} ${vehDetails.model}</td></tr>`;

                const vehicleLineItems = vData.line_items && vData.line_items.length > 0 ? vData.line_items :
                    [{ description: 'Paintless Dent Repair Service', total_price: vData.quote_amount }];

                vehicleLineItems.forEach(item => {
                    lineItemsHTML += `<tr><td style="padding-left: 20px;">${item.description}</td><td style="text-align: right;">${currencySymbol}${item.total_price.toFixed(2)}</td></tr>`;
                    subtotal += item.total_price;
                });

                const vehicleNotes = vData.include_notes_in_quote ? (vData.notes || '') : '';
                if (vehicleNotes) {
                    lineItemsHTML += `<tr><td colspan="2" style="padding-left: 20px; font-size: 12px; color: #666; padding-top: 5px;">Vehicle Notes: ${vehicleNotes}</td></tr>`;
                }
            });
        } else {
            const lineItems = assessment.line_items && assessment.line_items.length > 0 ? assessment.line_items :
                [{ description: 'Paintless Dent Repair Service', total_price: assessment.quote_amount }];

            lineItems.forEach(item => {
                lineItemsHTML += `<tr><td>${item.description}</td><td style="text-align: right;">${currencySymbol}${item.total_price.toFixed(2)}</td></tr>`;
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
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; }
        .logo { max-width: 200px; }
        .doc-info { text-align: right; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        td { padding: 8px 0; }
        .totals { text-align: right; }
        .totals tr td:first-child { font-weight: bold; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #000; font-size: 12px; color: #666; }
        .notes { background: #f5f5f5; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <img src="${businessLogo}" class="logo" alt="Logo" />
            <h2>${businessName}</h2>
        </div>
        <div class="doc-info">
            <h2>${isCompleted ? 'INVOICE' : 'QUOTE'}</h2>
            <p>#${referenceNumber}</p>
            <p>Date: ${new Date(assessment.created_date).toLocaleDateString()}</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">BILLED TO</div>
        ${customer ? `
            <p><strong>${customer.name}</strong></p>
            ${customer.business_name ? `<p>(${customer.business_name})</p>` : ''}
            ${customer.address ? `<p>${customer.address}</p>` : ''}
            ${customer.email ? `<p>${customer.email}</p>` : ''}
            ${customer.phone ? `<p>${customer.phone}</p>` : ''}
        ` : '<p>DRAFT - Customer TBD</p>'}
    </div>

    ${!isMultiVehicle && vehicle ? `
    <div class="section">
        <div class="section-title">VEHICLE</div>
        <p>${vehicle.year} ${vehicle.make} ${vehicle.model}</p>
        ${vehicle.color ? `<p>Color: ${vehicle.color}</p>` : ''}
        ${vehicle.license_plate ? `<p>License: ${vehicle.license_plate}</p>` : ''}
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">${isCompleted ? 'INVOICE DETAILS' : 'QUOTE DETAILS'}</div>
        <table>
            ${lineItemsHTML}
        </table>
    </div>

    ${notesForCustomer ? `
    <div class="notes">
        <strong>ASSESSMENT NOTES:</strong><br/>
        ${notesForCustomer.replace(/\n/g, '<br/>')}
    </div>
    ` : ''}

    <table class="totals">
        <tr><td>Subtotal:</td><td>${currencySymbol}${subtotal.toFixed(2)}</td></tr>
        ${assessment.discount_percentage > 0 ? `
        <tr><td>Discount (${assessment.discount_percentage}%):</td><td>-${currencySymbol}${discountAmount.toFixed(2)}</td></tr>
        ` : ''}
        <tr><td>VAT (0%):</td><td>${currencySymbol}0.00</td></tr>
        <tr style="font-size: 18px; border-top: 2px solid #000;"><td>TOTAL:</td><td>${currencySymbol}${grandTotal.toFixed(2)} ${assessment.currency || 'GBP'}</td></tr>
    </table>

    ${isCompleted && assessment.payment_link_url && userSettings?.payment_method_preference && 
      (userSettings.payment_method_preference === 'Payment Links Only' || userSettings.payment_method_preference === 'Both') ? `
    <div style="background: #e6f7ff; padding: 15px; margin: 20px 0; border: 2px solid #1890ff;">
        <strong>Pay Online:</strong><br/>
        <a href="${assessment.payment_link_url}" style="color: #1890ff;">${assessment.payment_link_url}</a>
    </div>
    ` : ''}

    ${isCompleted && userSettings?.payment_method_preference && 
      (userSettings.payment_method_preference === 'Bank Transfer Only' || userSettings.payment_method_preference === 'Both') &&
      (userSettings.bank_account_name || userSettings.bank_account_number) ? `
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
        <strong>Bank Transfer Details:</strong><br/>
        ${userSettings.bank_account_name ? `Account Name: ${userSettings.bank_account_name}<br/>` : ''}
        ${userSettings.bank_sort_code ? `Sort Code: ${userSettings.bank_sort_code}<br/>` : ''}
        ${userSettings.bank_account_number ? `Account Number: ${userSettings.bank_account_number}<br/>` : ''}
        ${userSettings.bank_iban ? `IBAN: ${userSettings.bank_iban}<br/>` : ''}
        Reference: ${referenceNumber}
    </div>
    ` : ''}

    <div class="footer">
        <p>${businessName}</p>
        <p>${businessAddress}</p>
        <p>${contactEmail}</p>
        <p style="margin-top: 10px;">${invoiceFooter}</p>
        <p style="text-align: center; margin-top: 20px;">POWERED BY DENTIFIER</p>
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