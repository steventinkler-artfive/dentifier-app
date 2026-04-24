import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const adminUser = await base44.auth.me();

        if (!adminUser || adminUser.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { userEmail } = await req.json();

        if (!userEmail) {
            return Response.json({ error: 'userEmail is required' }, { status: 400 });
        }

        const allUsers = await base44.asServiceRole.entities.User.list();
        const targetUser = allUsers.find(u => u.email === userEmail);

        if (!targetUser) {
            return Response.json({ error: `User not found: ${userEmail}` }, { status: 404 });
        }

        await base44.asServiceRole.entities.User.update(targetUser.id, {
            is_beta_tester: true
        });

        return Response.json({ success: true, message: `is_beta_tester set to true for ${userEmail}` });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});