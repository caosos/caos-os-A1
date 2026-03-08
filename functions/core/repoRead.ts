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

        const ts_iso = new Date().toISOString();
        const request_id = crypto.randomUUID();
        const correlation_id = crypto.randomUUID();

        if (!path || typeof path !== 'string') {
            return Response.json({ error: "MISSING_PATH" }, { status: 400 });
        }

        // Forward to repoReadGate for allowlist enforcement
        const gateResult = await base44.functions.invoke('core/repoReadGate', { 
            path, 
            max_bytes 
        });

        // Passthrough gateResult status + data (includes 403/413 errors)
        return Response.json({
            ok: gateResult.status === 200,
            ...gateResult.data
        }, { status: gateResult.status || 200 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});