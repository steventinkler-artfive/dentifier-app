import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { assessment_id } = await req.json();

        if (!assessment_id) {
            return Response.json({ error: 'Missing assessment_id' }, { status: 400 });
        }

        // Use asServiceRole to bypass RLS and fetch any assessment by created_by
        // We need to know who created it — try fetching with service role
        let assessment;
        try {
            // Try to get the current user to use their context
            let createdBy = null;
            try {
                const user = await base44.auth.me();
                createdBy = user?.email;
            } catch (e) {
                // public/unauthenticated access
            }

            // Fetch assessment using authenticated user's token (respects RLS created_by rule)
            const results = await base44.entities.Assessment.filter({ id: assessment_id });
            assessment = results.length > 0 ? results[0] : null;
            console.log('Assessment lookup result:', !!assessment);
        } catch (error) {
            console.error('Assessment fetch error:', error.message);
            return Response.json({ 
                error: 'Assessment not found',
                details: error.message 
            }, { status: 404 });
        }

        if (!assessment) {
            return Response.json({ error: 'Assessment not found' }, { status: 404 });
        }

        // Fetch related data using asServiceRole
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
        let creatorIsBetaTester = false;

        if (assessment.created_by) {
            try {
                const allSettings = await base44.entities.UserSetting.filter({ 
                    user_email: assessment.created_by 
                });
                settings = allSettings[0] || null;

                // Read subscription info directly from UserSetting (synced from User entity)
                if (settings) {
                    creatorSubscriptionPlan = settings.subscription_plan || null;
                    creatorSubscriptionStatus = settings.subscription_status || null;
                }
            } catch (e) {
                console.error('Settings fetch failed:', e.message);
            }

            // Check is_beta_tester from User record via service role
            try {
                const users = await base44.asServiceRole.entities.User.filter({ email: assessment.created_by });
                if (users.length > 0) {
                    creatorIsBetaTester = users[0].is_beta_tester === true;
                }
            } catch (e) {
                console.error('User beta tester check failed:', e.message);
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
            creatorIsBetaTester,
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
});