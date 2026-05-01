import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        // Supports both direct call (with user_email, subscription_plan, subscription_status)
        // and entity automation payload (with event + data)
        let userEmail, subscriptionPlan, subscriptionStatus;

        if (body.event && body.data) {
            // Called from entity automation on User update
            userEmail = body.data.email;
            subscriptionPlan = body.data.subscription_plan || null;
            subscriptionStatus = body.data.subscription_status || null;
        } else {
            // Called directly
            userEmail = body.user_email;
            subscriptionPlan = body.subscription_plan || null;
            subscriptionStatus = body.subscription_status || null;
        }

        if (!userEmail) {
            return Response.json({ error: 'Missing user_email' }, { status: 400 });
        }

        // Find the UserSetting record for this user using service role to bypass RLS
        const settings = await base44.asServiceRole.entities.UserSetting.filter({ user_email: userEmail });

        if (!settings || settings.length === 0) {
            return Response.json({ 
                success: false, 
                message: `No UserSetting found for ${userEmail}` 
            });
        }

        const setting = settings[0];
        await base44.asServiceRole.entities.UserSetting.update(setting.id, {
            subscription_plan: subscriptionPlan,
            subscription_status: subscriptionStatus,
        });

        console.log(`Synced subscription for ${userEmail}: plan=${subscriptionPlan}, status=${subscriptionStatus}`);

        return Response.json({ 
            success: true, 
            user_email: userEmail,
            subscription_plan: subscriptionPlan,
            subscription_status: subscriptionStatus,
        });
    } catch (error) {
        console.error('syncUserSubscriptionToSettings error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});