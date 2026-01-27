import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      return new Response(JSON.stringify({ error: 'Webhook configuration error' }), { status: 400 });
    }

    // Get raw body for signature verification
    const body = await req.text();

    // Verify webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    console.log(`Received Stripe event: ${event.type}`);

    const base44 = createClientFromRequest(req);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);

        // Find user by email
        const customerEmail = session.customer_email || session.customer_details?.email;
        if (!customerEmail) {
          console.error('No customer email in checkout session');
          break;
        }

        const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
        if (users.length === 0) {
          console.error('User not found:', customerEmail);
          break;
        }

        const user = users[0];
        const subscription = await stripe.subscriptions.retrieve(session.subscription);

        // Calculate trial end date
        const trialEndDate = subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        // Update user with subscription info
        await base44.asServiceRole.entities.User.update(user.id, {
          stripe_customer_id: session.customer,
          subscription_status: subscription.status === 'trialing' ? 'trialing' : 'active',
          subscription_plan: session.metadata?.plan || 'starter',
          trial_end_date: trialEndDate,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString()
        });

        console.log(`User ${customerEmail} subscription activated: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.log('Subscription created:', subscription.id);

        // Find user by stripe customer ID
        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: subscription.customer 
        });
        
        if (users.length === 0) {
          console.error('User not found for customer:', subscription.customer);
          break;
        }

        const user = users[0];
        const trialEndDate = subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: subscription.status === 'trialing' ? 'trialing' : 'active',
          trial_end_date: trialEndDate,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString()
        });

        console.log(`User ${user.email} subscription status: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id, 'Status:', subscription.status);

        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: subscription.customer 
        });
        
        if (users.length === 0) {
          console.error('User not found for customer:', subscription.customer);
          break;
        }

        const user = users[0];
        const trialEndDate = subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;

        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: subscription.status,
          trial_end_date: trialEndDate,
          subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString()
        });

        console.log(`User ${user.email} subscription updated to: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);

        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: subscription.customer 
        });
        
        if (users.length === 0) {
          console.error('User not found for customer:', subscription.customer);
          break;
        }

        const user = users[0];

        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'canceled'
        });

        console.log(`User ${user.email} subscription canceled`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Payment failed for invoice:', invoice.id);

        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: invoice.customer 
        });
        
        if (users.length === 0) {
          console.error('User not found for customer:', invoice.customer);
          break;
        }

        const user = users[0];

        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'past_due'
        });

        console.log(`User ${user.email} payment failed - status: past_due`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Payment succeeded for invoice:', invoice.id);

        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: invoice.customer 
        });
        
        if (users.length === 0) {
          console.error('User not found for customer:', invoice.customer);
          break;
        }

        const user = users[0];

        // Only update to active if not already in a valid state
        if (user.subscription_status !== 'active' && user.subscription_status !== 'trialing') {
          await base44.asServiceRole.entities.User.update(user.id, {
            subscription_status: 'active'
          });
          console.log(`User ${user.email} payment succeeded - status: active`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});