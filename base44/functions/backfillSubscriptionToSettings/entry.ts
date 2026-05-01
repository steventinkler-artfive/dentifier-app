import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// One-time admin backfill: reads all users via asServiceRole (same approach as getAllUsers)
// and writes subscription_plan + subscription_status into each matching UserSetting record.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch all users - this works in this context (same as getAllUsers function)
        const allUsers = await base44.asServiceRole.entities.User.list();
        console.log(`Found ${allUsers.length} users`);

        let updated = 0;
        let skipped = 0;
        let notFound = 0;
        const results = [];

        for (const u of allUsers) {
            const email = u.email;
            if (!email) continue;

            const subscriptionPlan = u.subscription_plan || null;
            const subscriptionStatus = u.subscription_status || null;

            // Skip users with no subscription data
            if (!subscriptionPlan && !subscriptionStatus) {
                skipped++;
                continue;
            }

            try {
                const userSettings = await base44.asServiceRole.entities.UserSetting.filter({ user_email: email });
                if (userSettings.length > 0) {
                    await base44.asServiceRole.entities.UserSetting.update(userSettings[0].id, {
                        subscription_plan: subscriptionPlan,
                        subscription_status: subscriptionStatus,
                    });
                    console.log(`Updated ${email}: plan=${subscriptionPlan}, status=${subscriptionStatus}`);
                    updated++;
                    results.push({ email, subscription_plan: subscriptionPlan, subscription_status: subscriptionStatus, result: 'updated' });
                } else {
                    notFound++;
                    results.push({ email, result: 'no_user_setting' });
                }
            } catch (e) {
                console.error(`Failed for ${email}:`, e.message);
                results.push({ email, error: e.message });
            }
        }

        return Response.json({
            success: true,
            total_users: allUsers.length,
            updated,
            skipped_no_subscription: skipped,
            not_found: notFound,
            results,
        });
    } catch (error) {
        console.error('Backfill error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});