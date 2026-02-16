import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Call Base44-native CAOS backend
        const result = await base44.functions.invoke('caosMessage', {
            input: body.input,
            session_id: body.session_id || body.session,
            file_urls: body.file_urls,
            limit: body.limit || 20
        });

        return Response.json(result.data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});