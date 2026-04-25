import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request payload
    const { registrationNumber } = await req.json();

    if (!registrationNumber) {
      return Response.json({ error: 'Registration number is required' }, { status: 400 });
    }

    // Get the calling user's own UserSetting record
    const userSettings = await base44.asServiceRole.entities.UserSetting.filter({ user_email: user.email });
    
    let apiKey = null;

    if (userSettings.length > 0) {
      const s = userSettings[0];
      const useTest = s.dvla_use_test_environment ?? false;
      apiKey = useTest ? s.dvla_test_api_key : s.dvla_prod_api_key;
    }

    // If the user has no key, fall back to any admin-configured setting
    if (!apiKey) {
      const allSettings = await base44.asServiceRole.entities.UserSetting.list('-created_date', 50);
      for (const s of allSettings) {
        const useTest = s.dvla_use_test_environment ?? false;
        const key = useTest ? s.dvla_test_api_key : s.dvla_prod_api_key;
        if (key) {
          apiKey = key;
          break;
        }
      }
    }

    if (!apiKey) {
      return Response.json({ 
        error: 'DVLA API key not configured',
        message: 'Please contact your administrator to configure the DVLA API key'
      }, { status: 400 });
    }

    // Strip spaces and hyphens from registration number
    const cleanedReg = registrationNumber.replace(/[\s-]/g, '').toUpperCase();

    // Call DVLA API with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const dvlaResponse = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registrationNumber: cleanedReg
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await dvlaResponse.json();

      // Handle DVLA API errors
      if (!dvlaResponse.ok) {
        // Check for specific error codes
        if (responseData.errors && responseData.errors.length > 0) {
          const errorCode = responseData.errors[0].code;
          
          if (errorCode === 'ENQ_VRN_NOT_FOUND') {
            return Response.json({
              success: false,
              error: 'not_found',
              message: 'Registration not found. Please check and try again, or enter details manually.'
            }, { status: 404 });
          }
        }

        // Handle rate limiting
        if (dvlaResponse.status === 429) {
          return Response.json({
            success: false,
            error: 'rate_limit',
            message: 'Too many requests. Please try again shortly.'
          }, { status: 429 });
        }

        // Generic API error
        return Response.json({
          success: false,
          error: 'api_error',
          message: 'Lookup temporarily unavailable. Please enter details manually.'
        }, { status: dvlaResponse.status });
      }

      // Success - return vehicle data
      return Response.json({
        success: true,
        data: {
          registrationNumber: responseData.registrationNumber,
          make: responseData.make,
          model: responseData.model || null,
          yearOfManufacture: responseData.yearOfManufacture,
          colour: responseData.colour,
          fuelType: responseData.fuelType,
          motExpiryDate: responseData.motExpiryDate,
          fullResponse: responseData
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle timeout
      if (fetchError.name === 'AbortError') {
        return Response.json({
          success: false,
          error: 'timeout',
          message: 'Lookup timed out. Please try again.'
        }, { status: 408 });
      }

      // Network or other fetch errors
      throw fetchError;
    }

  } catch (error) {
    console.error('DVLA lookup error:', error);
    return Response.json({
      success: false,
      error: 'server_error',
      message: 'An error occurred during lookup. Please try again.'
    }, { status: 500 });
  }
});