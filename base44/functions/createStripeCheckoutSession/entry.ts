import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

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

        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

        // Trial eligibility check: admins always get a trial; otherwise check whether
        // this account has already used a trial. Lookup is case-insensitive + trimmed.
        let grantTrial = true;
        if (user.role !== 'admin') {
            const normalizedEmail = (user.email || '').toLowerCase().trim();
            try {
                const existing = await base44.asServiceRole.entities.User.filter({ email: normalizedEmail });
                if (existing.length > 0 && existing[0].trial_used === true) {
                    grantTrial = false;
                    console.log(`Trial denied for ${normalizedEmail}: trial_used is true`);
                }
            } catch (e) {
                console.error('Trial eligibility lookup failed (defaulting to trial):', e.message);
            }
        }

        const params = new URLSearchParams();
        params.append('mode', 'subscription');
        params.append('line_items[0][price]', priceId);
        params.append('line_items[0][quantity]', '1');
        params.append('success_url', 'https://app.dentifierpro.com/SubscriptionSuccess?session_id={CHECKOUT_SESSION_ID}');
        params.append('cancel_url', 'https://app.dentifierpro.com/Subscription');
        params.append('customer_email', user.email);
        if (grantTrial) {
            params.append('subscription_data[trial_period_days]', '60');
        }
        params.append('subscription_data[metadata][email]', user.email);

        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const session = await response.json();

        if (!response.ok) {
            console.error('Stripe API error:', session.error);
            return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 500 });
        }

        return Response.json({ checkout_url: session.url });
    } catch (error) {
        console.error('Error creating Stripe Checkout session:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});