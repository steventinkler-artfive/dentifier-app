import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { subscription_plan } = await req.json();

    if (!subscription_plan || !['starter', 'professional'].includes(subscription_plan)) {
      return new Response(JSON.stringify({ error: 'Invalid subscription plan' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the appropriate price ID from environment
    const priceId = subscription_plan === 'starter' 
      ? Deno.env.get('STRIPE_STARTER_PRICE_ID')
      : Deno.env.get('STRIPE_PROFESSIONAL_PRICE_ID');

    if (!priceId) {
      console.error(`Missing price ID for plan: ${subscription_plan}`);
      return new Response(JSON.stringify({ error: 'Price configuration missing' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the app URL for redirect
    const appUrl = new URL(req.url).origin;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          plan: subscription_plan,
          user_id: user.id,
          user_email: user.email
        }
      },
      metadata: {
        plan: subscription_plan,
        user_id: user.id,
        user_email: user.email
      },
      success_url: `${appUrl}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscription`,
      allow_promotion_codes: true
    });

    console.log(`Created checkout session for ${user.email}: ${session.id}`);

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});