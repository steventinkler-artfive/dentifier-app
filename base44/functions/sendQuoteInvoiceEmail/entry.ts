import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

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
      cc,
      subject: customSubject,
      body: customBody,
      customer_name,
      business_name,
      reply_to_email,
      pdf_url,
      pdf_base64,
      quote_number,
      invoice_number,
      payment_link_url
    } = await req.json();

    if (!type || !to || (!pdf_url && !pdf_base64)) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
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

    let pdfBase64Final;
    if (pdf_base64) {
      // Use the base64 content provided directly from the frontend
      pdfBase64Final = pdf_base64;
    } else {
      // Fallback: fetch from URL and convert
      const pdfResponse = await fetch(pdf_url);
      if (!pdfResponse.ok) {
        return Response.json({ error: 'Failed to fetch PDF for attachment' }, { status: 500 });
      }
      const pdfBuffer = await pdfResponse.arrayBuffer();
      pdfBase64Final = arrayBufferToBase64(pdfBuffer);
    }

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
      reply_to: reply_to_email || undefined,
      subject,
      text: body,
      attachments: [
        {
          filename,
          content: pdfBase64Final,
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