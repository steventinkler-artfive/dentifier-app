import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return Response.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find user with this token
    const users = await base44.asServiceRole.entities.User.filter({ password_reset_token: token });
    
    if (users.length === 0) {
      return Response.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const user = users[0];

    // Check if token is expired
    const expiryDate = new Date(user.password_reset_expiry);
    if (expiryDate < new Date()) {
      return Response.json({ error: 'Reset token has expired. Please request a new one.' }, { status: 400 });
    }

    // Update password and clear reset token
    await base44.asServiceRole.entities.User.update(user.id, {
      password: newPassword,
      password_reset_token: null,
      password_reset_expiry: null
    });

    return Response.json({ 
      success: true, 
      message: 'Password reset successfully. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return Response.json({ error: 'Failed to reset password' }, { status: 500 });
  }
});