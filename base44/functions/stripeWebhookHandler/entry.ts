import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
});

Deno.serve(async (req) => {
  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    // Initialize Base44 client
    const base44 = createClientFromRequest(req);

    // Verify webhook signature using async version
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    console.log('Received Stripe webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(base44, event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(base44, event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(base44, event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(base44, event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleSubscriptionUpdate(base44, subscription) {
  const email = subscription.metadata?.email;
  
  if (!email) {
    console.error('No email found in subscription metadata');
    return;
  }

  // Determine subscription tier based on price ID
  const priceId = subscription.items.data[0]?.price.id;
  const starterPriceId = Deno.env.get('STRIPE_STARTER_PRICE_ID');
  const professionalPriceId = Deno.env.get('STRIPE_PROFESSIONAL_PRICE_ID');
  
  let subscriptionTier = 'starter';
  if (priceId === professionalPriceId) {
    subscriptionTier = 'professional';
  } else if (priceId === starterPriceId) {
    subscriptionTier = 'starter';
  }

  // Map Stripe status to our status
  let subscriptionStatus = subscription.status;
  if (subscription.status === 'canceled') {
    subscriptionStatus = 'cancelled';
  }

  const updateData = {
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    subscription_status: subscriptionStatus,
    subscription_tier: subscriptionTier,
    subscription_plan: subscriptionTier,
    subscription_end_date: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  };

  // Add trial end date if in trial
  if (subscription.status === 'trialing' && subscription.trial_end) {
    updateData.trial_end_date = new Date(subscription.trial_end * 1000).toISOString();
  }

  // On a genuine trial start, capture the card fingerprint, mark trial_used,
  // and flag for manual review if the same card was used on a different account.
  if (subscription.status === 'trialing') {
    let cardFingerprint = null;
    try {
      const pmId = typeof subscription.default_payment_method === 'string'
        ? subscription.default_payment_method
        : subscription.default_payment_method?.id;
      if (pmId) {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        cardFingerprint = pm?.card?.fingerprint || null;
      }
    } catch (e) {
      console.error('Failed to retrieve payment method fingerprint:', e.message);
    }

    if (cardFingerprint) {
      updateData.trial_used = true;
      updateData.trial_used_date = new Date().toISOString();
      updateData.trial_card_fingerprint = cardFingerprint;

      try {
        const matched = await base44.asServiceRole.entities.User.filter({
          trial_card_fingerprint: cardFingerprint
        });
        const otherMatch = matched.find(u => u.email !== email);
        if (otherMatch) {
          updateData.flagged_for_review = true;
          console.log(`Flagged ${email} for review: card fingerprint matches ${otherMatch.email}`);
        }
      } catch (e) {
        console.error('Fingerprint match check failed:', e.message);
      }
    } else {
      // Still mark trial_used even if fingerprint unavailable
      updateData.trial_used = true;
      updateData.trial_used_date = new Date().toISOString();
    }
  }

  // Find and update user
  const users = await base44.asServiceRole.entities.User.filter({ email: email });
  
  if (users.length > 0) {
    const userId = users[0].id;
    await base44.asServiceRole.entities.User.update(userId, updateData);
    console.log(`Updated user ${email} with subscription data`);
  } else {
    console.error(`User not found with email: ${email}`);
  }

  // Sync subscription_plan and subscription_status to UserSetting
  try {
    const userSettings = await base44.asServiceRole.entities.UserSetting.filter({ user_email: email });
    if (userSettings.length > 0) {
      await base44.asServiceRole.entities.UserSetting.update(userSettings[0].id, {
        subscription_plan: subscriptionTier,
        subscription_status: subscriptionStatus,
      });
      console.log(`Synced subscription to UserSetting for ${email}`);
    }
  } catch (e) {
    console.error(`Failed to sync UserSetting for ${email}:`, e.message);
  }
}

async function handleSubscriptionDeleted(base44, subscription) {
  const email = subscription.metadata?.email;
  
  if (!email) {
    console.error('No email found in subscription metadata');
    return;
  }

  const updateData = {
    subscription_status: 'cancelled',
    subscription_end_date: subscription.ended_at
      ? new Date(subscription.ended_at * 1000).toISOString()
      : null,
  };

  // Find and update user
  const users = await base44.asServiceRole.entities.User.filter({ email: email });
  
  if (users.length > 0) {
    const userId = users[0].id;
    await base44.asServiceRole.entities.User.update(userId, updateData);
    console.log(`Updated user ${email} - subscription cancelled`);
  } else {
    console.error(`User not found with email: ${email}`);
  }

  // Sync cancellation to UserSetting
  try {
    const userSettings = await base44.asServiceRole.entities.UserSetting.filter({ user_email: email });
    if (userSettings.length > 0) {
      await base44.asServiceRole.entities.UserSetting.update(userSettings[0].id, {
        subscription_status: 'cancelled',
      });
      console.log(`Synced cancellation to UserSetting for ${email}`);
    }
  } catch (e) {
    console.error(`Failed to sync UserSetting for ${email}:`, e.message);
  }
}

async function handlePaymentSucceeded(base44, invoice) {
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    console.log('No subscription ID in invoice');
    return;
  }

  // Update subscription status to active
  const users = await base44.asServiceRole.entities.User.filter({ 
    stripe_subscription_id: subscriptionId 
  });
  
  if (users.length > 0) {
    const userId = users[0].id;
    await base44.asServiceRole.entities.User.update(userId, {
      subscription_status: 'active',
    });
    console.log(`Payment succeeded for user ${users[0].email}`);
  }
}

async function handlePaymentFailed(base44, invoice) {
  const subscriptionId = invoice.subscription;
  
  if (!subscriptionId) {
    console.log('No subscription ID in invoice');
    return;
  }

  // Update subscription status to past_due
  const users = await base44.asServiceRole.entities.User.filter({ 
    stripe_subscription_id: subscriptionId 
  });
  
  if (users.length > 0) {
    const userId = users[0].id;
    await base44.asServiceRole.entities.User.update(userId, {
      subscription_status: 'past_due',
    });
    console.log(`Payment failed for user ${users[0].email}`);
  }
}