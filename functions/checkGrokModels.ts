import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const GROK_API_KEY = Deno.env.get('XAI_API_KEY');

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!GROK_API_KEY) {
            return Response.json({ error: 'XAI_API_KEY not set' }, { status: 500 });
        }

        // Check available models
        const modelsResponse = await fetch('https://api.x.ai/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${GROK_API_KEY}`
            }
        });

        const responseText = await modelsResponse.text();
        
        return Response.json({
            status: modelsResponse.status,
            statusText: modelsResponse.statusText,
            body: responseText,
            parsed: JSON.parse(responseText)
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});