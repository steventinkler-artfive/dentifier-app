import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return Response.json({ 
        success: false, 
        error: 'Invalid request body' 
      }, { status: 400 });
    }
    
    const { assessment_id } = requestBody;
    
    if (!assessment_id) {
      return Response.json({ 
        success: false, 
        error: 'assessment_id is required' 
      }, { status: 400 });
    }

    // Get assessment with service role
    const assessment = await base44.asServiceRole.entities.Assessment.get(assessment_id);
    
    if (!assessment) {
      return Response.json({ 
        success: false, 
        error: 'Assessment not found' 
      }, { status: 404 });
    }

    if (!assessment.payment_link_url) {
      return Response.json({ 
        success: false, 
        error: 'No payment link found for this assessment' 
      }, { status: 400 });
    }

    // Get user settings to access payment provider credentials
    const userSettings = await base44.asServiceRole.entities.UserSetting.filter({ 
      user_email: user.email 
    });

    if (!userSettings || userSettings.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'User settings not found' 
      }, { status: 404 });
    }

    const settings = userSettings[0];
    const provider = settings.payment_provider;

    if (!provider || provider === 'None') {
      return Response.json({ 
        success: false, 
        error: 'No payment provider configured' 
      }, { status: 400 });
    }

    let paymentStatus = { paid: false };

    // Check payment status based on provider
    if (provider === 'Stripe') {
      if (!settings.stripe_secret_key) {
        return Response.json({ 
          success: false, 
          error: 'Stripe API key not configured' 
        }, { status: 400 });
      }

      // Check recent payment intents to match by amount and timestamp
      const assessmentAmount = Math.round((assessment.quote_amount || 0) * 100); // Convert to cents
      const assessmentDate = new Date(assessment.created_date).getTime() / 1000; // Convert to Unix timestamp

      const paymentIntentsResponse = await fetch(
        `https://api.stripe.com/v1/payment_intents?limit=20`, 
        {
          headers: {
            'Authorization': `Bearer ${settings.stripe_secret_key}`
          }
        }
      );

      if (!paymentIntentsResponse.ok) {
        const errorText = await paymentIntentsResponse.text();
        return Response.json({ 
          success: false, 
          error: `Stripe API error: ${errorText}` 
        }, { status: 500 });
      }

      const paymentIntents = await paymentIntentsResponse.json();
      
      // Look for a successful payment intent matching the assessment amount created after the assessment
      const matchingPayment = paymentIntents.data.find(intent => 
        intent.status === 'succeeded' && 
        intent.amount === assessmentAmount &&
        intent.created >= assessmentDate
      );

      if (matchingPayment) {
        paymentStatus = { 
          paid: true, 
          amount_paid: matchingPayment.amount / 100,
          payment_date: new Date(matchingPayment.created * 1000).toISOString()
        };
      }

    } else if (provider === 'Square') {
      return Response.json({ 
        success: false, 
        error: 'Square payment status check not yet implemented' 
      }, { status: 501 });

    } else if (provider === 'PayPal') {
      if (!settings.paypal_client_id || !settings.paypal_client_secret) {
        return Response.json({ 
          success: false, 
          error: 'PayPal credentials not configured' 
        }, { status: 400 });
      }

      // Get PayPal OAuth token
      const authResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${settings.paypal_client_id}:${settings.paypal_client_secret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!authResponse.ok) {
        return Response.json({ 
          success: false, 
          error: 'Failed to authenticate with PayPal' 
        }, { status: 500 });
      }

      const { access_token } = await authResponse.json();

      // Extract invoice ID from payment link
      const invoiceIdMatch = assessment.payment_link_url.match(/invoice\/([^\/]+)/);
      
      if (!invoiceIdMatch) {
        return Response.json({ 
          success: false, 
          error: 'Could not extract invoice ID from PayPal link' 
        }, { status: 400 });
      }

      const invoiceId = invoiceIdMatch[1];

      // Get invoice status
      const invoiceResponse = await fetch(`https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!invoiceResponse.ok) {
        return Response.json({ 
          success: false, 
          error: 'Failed to fetch invoice from PayPal' 
        }, { status: 500 });
      }

      const invoice = await invoiceResponse.json();
      
      if (invoice.status === 'PAID' || invoice.status === 'MARKED_AS_PAID') {
        paymentStatus = { 
          paid: true,
          amount_paid: parseFloat(invoice.amount?.value || assessment.quote_amount),
          payment_date: invoice.payments?.transactions?.[0]?.payment_date || new Date().toISOString()
        };
      }
    }

    // Update assessment if payment confirmed
    if (paymentStatus.paid && assessment.payment_status !== 'paid') {
      await base44.asServiceRole.entities.Assessment.update(assessment_id, {
        payment_status: 'paid'
      });
    }

    return Response.json({
      success: true,
      paid: paymentStatus.paid,
      amount_paid: paymentStatus.amount_paid,
      payment_date: paymentStatus.payment_date
    });

  } catch (error) {
    console.error('Error checking payment status:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});