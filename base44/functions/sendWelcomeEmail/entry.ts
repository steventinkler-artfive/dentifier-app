import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();

        // Support both direct call (email, fullName) and entity automation payload (event, data)
        let email, fullName;
        if (body.event && body.data) {
            // Triggered from UserSetting create automation — user_email is the identifier
            email = body.data.user_email;
            fullName = null; // full_name not available on UserSetting
        } else {
            email = body.email;
            fullName = body.fullName;
        }

        if (!email) {
            return Response.json({ error: 'Missing email' }, { status: 400 });
        }

        const logoUrl = "https://art-five-cdn.b-cdn.net/dentifier-full-colour-straphi-res.png";
        const dashboardUrl = "https://app.dentifierpro.com/dashboard";
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
                        <h1 style="color: #E31C5F; font-size: 28px; margin: 0 0 20px 0; text-align: center;">Welcome to Dentifier! 🚀</h1>
                        <p style="font-size: 16px; margin-bottom: 20px;">Hi ${fullName || 'there'},</p>
                        <p style="font-size: 16px; margin-bottom: 30px;">We're excited to help you streamline your PDR quoting process and grow your business.</p>
                        
                        <h2 style="color: #333; font-size: 20px; margin: 30px 0 15px 0;">Quick Start Guide:</h2>
                        <ul style="font-size: 15px; line-height: 1.8; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">✓ Complete your business profile in Settings</li>
                            <li style="margin-bottom: 8px;">✓ Set up your pricing matrix</li>
                            <li style="margin-bottom: 8px;">✓ Upload your logo (Professional tier)</li>
                            <li style="margin-bottom: 8px;">✓ Create your first quote</li>
                        </ul>
                        
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${dashboardUrl}" style="display: inline-block; background-color: #E31C5F; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Get Started Now!</a>
                        </div>
                        
                        <p style="font-size: 15px;">📧 Questions? Email us: <a href="mailto:${supportEmail}" style="color: #E31C5F; text-decoration: none;">${supportEmail}</a></p>
                        
                        <p style="font-size: 16px; margin-top: 40px;">Thanks for choosing Dentifier!</p>
                        <p style="font-size: 16px; color: #666;">The Dentifier Team</p>
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
            subject: "Welcome to Dentifier - Let's Get Started! 🚀",
            body: emailBody,
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});