import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { assessment_id, include_notes } = await req.json();

        if (!assessment_id) {
            return Response.json({ error: 'Missing assessment_id' }, { status: 400 });
        }

        // Fetch assessment data (unauthenticated access now allowed temporarily)
        const assessment = await base44.entities.Assessment.get(assessment_id);
        
        if (!assessment) {
            return Response.json({ error: 'Assessment not found' }, { status: 404 });
        }

        // Fetch related data
        let customer = null;
        let vehicle = null;
        let settings = null;
        const vehiclesData = {};

        if (assessment.customer_id) {
            try {
                customer = await base44.entities.Customer.get(assessment.customer_id);
            } catch (e) {
                console.error('Customer fetch failed:', e);
            }
        }

        if (assessment.vehicle_id) {
            try {
                vehicle = await base44.entities.Vehicle.get(assessment.vehicle_id);
            } catch (e) {
                console.error('Vehicle fetch failed:', e);
            }
        }

        if (assessment.is_multi_vehicle && assessment.vehicles) {
            for (const v of assessment.vehicles) {
                try {
                    const veh = await base44.entities.Vehicle.get(v.vehicle_id);
                    if (veh) vehiclesData[veh.id] = veh;
                } catch (e) {
                    console.error('Vehicle fetch failed:', e);
                }
            }
        }

        if (assessment.created_by) {
            try {
                const userSettingsList = await base44.entities.UserSetting.filter({ 
                    user_email: assessment.created_by 
                });
                settings = userSettingsList[0];
            } catch (e) {
                console.error('Settings fetch failed:', e);
            }
        }

        // Helper functions
        const getCurrencySymbol = (currency) => {
            const symbols = { 'GBP': '£', 'USD': '$', 'EUR': '€', 'CAD': 'C$', 'AUD': 'A$' };
            return symbols[currency] || '£';
        };

        const currencySymbol = getCurrencySymbol(assessment.currency || 'GBP');
        const isCompleted = assessment.status === 'completed';
        const isMultiVehicle = assessment.is_multi_vehicle && assessment.vehicles && assessment.vehicles.length > 0;

        const businessName = settings?.business_name || "Dentifier PDR";
        const businessAddress = settings?.business_address || "PDR Assessment & Quoting";
        const contactEmail = settings?.contact_email || "contact@dentifier.com";
        
        // Use custom logo if available (Professional tier), otherwise use Dentifier logo (Starter tier)
        const hasCustomLogo = settings?.business_logo_url && settings.business_logo_url.trim() !== '';
        const businessLogo = hasCustomLogo ? settings.business_logo_url : "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";

        const referenceNumber = isCompleted ?
            (assessment.invoice_number || `INV-${assessment.id.slice(-6)}`) :
            (assessment.quote_number || `Q-${assessment.id.slice(-6)}`);

        const invoiceFooter = isCompleted && settings?.invoice_footer ?
            settings.invoice_footer :
            (isCompleted ? "Thank you for your business! Payment is due within 7 days." :
                "This quote is valid for 30 days. Thank you for your business!");

        const notesForCustomer = include_notes ? (assessment.notes || '') : '';

        let subtotal = 0;
        let lineItemsHTML = '';

        if (isMultiVehicle) {
            assessment.vehicles.forEach(vData => {
                const vehDetails = vehiclesData[vData.vehicle_id];
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

        // Generate HTML for PDF
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
            ${!hasCustomLogo ? `<h2>${businessName}</h2>` : ''}
            ${businessAddress ? `<p style="font-size: 12px; color: #666; margin-top: 5px;">${businessAddress.replace(/\n/g, '<br/>')}</p>` : ''}
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

    ${isCompleted && assessment.payment_link_url && settings?.payment_method_preference && 
      (settings.payment_method_preference === 'Payment Links Only' || settings.payment_method_preference === 'Both') ? `
    <div style="background: #e6f7ff; padding: 15px; margin: 20px 0; border: 2px solid #1890ff;">
        <strong>Pay Online:</strong><br/>
        <a href="${assessment.payment_link_url}" style="color: #1890ff;">${assessment.payment_link_url}</a>
    </div>
    ` : ''}

    ${isCompleted && settings?.payment_method_preference && 
      (settings.payment_method_preference === 'Bank Transfer Only' || settings.payment_method_preference === 'Both') &&
      (settings.bank_account_name || settings.bank_account_number) ? `
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
        <strong>Bank Transfer Details:</strong><br/>
        ${settings.bank_account_name ? `Account Name: ${settings.bank_account_name}<br/>` : ''}
        ${settings.bank_sort_code ? `Sort Code: ${settings.bank_sort_code}<br/>` : ''}
        ${settings.bank_account_number ? `Account Number: ${settings.bank_account_number}<br/>` : ''}
        ${settings.bank_iban ? `IBAN: ${settings.bank_iban}<br/>` : ''}
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

        // Generate PDF using jsPDF
        const doc = new jsPDF();
        
        // Add HTML content to PDF (simplified text-based approach)
        doc.setFontSize(20);
        doc.text(isCompleted ? 'INVOICE' : 'QUOTE', 20, 20);
        doc.setFontSize(12);
        doc.text(`#${referenceNumber}`, 20, 30);
        doc.text(`Date: ${new Date(assessment.created_date).toLocaleDateString()}`, 20, 40);
        
        let yPos = 60;
        doc.setFontSize(14);
        doc.text('BILLED TO', 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        if (customer) {
            doc.text(customer.name, 20, yPos);
            yPos += 7;
            if (customer.email) {
                doc.text(customer.email, 20, yPos);
                yPos += 7;
            }
        }
        
        yPos += 10;
        doc.setFontSize(14);
        doc.text(isCompleted ? 'INVOICE DETAILS' : 'QUOTE DETAILS', 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        
        // Add line items
        const items = isMultiVehicle 
            ? assessment.vehicles.flatMap(v => v.line_items || [{ description: 'PDR Service', total_price: v.quote_amount }])
            : assessment.line_items || [{ description: 'PDR Service', total_price: assessment.quote_amount }];
        
        items.forEach(item => {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(`${item.description}: ${currencySymbol}${item.total_price?.toFixed(2) || '0.00'}`, 20, yPos);
            yPos += 7;
        });
        
        yPos += 10;
        doc.text(`Total: ${currencySymbol}${grandTotal.toFixed(2)}`, 20, yPos);

        // Get PDF as Uint8Array
        const pdfBytes = doc.output('arraybuffer');
        
        // Create File object for upload
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const filename = `${isCompleted ? 'invoice' : 'quote'}_${referenceNumber}_${include_notes ? 'with_notes' : 'no_notes'}.pdf`;
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

        // Upload to file storage
        const uploadResult = await base44.integrations.Core.UploadFile({ file: pdfFile });
        const fileUrl = uploadResult.file_url;

        // Update Assessment entity with the URL
        const updateData = include_notes 
            ? { quote_pdf_with_notes_url: fileUrl }
            : { quote_pdf_url: fileUrl };
        
        await base44.entities.Assessment.update(assessment_id, updateData);

        return Response.json({
            success: true,
            file_url: fileUrl,
            include_notes: include_notes
        });

    } catch (error) {
        console.error('PDF generation error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});