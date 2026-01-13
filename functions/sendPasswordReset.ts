import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, isAdminReset = false } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const users = await base44.asServiceRole.entities.User.filter({ email });
    
    if (users.length === 0) {
      // Don't reveal if user exists or not for security
      return Response.json({ success: true, message: 'If an account exists with that email, you will receive a password reset link.' });
    }

    const user = users[0];

    // Generate reset token (random string)
    const resetToken = crypto.randomUUID() + '-' + Date.now();
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store token in user record
    await base44.asServiceRole.entities.User.update(user.id, {
      password_reset_token: resetToken,
      password_reset_expiry: resetTokenExpiry
    });

    // Create reset link
    const resetLink = `${req.headers.get('origin')}/ResetPassword?token=${resetToken}`;

    // Send email
    const emailBody = `Hi ${user.full_name},

${isAdminReset ? 'An administrator has' : 'You have'} requested a password reset for your Dentifier account.

Click the link below to reset your password:
${resetLink}

This link expires in 24 hours.

If you didn't request this, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The Dentifier Team`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Dentifier',
      to: email,
      subject: 'Reset Your Dentifier Password',
      body: emailBody
    });

    return Response.json({ 
      success: true, 
      message: isAdminReset 
        ? `Password reset email sent to ${email}` 
        : 'If an account exists with that email, you will receive a password reset link.'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return Response.json({ error: 'Failed to send password reset email' }, { status: 500 });
  }
});