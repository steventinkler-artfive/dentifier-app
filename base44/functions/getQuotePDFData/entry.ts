import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { assessment_id } = await req.json();

        if (!assessment_id) {
            return Response.json({ error: 'Missing assessment_id' }, { status: 400 });
        }

        // Try getting the assessment directly first
        let assessment;
        try {
            assessment = await base44.asServiceRole.entities.Assessment.get(assessment_id);
        } catch (error) {
            return Response.json({ 
                error: 'Assessment not found',
                details: error.message 
            }, { status: 404 });
        }

        if (!assessment) {
            return Response.json({ error: 'Assessment not found' }, { status: 404 });
        }

        // Fetch related data
        let customer = null;
        let vehicle = null;
        let settings = null;
        const vehiclesData = {};

        if (assessment.customer_id) {
            try {
                customer = await base44.asServiceRole.entities.Customer.get(assessment.customer_id);
            } catch (e) {
                console.error('Customer fetch failed:', e);
            }
        }

        if (assessment.vehicle_id) {
            try {
                vehicle = await base44.asServiceRole.entities.Vehicle.get(assessment.vehicle_id);
            } catch (e) {
                console.error('Vehicle fetch failed:', e);
            }
        }

        if (assessment.is_multi_vehicle && assessment.vehicles) {
            for (const v of assessment.vehicles) {
                try {
                    const veh = await base44.asServiceRole.entities.Vehicle.get(v.vehicle_id);
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
                    console.error('Vehicle fetch failed:', e);
                }
            }
        }

        if (assessment.created_by) {
            try {
                const userSettingsList = await base44.asServiceRole.entities.UserSetting.filter({ 
                    user_email: assessment.created_by 
                });
                settings = userSettingsList[0];
            } catch (e) {
                console.error('Settings fetch failed:', e);
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
            } : null,
        });
    } catch (error) {
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});