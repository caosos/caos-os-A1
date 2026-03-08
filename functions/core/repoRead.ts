import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        // ADMIN-ONLY CHECK
        if (user.role !== 'admin') {
            return Response.json({
                error: 'ADMIN_ONLY_TOOL',
                details: 'Repository read access requires admin role'
            }, { status: 403 });
        }

        const body = await req.json();
        const { path, max_bytes = 200000 } = body;

        if (!path || typeof path !== 'string') {
            return Response.json({ error: "MISSING_PATH" }, { status: 400 });
        }

        // Forward to repoReadGate for allowlist enforcement + actual read
        try {
            const gateResult = await base44.functions.invoke('core/repoReadGate', { 
                path, 
                max_bytes 
            });
            
            return Response.json({
                ok: true,
                ...gateResult.data
            }, { status: 200 });
        } catch (gateError) {
            // repoReadGate rejected with 403/413 — passthrough error response
            const statusCode = gateError?.response?.status || 403;
            const errorData = gateError?.response?.data || { error: gateError.message };
            return Response.json(errorData, { status: statusCode });
        }

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});