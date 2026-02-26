import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      type,
      to,
      customer_name,
      business_name,
      reply_to_email,
      pdf_url,
      quote_number,
      invoice_number,
      payment_link_url
    } = await req.json();

    if (!type || !to || !pdf_url) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const refNumber = type === 'invoice' ? invoice_number : quote_number;
    const subject = type === 'invoice'
      ? `Invoice ${refNumber} from ${business_name}`
      : `Quote ${refNumber} from ${business_name}`;

    const docLabel = type === 'invoice' ? 'invoice' : 'quote';
    const docLabelCap = type === 'invoice' ? 'Invoice' : 'Quote';

    // Fetch the PDF from the URL to attach it
    const pdfResponse = await fetch(pdf_url);
    if (!pdfResponse.ok) {
      return Response.json({ error: 'Failed to fetch PDF for attachment' }, { status: 500 });
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    const filename = `${docLabelCap}-${refNumber}.pdf`;

    // Build email body
    let body = `Hi ${customer_name},\n\n`;

    if (type === 'invoice') {
      body += `Thank you for your business. Please find your invoice attached to this email.\n\n`;
      if (payment_link_url) {
        body += `You can pay online here: ${payment_link_url}\n\n`;
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

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const emailPayload = {
      from: 'quotes@dentifierpro.com',
      to: [to],
      reply_to: reply_to_email || undefined,
      subject,
      text: body,
      attachments: [
        {
          filename,
          content: pdfBase64
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