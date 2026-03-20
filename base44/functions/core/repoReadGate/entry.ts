/**
 * REPO READ GATE — Bridges repoRead into the callable surface
 * Fronts repoRead.ts with route registration enforcement
 * 
 * Invocation: base44.functions.invoke('core/repoReadGate', { path, max_bytes })
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALLOWLIST = [
    "docs/",
    "functions/core/",
    "src/registry"
];

const DENYLIST_PATTERNS = [
    ".env",
    "app-params",
    "package-lock",
    "pnpm-lock",
    "yarn.lock",
    "node_modules/"
];

function isDenied(path) {
    const lowerPath = path.toLowerCase();
    return DENYLIST_PATTERNS.some(pattern => lowerPath.includes(pattern.toLowerCase()));
}

function isAllowlisted(path) {
    if (isDenied(path)) return false;
    return ALLOWLIST.some(prefix => path.startsWith(prefix));
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { path, max_bytes = 200000 } = body;

        const ts_iso = new Date().toISOString();
        const request_id = crypto.randomUUID();
        const correlation_id = crypto.randomUUID();

        if (!path) {
            return Response.json({ error: "MISSING_PATH" }, { status: 400 });
        }

        if (max_bytes > 200000) {
            return Response.json({ 
                error: "MAX_BYTES_EXCEEDED", 
                max_allowed: 200000 
            }, { status: 413 });
        }

        const allowed = isAllowlisted(path);
        const denied_reason = isDenied(path) ? "DENYLIST_MATCH" : "NOT_ALLOWLISTED";
        
        console.log('[REPO_READ_GATE]', { 
            request_id, 
            session_id: user.id,
            path, 
            allowed,
            denied_reason: allowed ? null : denied_reason,
            ts_iso 
        });

        if (!allowed) {
            return Response.json({
                request_id,
                correlation_id,
                tool_name: "repo.read",
                tool_version: "REPOREAD_GATE_v1_2026-03-08",
                ts_iso,
                source: "repo_fs_allowlist",
                error: denied_reason,
                path
            }, { status: 403 });
        }

        // Forward to actual repoRead
        const repoReadRes = await base44.functions.invoke('core/repoRead', { path, max_bytes });
        
        return Response.json(repoReadRes.data || repoReadRes);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});