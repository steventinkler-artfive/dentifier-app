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
    const { assessment_id } = await req.json();
    
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

      // Extract payment intent ID from payment link URL
      const paymentIntentMatch = assessment.payment_link_url.match(/payment_link\/([^\/]+)/);
      
      if (!paymentIntentMatch) {
        return Response.json({ 
          success: false, 
          error: 'Could not extract payment ID from link' 
        }, { status: 400 });
      }

      const paymentLinkId = paymentIntentMatch[1];

      // Get payment link from Stripe
      const stripeResponse = await fetch(`https://api.stripe.com/v1/payment_links/${paymentLinkId}`, {
        headers: {
          'Authorization': `Bearer ${settings.stripe_secret_key}`
        }
      });

      if (!stripeResponse.ok) {
        return Response.json({ 
          success: false, 
          error: 'Failed to fetch payment status from Stripe' 
        }, { status: 500 });
      }

      const paymentLink = await stripeResponse.json();
      
      // For Stripe payment links, we need to check for recent successful charges
      // This is a simplified check - in production you might want to store the payment intent ID
      const chargesResponse = await fetch(
        `https://api.stripe.com/v1/charges?limit=10`, 
        {
          headers: {
            'Authorization': `Bearer ${settings.stripe_secret_key}`
          }
        }
      );

      if (chargesResponse.ok) {
        const charges = await chargesResponse.json();
        const assessmentAmount = Math.round((assessment.quote_amount || 0) * 100); // Convert to cents
        
        // Look for a successful charge matching the assessment amount
        const matchingCharge = charges.data.find(charge => 
          charge.status === 'succeeded' && 
          charge.amount === assessmentAmount &&
          new Date(charge.created * 1000) > new Date(assessment.updated_date)
        );

        if (matchingCharge) {
          paymentStatus = { 
            paid: true, 
            amount_paid: matchingCharge.amount / 100,
            payment_date: new Date(matchingCharge.created * 1000).toISOString()
          };
        }
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