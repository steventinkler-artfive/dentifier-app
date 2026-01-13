import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const currentUser = await base44.auth.me();
    if (currentUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId } = await req.json();
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 });
    }

    // Get the user with service role to check auth metadata
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    
    // If auth_provider is already set, return it
    if (user.auth_provider) {
      return Response.json({ 
        userId: user.id,
        email: user.email,
        auth_provider: user.auth_provider,
        message: 'Auth provider already set'
      });
    }

    // Try to detect based on available information
    // OAuth users typically don't have a password field or it's null/empty
    // Note: This is a heuristic and may need adjustment based on actual Base44 implementation
    let detectedProvider = 'email'; // default
    
    // If user has no password or password-like fields, likely OAuth
    // This is a simplified detection - you may need to adjust based on actual data structure
    if (!user.password || user.password === '') {
      detectedProvider = 'google';
    }

    // Update the user with the detected provider
    await base44.asServiceRole.entities.User.update(userId, {
      auth_provider: detectedProvider
    });

    return Response.json({ 
      userId: user.id,
      email: user.email,
      auth_provider: detectedProvider,
      message: `Auth provider detected and set to: ${detectedProvider}`
    });

  } catch (error) {
    console.error('Detect auth provider error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});