/**
 * caosInvoke — CAOS Bridge Endpoint
 * Service-to-service gateway: CAOS runtime → Base44 repo tools.
 *
 * SECURITY:
 *   - X-CAOS-SERVICE-KEY header required (server secret)
 *   - CORS: blocks browser origins (server-to-server only)
 *   - Audit log: every call written to ErrorLog entity (reused as audit trail)
 *   - Whitelist: only repo read/list functions allowed
 *   - POST only
 *
 * Body: { "fn": "core/repoReadChunked", "payload": { ... } }
 * Response: { "ok": true, "fn": "...", "result": {...} }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_FNS = new Set([
    'core/repoList',
    'core/repoRead',
    'core/repoReadChunked',
]);

// Simple in-memory rate limiter: max 60 calls per minute per key
const rateLimiter = new Map(); // key -> { count, window_start }
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(key) {
    const now = Date.now();
    const entry = rateLimiter.get(key) || { count: 0, window_start: now };
    if (now - entry.window_start > RATE_WINDOW_MS) {
        entry.count = 0;
        entry.window_start = now;
    }
    entry.count++;
    rateLimiter.set(key, entry);
    return entry.count <= RATE_LIMIT;
}

async function auditLog(base44, { fn, status, error, origin, latency_ms }) {
    try {
        await base44.asServiceRole.entities.ErrorLog.create({
            user_email: 'caos-bridge@system',
            error_type: status === 200 ? 'unknown' : 'server_error',
            error_message: `caosInvoke: fn=${fn} status=${status}${error ? ' error=' + error : ''}`,
            stage: 'CAOS_INVOKE_BRIDGE',
            error_code: status === 200 ? 'BRIDGE_OK' : `BRIDGE_${status}`,
            latency_ms,
            resolved: status === 200,
            request_payload: { fn, origin }
        });
    } catch {
        // audit failure must never block the response
    }
}

Deno.serve(async (req) => {
    const start = Date.now();

    // POST only
    if (req.method !== 'POST') {
        return Response.json({ ok: false, error: 'Method not allowed' }, {
            status: 405,
            headers: { 'Allow': 'POST' }
        });
    }

    // CORS lockdown: reject browser origins
    const origin = req.headers.get('origin') || '';
    if (origin) {
        // Browser requests always have Origin header — block them
        return Response.json({ ok: false, error: 'Browser access not permitted' }, { status: 403 });
    }

    // Service key auth
    const incomingKey = req.headers.get('X-CAOS-SERVICE-KEY') || req.headers.get('x-caos-service-key');
    const expectedKey = Deno.env.get('CAOS_SERVICE_KEY');

    if (!incomingKey || !expectedKey || incomingKey !== expectedKey) {
        return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit
    if (!checkRateLimit(incomingKey.slice(-8))) {
        return Response.json({ ok: false, error: 'Rate limit exceeded (60/min)' }, { status: 429 });
    }

    // Parse body
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

    // Whitelist
    if (!ALLOWED_FNS.has(fn)) {
        return Response.json({
            ok: false,
            error: `fn '${fn}' not allowed. Allowed: ${[...ALLOWED_FNS].join(', ')}`
        }, { status: 403 });
    }

    // Dispatch
    const base44 = createClientFromRequest(req);
    try {
        const result = await base44.asServiceRole.functions.invoke(fn, payload);
        const latency_ms = Date.now() - start;

        auditLog(base44, { fn, status: 200, origin, latency_ms });

        return Response.json({
            ok: true,
            fn,
            result: result?.data ?? result
        });

    } catch (err) {
        const latency_ms = Date.now() - start;
        const errMsg = err.message;
        const details = err?.response?.data ?? null;

        auditLog(base44, { fn, status: 500, error: errMsg, origin, latency_ms });

        return Response.json({
            ok: false,
            fn,
            error: errMsg,
            details
        }, { status: 500 });
    }
});