import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

export default async function(req) {
    try {
        const base44 = createClientFromRequest(req);

        // Auth guard — QuotePDF page requires login, so a valid user must be present.
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { assessment_id } = await req.json();

        if (!assessment_id) {
            return Response.json({ error: 'Missing assessment_id' }, { status: 400 });
        }

        // Fetch via the authenticated (RLS-enforced) client.
        // Assessment RLS is created_by == user.email, so a non-owner gets no result.
        let assessment;
        try {
            const results = await base44.entities.Assessment.filter({ id: assessment_id });
            assessment = results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error('Assessment fetch error:', error.message);
            return Response.json({
                error: 'Assessment not found',
                details: error.message
            }, { status: 404 });
        }

        if (!assessment) {
            // Either doesn't exist or caller doesn't own it.
            return Response.json({ error: 'Assessment not found' }, { status: 404 });
        }

        // Ownership established via RLS fetch above — related data belongs to the same owner.
        let customer = null;
        let vehicle = null;
        let settings = null;
        const vehiclesData = {};

        if (assessment.customer_id) {
            try {
                const results = await base44.entities.Customer.filter({ id: assessment.customer_id });
                customer = results[0] || null;
            } catch (e) {
                console.error('Customer fetch failed:', e.message);
            }
        }

        if (assessment.vehicle_id) {
            try {
                const results = await base44.entities.Vehicle.filter({ id: assessment.vehicle_id });
                vehicle = results[0] || null;
            } catch (e) {
                console.error('Vehicle fetch failed:', e.message);
            }
        }

        if (assessment.is_multi_vehicle && assessment.vehicles) {
            for (const v of assessment.vehicles) {
                if (!v.vehicle_id) continue;
                try {
                    const results = await base44.asServiceRole.entities.Vehicle.filter({ id: v.vehicle_id });
                    const veh = results[0];
                    if (veh) {
                        vehiclesData[veh.id] = {
                            id: veh.id,
                            make: veh.make,
                            model: veh.model,
                            year: veh.year,
                            color: veh.color,
                            license_plate: veh.license_plate,
                            vin: veh.vin,
                        };
                    }
                } catch (e) {
                    console.error('Vehicle fetch failed:', e.message);
                }
            }
        }

        let creatorSubscriptionPlan = null;
        let creatorSubscriptionStatus = null;
        let creatorSubscriptionTier = null;

        if (assessment.created_by) {
            try {
                const allSettings = await base44.entities.UserSetting.filter({
                    user_email: assessment.created_by
                });
                settings = allSettings[0] || null;

                if (settings) {
                    creatorSubscriptionPlan = settings.subscription_plan || null;
                    creatorSubscriptionStatus = settings.subscription_status || null;
                }
            } catch (e) {
                console.error('Settings fetch failed:', e.message);
            }

            try {
                const creatorUsers = await base44.asServiceRole.entities.User.filter({ email: assessment.created_by });
                if (creatorUsers.length > 0) {
                    const creatorUser = creatorUsers[0];
                    creatorSubscriptionTier = creatorUser.data?.subscription_tier || creatorUser.subscription_tier || null;
                    if (!creatorSubscriptionPlan) creatorSubscriptionPlan = creatorUser.subscription_plan || null;
                    if (!creatorSubscriptionStatus) creatorSubscriptionStatus = creatorUser.subscription_status || null;
                }
            } catch (e) {
                console.error('User entity fetch for subscription_tier failed:', e.message);
            }
        }

        return Response.json({
            assessment: {
                id: assessment.id,
                quote_number: assessment.quote_number,
                invoice_number: assessment.invoice_number,
                status: assessment.status,
                customer_id: assessment.customer_id,
                vehicle_id: assessment.vehicle_id,
                line_items: assessment.line_items,
                quote_amount: assessment.quote_amount,
                currency: assessment.currency,
                notes: assessment.include_notes_in_quote ? assessment.notes : undefined,
                include_notes_in_quote: assessment.include_notes_in_quote,
                payment_link_url: assessment.payment_link_url,
                is_multi_vehicle: assessment.is_multi_vehicle,
                assessment_name: assessment.assessment_name,
                discount_percentage: assessment.discount_percentage,
                created_date: assessment.created_date,
                vehicles: assessment.vehicles || [],
            },
            customer: customer ? {
                id: customer.id,
                name: customer.name,
                business_name: customer.business_name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
            } : null,
            vehicle: vehicle ? {
                id: vehicle.id,
                make: vehicle.make,
                model: vehicle.model,
                year: vehicle.year,
                color: vehicle.color,
                license_plate: vehicle.license_plate,
                vin: vehicle.vin,
            } : null,
            vehicles: vehiclesData,
            creatorSubscriptionPlan,
            creatorSubscriptionStatus,
            creatorSubscriptionTier,
            userSettings: settings ? {
                business_name: settings.business_name,
                business_address: settings.business_address,
                contact_email: settings.contact_email,
                business_logo_url: settings.business_logo_url,
                invoice_footer: settings.invoice_footer,
                currency: settings.currency,
                payment_method_preference: settings.payment_method_preference,
                bank_account_name: settings.bank_account_name,
                bank_sort_code: settings.bank_sort_code,
                bank_account_number: settings.bank_account_number,
                bank_iban: settings.bank_iban,
                is_vat_registered: settings.is_vat_registered,
                tax_rate: settings.tax_rate,
            } : null,
        });
    } catch (error) {
        console.error('Outer error:', error.message);
        return Response.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}