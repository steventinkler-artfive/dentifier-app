import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request payload
    const { assessment_id } = await req.json();
    
    if (!assessment_id) {
      return Response.json({ error: 'Assessment ID is required' }, { status: 400 });
    }

    // Fetch assessment details
    const assessment = await base44.entities.Assessment.get(assessment_id);
    if (!assessment) {
      return Response.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Fetch user settings
    const userSettings = await base44.entities.UserSetting.filter({ user_email: user.email });
    if (!userSettings || userSettings.length === 0) {
      return Response.json({ error: 'User settings not found' }, { status: 404 });
    }

    const settings = userSettings[0];
    const provider = settings.payment_provider;
    const currency = (assessment.currency || 'GBP').toLowerCase();

    // Calculate the correct final amount (mirrors app-wide display logic)
    const subtotal = assessment.total_amount || 0;
    const discountPct = assessment.discount_percentage || 0;
    const discountAmt = subtotal * discountPct / 100;
    const net = subtotal - discountAmt;
    const vatAmt = settings.is_vat_registered ? net * ((settings.tax_rate || 0) / 100) : 0;
    const amount = net + vatAmt;

    // Get customer details for payment description
    let customerName = 'Customer';
    if (assessment.customer_id) {
      const customer = await base44.entities.Customer.get(assessment.customer_id);
      if (customer) {
        customerName = customer.business_name || customer.name || 'Customer';
      }
    }

    const description = `Invoice ${assessment.invoice_number || assessment.quote_number || assessment.id.slice(-6)} - ${customerName}`;

    // Generate payment link based on provider
    let result;
    if (provider === 'Stripe' && settings.stripe_secret_key) {
      result = await generateStripePaymentLink(settings.stripe_secret_key, amount, currency, description);
    } else if (provider === 'Square' && settings.square_access_token) {
      result = await generateSquarePaymentLink(settings.square_access_token, amount, currency, description);
    } else if (provider === 'PayPal' && settings.paypal_client_id && settings.paypal_client_secret) {
      result = await generatePayPalPaymentLink(settings.paypal_client_id, settings.paypal_client_secret, amount, currency, description);
    } else {
      return Response.json({ 
        error: 'Payment provider not configured or API keys missing' 
      }, { status: 400 });
    }

    const resultData = await result.json();
    return Response.json(resultData);

  } catch (error) {
    console.error('Error generating payment link:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate payment link' 
    }, { status: 500 });
  }
});

async function generateStripePaymentLink(secretKey, amount, currency, description) {
  try {
    // Convert amount to smallest currency unit (cents/pence)
    const amountInCents = Math.round(amount * 100);

    // Create a Stripe Payment Link using the API
    const response = await fetch('https://api.stripe.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'line_items[0][price_data][currency]': currency,
        'line_items[0][price_data][product_data][name]': description,
        'line_items[0][price_data][unit_amount]': amountInCents.toString(),
        'line_items[0][quantity]': '1',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Stripe API error');
    }

    const data = await response.json();
    
    return Response.json({
      success: true,
      payment_link: data.url,
      provider: 'Stripe'
    });

  } catch (error) {
    console.error('Stripe error:', error);
    throw new Error(`Stripe: ${error.message}`);
  }
}

async function generateSquarePaymentLink(accessToken, amount, currency, description) {
  try {
    // Convert currency to uppercase for Square
    const currencyUpper = currency.toUpperCase();
    
    // Determine if sandbox or production
    const baseUrl = accessToken.startsWith('EAAAl') 
      ? 'https://connect.squareupsandbox.com' 
      : 'https://connect.squareup.com';

    // Create a Square payment link (using Checkout API)
    const response = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-12-13',
      },
      body: JSON.stringify({
        order: {
          line_items: [
            {
              name: description,
              quantity: '1',
              base_price_money: {
                amount: Math.round(amount * 100), // Convert to cents
                currency: currencyUpper,
              },
            },
          ],
        },
        checkout_options: {
          ask_for_shipping_address: false,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.errors?.[0]?.detail || 'Square API error');
    }

    const data = await response.json();
    
    return Response.json({
      success: true,
      payment_link: data.payment_link.url,
      provider: 'Square'
    });

  } catch (error) {
    console.error('Square error:', error);
    throw new Error(`Square: ${error.message}`);
  }
}

async function generatePayPalPaymentLink(clientId, clientSecret, amount, currency, description) {
  try {
    // Get PayPal OAuth token
    const authResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      throw new Error('PayPal authentication failed');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Create PayPal invoice
    const invoiceResponse = await fetch('https://api-m.paypal.com/v2/invoicing/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        detail: {
          currency_code: currency.toUpperCase(),
        },
        items: [
          {
            name: description,
            quantity: '1',
            unit_amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2),
            },
          },
        ],
      }),
    });

    if (!invoiceResponse.ok) {
      const errorData = await invoiceResponse.json();
      throw new Error(errorData.message || 'PayPal invoice creation failed');
    }

    const invoiceData = await invoiceResponse.json();
    const invoiceId = invoiceData.id;

    // Send the invoice to generate a payment link
    const sendResponse = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        send_to_invoicer: true,
      }),
    });

    if (!sendResponse.ok) {
      throw new Error('Failed to send PayPal invoice');
    }

    // Get the invoice details to retrieve the link
    const detailsResponse = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const detailsData = await detailsResponse.json();
    const paymentLink = detailsData.href || `https://www.paypal.com/invoice/p/#${invoiceId}`;

    return Response.json({
      success: true,
      payment_link: paymentLink,
      provider: 'PayPal',
      invoice_id: invoiceId,
    });

  } catch (error) {
    console.error('PayPal error:', error);
    throw new Error(`PayPal: ${error.message}`);
  }
}