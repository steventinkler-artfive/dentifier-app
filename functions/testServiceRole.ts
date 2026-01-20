import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        console.log('Testing service role access...');
        
        const assessments = await base44.asServiceRole.entities.Assessment.list();
        
        console.log('Total assessments:', assessments.length);
        console.log('First assessment ID:', assessments[0]?.id);
        
        return Response.json({ 
            count: assessments.length,
            ids: assessments.map(a => a.id).slice(0, 5),
            success: true
        });
    } catch (error) {
        console.error('Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});