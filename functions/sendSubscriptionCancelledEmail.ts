import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email, fullName } = await req.json();

        const logoUrl = "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";
        const settingsUrl = "https://dentifier.app/settings"; // Update with your actual domain
        const supportEmail = "hello@dentifierpro.com";
        const companyWebsite = "dentifierpro.com";

        const emailBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #020617 0%, #1e293b 100%);">
                        <img src="${logoUrl}" alt="Dentifier Logo" style="max-width: 200px; height: auto;">
                    </div>
                    
                    <div style="padding: 40px 30px;">
                        <h1 style="color: #333; font-size: 26px; margin: 0 0 20px 0;">Your Dentifier Subscription</h1>
                        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${fullName || 'there'},</p>
                        <p style="font-size: 16px; margin-bottom: 30px;">Your Dentifier subscription has been cancelled.</p>
                        
                        <h2 style="color: #333; font-size: 20px; margin: 30px 0 15px 0;">What happens now:</h2>
                        <ul style="font-size: 15px; line-height: 1.8; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">✓ Your account remains accessible</li>
                            <li style="margin-bottom: 8px;">✓ All your quotes and customer data are preserved</li>
                            <li style="margin-bottom: 8px;">✓ You can view past quotes (read-only)</li>
                            <li style="margin-bottom: 8px;">✓ You can reactivate anytime</li>
                        </ul>
                        
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${settingsUrl}" style="display: inline-block; background-color: #E31C5F; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reactivate Subscription</a>
                        </div>
                        
                        <p style="font-size: 16px; margin-top: 40px;">We'd love to have you back whenever you're ready.</p>
                        <p style="font-size: 16px; color: #666;">The Dentifier Team</p>
                        
                        <p style="font-size: 14px; color: #999; margin-top: 30px;">
                            Questions? Email us at <a href="mailto:${supportEmail}" style="color: #E31C5F; text-decoration: none;">${supportEmail}</a>
                        </p>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="font-size: 13px; color: #6c757d; margin: 5px 0;">
                            <strong>Dentifier</strong> - Professional PDR Quoting
                        </p>
                        <p style="font-size: 13px; color: #6c757d; margin: 5px 0;">
                            <a href="https://${companyWebsite}" style="color: #6c757d; text-decoration: none;">${companyWebsite}</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await base44.integrations.Core.SendEmail({
            to: email,
            from_name: "Dentifier",
            subject: "Your Dentifier Subscription",
            body: emailBody,
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});