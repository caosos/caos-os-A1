/**
 * core/runtimeRegistry
 * Convention-based governance registry for Base44 runtime function deployments.
 *
 * IMPORTANT: This is NOT platform-native runtime enumeration.
 * It records writes explicitly made by agents/operators going forward.
 * Entries prior to this system have BACKFILLED_UNKNOWN_DATE notes.
 *
 * Admin-only. Actions:
 *   record  — write a new manifest entry
 *   list    — list entries, optional prefix filter
 *   get     — get entry by path
 *
 * Output always includes source:"RUNTIME_MANIFEST"
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function sha256hex(text) {
    const buf = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) return Response.json({ ok: false, source: 'RUNTIME_MANIFEST', error_code: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
        if (user.role !== 'admin') return Response.json({ ok: false, source: 'RUNTIME_MANIFEST', error_code: 'FORBIDDEN', message: 'Admin only' }, { status: 403 });

        const body = await req.json();
        const { action } = body;

        // ── RECORD ────────────────────────────────────────────────────────────
        if (action === 'record') {
            const { path, content, size_bytes, notes } = body;
            // actor is ALWAYS derived from auth context — caller-provided actor is ignored.
            const actor = user.email;

            if (!path) return Response.json({ ok: false, source: 'RUNTIME_MANIFEST', error_code: 'MISSING_PATH', message: 'path is required' }, { status: 400 });

            // Enforce: content (hash+size computed server-side) OR artifact_hash+size_bytes (both required)
            const hasContent = typeof content === 'string' && content.length > 0;
            const hasPrecomputed = typeof body.artifact_hash === 'string' && typeof size_bytes === 'number';
            if (!hasContent && !hasPrecomputed) {
                return Response.json({ ok: false, source: 'RUNTIME_MANIFEST', error_code: 'MISSING_CONTENT',
                    message: 'Provide content (string) for server-side hashing, OR both artifact_hash+size_bytes for precomputed.' }, { status: 400 });
            }

            const artifact_hash = body.artifact_hash
                ? (body.artifact_hash.startsWith('sha256:') ? body.artifact_hash : `sha256:${body.artifact_hash}`)
                : `sha256:${await sha256hex(content)}`;

            const deployment_id = crypto.randomUUID();
            const deployed_at = new Date().toISOString();
            const resolved_size = hasContent ? new TextEncoder().encode(content).length : size_bytes;

            // Upsert: update existing entry if path already exists
            const existing = await base44.asServiceRole.entities.FunctionManifest.filter({ path });
            if (existing.length > 0) {
                await base44.asServiceRole.entities.FunctionManifest.update(existing[0].id, {
                    artifact_hash, deployment_id, deployed_at,
                    actor: resolved_actor, size_bytes: resolved_size,
                    notes: notes || null
                });
            } else {
                await base44.asServiceRole.entities.FunctionManifest.create({
                    path, artifact_hash, deployment_id, deployed_at,
                    actor: resolved_actor, size_bytes: resolved_size,
                    notes: notes || null
                });
            }

            return Response.json({ ok: true, source: 'RUNTIME_MANIFEST', deployment_id, artifact_hash, path, deployed_at, actor: resolved_actor });
        }

        // ── LIST ──────────────────────────────────────────────────────────────
        if (action === 'list') {
            const { prefix } = body;
            const all = await base44.asServiceRole.entities.FunctionManifest.list('-deployed_at', 200);
            const items = prefix ? all.filter(e => e.path?.startsWith(prefix)) : all;
            return Response.json({
                ok: true, source: 'RUNTIME_MANIFEST',
                count: items.length,
                functions: items.map(e => ({
                    path: e.path, artifact_hash: e.artifact_hash,
                    deployment_id: e.deployment_id, deployed_at: e.deployed_at,
                    actor: e.actor, size_bytes: e.size_bytes, notes: e.notes || null
                }))
            });
        }

        // ── GET ───────────────────────────────────────────────────────────────
        if (action === 'get') {
            const { path } = body;
            if (!path) return Response.json({ ok: false, source: 'RUNTIME_MANIFEST', error_code: 'MISSING_PATH', message: 'path is required' }, { status: 400 });
            const results = await base44.asServiceRole.entities.FunctionManifest.filter({ path });
            if (!results.length) return Response.json({ ok: false, source: 'RUNTIME_MANIFEST', error_code: 'NOT_FOUND', message: `No manifest entry for: ${path}` }, { status: 404 });
            const e = results[0];
            return Response.json({ ok: true, source: 'RUNTIME_MANIFEST', path: e.path, artifact_hash: e.artifact_hash, deployment_id: e.deployment_id, deployed_at: e.deployed_at, actor: e.actor, size_bytes: e.size_bytes, notes: e.notes || null });
        }

        return Response.json({ ok: false, source: 'RUNTIME_MANIFEST', error_code: 'INVALID_ACTION', message: 'action must be record|list|get' }, { status: 400 });

    } catch (err) {
        console.error('[runtimeRegistry error]', err.message);
        return Response.json({ ok: false, source: 'RUNTIME_MANIFEST', error_code: 'INTERNAL_ERROR', message: err.message }, { status: 500 });
    }
});