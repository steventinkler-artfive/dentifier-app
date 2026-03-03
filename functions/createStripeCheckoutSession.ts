import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
        const body = await req.json();
        const { tier } = body;

        let priceId;
        if (tier === 'starter') {
            priceId = Deno.env.get("STRIPE_STARTER_PRICE_ID");
        } else if (tier === 'professional') {
            priceId = Deno.env.get("STRIPE_PROFESSIONAL_PRICE_ID");
        } else {
            return Response.json({ error: 'Invalid subscription tier provided' }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            success_url: 'https://app.dentifierpro.com/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://app.dentifierpro.com/Subscription',
            customer_email: user.email,
            subscription_data: {
                metadata: {
                    email: user.email,
                },
                trial_period_days: 14,
            },
        });

        return Response.json({ checkout_url: session.url });
    } catch (error) {
        console.error('Error creating Stripe Checkout session:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});