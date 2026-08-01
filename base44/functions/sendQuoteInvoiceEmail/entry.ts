import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      type,
      to,
      cc,
      subject: customSubject,
      body: customBody,
      customer_name,
      business_name,
      reply_to_email,
      pdf_base64,
      quote_number,
      invoice_number,
      payment_link_url,
      assessment_id,
      customer_id,
      assessment_ids
    } = await req.json();

    // Mandatory: PDF must be provided as base64 (no SSRF fetch path)
    if (!pdf_base64) {
      return Response.json({ error: 'Missing required parameter: pdf_base64' }, { status: 400 });
    }

    if (!type || !to) {
      return Response.json({ error: 'Missing required parameters (type, to)' }, { status: 400 });
    }

    let resolvedCustomer = null;

    // Ownership & recipient validation
    if (assessment_id) {
      // Single document (quote/invoice) flow
      const assessment = await base44.entities.Assessment.get(assessment_id);
      if (!assessment) {
        return Response.json({ error: 'Assessment not found' }, { status: 404 });
      }
      if (assessment.created_by !== user.email) {
        return Response.json({ error: 'Forbidden: you do not own this assessment' }, { status: 403 });
      }
      if (!assessment.customer_id) {
        return Response.json({ error: 'Cannot send email: this assessment is not linked to a customer' }, { status: 400 });
      }
      try {
        resolvedCustomer = await base44.entities.Customer.get(assessment.customer_id);
      } catch (_) { resolvedCustomer = null; }
    } else if (customer_id && Array.isArray(assessment_ids) && assessment_ids.length > 0) {
      // Statement flow: validate the customer and every assessment in the statement
      try {
        resolvedCustomer = await base44.entities.Customer.get(customer_id);
      } catch (_) {
        return Response.json({ error: 'Customer not found' }, { status: 404 });
      }
      if (!resolvedCustomer) {
        return Response.json({ error: 'Customer not found' }, { status: 404 });
      }
      if (resolvedCustomer.created_by !== user.email) {
        return Response.json({ error: 'Forbidden: you do not own this customer' }, { status: 403 });
      }
      // Verify every assessment in the statement belongs to the caller and the target customer
      for (const id of assessment_ids) {
        let a;
        try {
          a = await base44.entities.Assessment.get(id);
        } catch (_) {
          a = null;
        }
        if (!a) {
          return Response.json({ error: `Assessment ${id} not found` }, { status: 404 });
        }
        if (a.created_by !== user.email) {
          return Response.json({ error: `Forbidden: you do not own assessment ${id}` }, { status: 403 });
        }
        if (a.customer_id !== customer_id) {
          return Response.json({ error: `Assessment ${id} does not belong to this customer` }, { status: 400 });
        }
      }
    } else {
      return Response.json({ error: 'Missing ownership context: provide assessment_id (single) or customer_id + assessment_ids (statement)' }, { status: 400 });
    }

    // Enforce that the recipient matches the linked customer's email (single source of truth)
    if (resolvedCustomer && resolvedCustomer.email && to !== resolvedCustomer.email) {
      return Response.json({ error: 'Recipient (to) must match the email on file for this customer' }, { status: 403 });
    }

    const refNumber = type === 'invoice' ? invoice_number : quote_number;
    const subject = customSubject || (type === 'invoice'
      ? `Invoice ${refNumber} from ${business_name}`
      : `Quote ${refNumber} from ${business_name}`);

    const docLabelCap = type === 'invoice' ? 'Invoice' : 'Quote';
    const docNum = (refNumber || '').replace(/[^a-zA-Z0-9-]/g, '');
    const bizSlug = (business_name || '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toUpperCase()
      .substring(0, 20);
    const filename = `${docLabelCap}_${docNum}${bizSlug ? '_' + bizSlug : ''}.pdf`;

    // Use the custom body from the modal, or fall back to auto-generated
    let body = customBody;
    if (!body) {
      body = `Hi ${customer_name},\n\n`;
      if (type === 'invoice') {
        body += `Thank you for your business. Please find your invoice attached to this email.\n\n`;
        if (payment_link_url) {
          body += `You can pay online here: ${payment_link_url}\n\nIf the button in the attached PDF is not clickable, please copy and paste the link above into your browser.\n\n`;
        } else {
          body += `Payment details are included in the attached invoice.\n\n`;
        }
      } else {
        body += `Thank you for your enquiry. Please find your quote attached to this email.\n\n`;
        body += `If you have any questions or would like to proceed with the repair, please don't hesitate to get in touch.\n\n`;
      }
      body += `Best regards,\n${business_name}`;
      if (reply_to_email) {
        body += `\n${reply_to_email}`;
      }
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const emailPayload = {
      from: 'quotes@dentifierpro.com',
      to: [to],
      cc: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : undefined,
      bcc: reply_to_email ? [reply_to_email] : undefined,
      reply_to: reply_to_email || undefined,
      subject,
      text: body,
      attachments: [
        {
          filename,
          content: pdf_base64,
          content_type: 'application/pdf'
        }
      ]
    };

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend error:', resendResult);
      return Response.json({ error: resendResult.message || 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true, id: resendResult.id });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});