import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Expecting assessment_id in the request payload
        const { assessment_id } = await req.json();

        if (!assessment_id) {
            return Response.json({ error: 'Assessment ID is required' }, { status: 400 });
        }

        console.log('Fetching assessment with ID:', assessment_id);

        // Fetch Assessment using filter with service-role to bypass RLS
        const assessments = await base44.asServiceRole.entities.Assessment.filter({ id: assessment_id });
        
        if (!assessments || assessments.length === 0) {
            console.error('Assessment not found with ID:', assessment_id);
            return Response.json({ error: 'Assessment not found' }, { status: 404 });
        }

        const assessment = assessments[0];
        console.log('Assessment fetched successfully');

        // Fetch Customer
        let customerData = null;
        if (assessment.customer_id) {
            const customer = await base44.asServiceRole.entities.Customer.get(assessment.customer_id);
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

        if (assessment.is_multi_vehicle && assessment.vehicles) {
            // For multi-vehicle assessments, fetch each vehicle referenced
            for (const v of assessment.vehicles) {
                const vehicle = await base44.asServiceRole.entities.Vehicle.get(v.vehicle_id);
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
            // For single-vehicle assessments
            const vehicle = await base44.asServiceRole.entities.Vehicle.get(assessment.vehicle_id);
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

        // Fetch UserSettings (technician's settings)
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
                };
            }
        }

        // Filter and return only safe assessment fields
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
        console.error('Error in getQuotePDFData function:', error);
        console.error('Error stack:', error.stack);
        return Response.json({ 
            error: error.message,
            details: error.toString(),
            stack: error.stack 
        }, { status: 500 });
    }
});