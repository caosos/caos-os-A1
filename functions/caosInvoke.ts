/**
 * caosInvoke — CAOS Bridge Endpoint
 * Service-to-service gateway: CAOS runtime → Base44 repo tools.
 *
 * Auth: X-CAOS-SERVICE-KEY header validated against CAOS_SERVICE_KEY secret.
 * Whitelist: core/repoList, core/repoRead, core/repoReadChunked
 *
 * POST /
 * Body: { "fn": "core/repoReadChunked", "payload": { ... } }
 * Response: { "ok": true, "fn": "...", "result": { ... } }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_FNS = new Set([
    'core/repoList',
    'core/repoRead',
    'core/repoReadChunked',
]);

Deno.serve(async (req) => {
    // 1. Service key auth
    const incomingKey = req.headers.get('X-CAOS-SERVICE-KEY') || req.headers.get('x-caos-service-key');
    const expectedKey = Deno.env.get('CAOS_SERVICE_KEY');

    if (!incomingKey || !expectedKey || incomingKey !== expectedKey) {
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    let body;
    try {
        body = await req.json();
    } catch {
        return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { fn, payload = {} } = body;

    if (!fn) {
        return Response.json({ ok: false, error: 'fn is required' }, { status: 400 });
    }

    // 3. Whitelist check
    if (!ALLOWED_FNS.has(fn)) {
        return Response.json({
            ok: false,
            error: `fn '${fn}' is not allowed. Allowed: ${[...ALLOWED_FNS].join(', ')}`
        }, { status: 403 });
    }

    // 4. Dispatch to Base44 function using service role
    try {
        const base44 = createClientFromRequest(req);
        const result = await base44.asServiceRole.functions.invoke(fn, payload);

        return Response.json({
            ok: true,
            fn,
            result: result?.data ?? result
        });

    } catch (err) {
        return Response.json({
            ok: false,
            fn,
            error: err.message,
            details: err?.response?.data ?? null
        }, { status: 500 });
    }
});