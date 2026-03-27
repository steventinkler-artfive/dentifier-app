import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get all users and find the one with matching email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userToDelete = allUsers.find(u => u.email === email);

    if (!userToDelete) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the user
    await base44.asServiceRole.entities.User.delete(userToDelete.id);

    return Response.json({ success: true, message: `User ${email} deleted` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});