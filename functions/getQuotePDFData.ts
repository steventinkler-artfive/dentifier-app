import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    console.log('getQuotePDFData called');
    
    try {
        const base44 = createClientFromRequest(req);
        const { assessment_id } = await req.json();
        
        console.log('Assessment ID:', assessment_id);

        if (!assessment_id) {
            return Response.json({ error: 'Assessment ID is required' }, { status: 400 });
        }

        // Fetch all assessments
        const allAssessments = await base44.asServiceRole.entities.Assessment.list();
        console.log('Found', allAssessments.length, 'assessments');
        console.log('Looking for ID:', assessment_id);
        console.log('First 3 IDs:', allAssessments.slice(0, 3).map(a => a.id));
        
        const assessment = allAssessments.find(a => a.id === assessment_id);
        console.log('Match found:', !!assessment);

        if (!assessment) {
            console.log('Assessment not found');
            return Response.json({ error: 'Assessment not found' }, { status: 404 });
        }

        console.log('Assessment found');

        // Fetch Customer
        let customerData = null;
        if (assessment.customer_id) {
            const allCustomers = await base44.asServiceRole.entities.Customer.list();
            const customer = allCustomers.find(c => c.id === assessment.customer_id);
            if (customer) {
                customerData = {
                    id: customer.id,
                    name: customer.name,
                    business_name: customer.business_name,
                    email: customer.email,
                    phone: customer.phone,
                };
            }
        }

        // Fetch Vehicle(s)
        let vehicleData = null;
        let vehiclesData = {};

        const allVehicles = await base44.asServiceRole.entities.Vehicle.list();

        if (assessment.is_multi_vehicle && assessment.vehicles) {
            for (const v of assessment.vehicles) {
                const vehicle = allVehicles.find(veh => veh.id === v.vehicle_id);
                if (vehicle) {
                    vehiclesData[vehicle.id] = {
                        id: vehicle.id,
                        make: vehicle.make,
                        model: vehicle.model,
                        year: vehicle.year,
                        color: vehicle.color,
                        license_plate: vehicle.license_plate,
                    };
                }
            }
        } else if (assessment.vehicle_id) {
            const vehicle = allVehicles.find(v => v.id === assessment.vehicle_id);
            if (vehicle) {
                vehicleData = {
                    id: vehicle.id,
                    make: vehicle.make,
                    model: vehicle.model,
                    year: vehicle.year,
                    color: vehicle.color,
                    license_plate: vehicle.license_plate,
                };
            }
        }

        // Fetch UserSettings
        let userSettingsData = null;
        if (assessment.created_by) {
            const userSettings = await base44.asServiceRole.entities.UserSetting.filter({ user_email: assessment.created_by });
            if (userSettings.length > 0) {
                const settings = userSettings[0];
                userSettingsData = {
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
                };
            }
        }

        // Return safe assessment fields
        const safeAssessment = {
            id: assessment.id,
            quote_number: assessment.quote_number,
            invoice_number: assessment.invoice_number,
            status: assessment.status,
            customer_id: assessment.customer_id,
            vehicle_id: assessment.vehicle_id,
            line_items: assessment.line_items,
            quote_amount: assessment.quote_amount,
            total_amount: assessment.total_amount,
            currency: assessment.currency,
            notes: assessment.include_notes_in_quote ? assessment.notes : undefined,
            include_notes_in_quote: assessment.include_notes_in_quote,
            estimated_time_hours: assessment.estimated_time_hours,
            payment_link_url: assessment.payment_link_url,
            is_multi_vehicle: assessment.is_multi_vehicle,
            assessment_name: assessment.assessment_name,
            discount_percentage: assessment.discount_percentage,
            created_date: assessment.created_date,
            vehicles: assessment.vehicles ? assessment.vehicles.map(v => ({
                vehicle_id: v.vehicle_id,
                line_items: v.line_items,
                quote_amount: v.quote_amount,
                estimated_time_hours: v.estimated_time_hours,
                notes: v.include_notes_in_quote ? v.notes : undefined,
                include_notes_in_quote: v.include_notes_in_quote,
            })) : undefined,
        };

        return Response.json({
            assessment: safeAssessment,
            customer: customerData,
            vehicle: vehicleData,
            vehicles: vehiclesData,
            userSettings: userSettingsData,
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});