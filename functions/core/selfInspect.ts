/**
 * LAYER 2 — Self-Inspection Module
 * CAOS Environment Awareness Layer v2
 *
 * PURPOSE: Allow Aria to read its own source files for audit and suggestion.
 * CONTRACT: READ-ONLY. No writes. No execution. No side effects.
 *           Pull-only — only invoked on explicit request.
 *
 * API Minimization Rule compliance:
 *   - No DB writes
 *   - No ErrorLog entries
 *   - No Message entities touched
 *   - No ambient injection
 *   - No background calls
 *
 * Input:
 *   { file: string }  — the function name to inspect (e.g. "hybridMessage", "core/memoryEngine")
 *
 * Output:
 *   { ok, file, content, line_count, char_count, read_at }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── ALLOWLIST — only these files may be read ─────────────────────────────────
// Explicit whitelist. No glob. No dynamic path traversal.
const ALLOWED_FILES = new Set([
    'hybridMessage',
    'core/memoryEngine',
    'core/heuristicsEngine',
    'core/receiptWriter',
    'core/errorEnvelopeWriter',
    'core/capabilityAwareness',
    'core/selfInspect',
    'core/environmentLoader',
    'core/contextBuilder',
    'core/contextLoader',
    'core/continuousLearning',
    'core/memoryUpdate',
    'core/toolExecutor',
    'core/laneIsolation',
    'core/indexedSearch',
    'core/tieredRecall',
    'core/selectorEngine',
    'core/wcwBudget',
    'core/wcwSelfRegulation',
    'core/sanitizer',
    'core/normalize',
    'core/tokenizer',
    'core/routeRegistry',
    'core/receiptLogger',
    'core/latencyTracking',
    'core/diagnosticMode',
    'core/errorRecovery',
    'core/executorContract',
    'core/deterministicExecutor',
    'core/globalBinGovernance',
    'core/indexPersistence',
    'core/persistentSearch',
    'core/memoryAnchors',
    'core/presentationSilence',
    'core/unifiedGovernanceGate',
    'core/capabilityAwareness',
    'textToSpeech',
    'transcribeAudio',
    'generateThreadSummary',
    'systemHealth',
    'diagnosticSnapshot',
    'diagnosticRecall',
    'inspectPipeline',
    'inspectRouting',
    'quickInspect',
    'postPatchAudit',
    'pinMemory',
    'extractUserPreference',
    'generateSystemsReport',
    'grokProvider',
    'checkGrokModels',
    'testAnchors',
    'runHybridPipeline',
]);

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { file } = body;

        if (!file || typeof file !== 'string') {
            return Response.json({ error: 'Missing required field: file' }, { status: 400 });
        }

        // Sanitize: strip leading slashes, normalize
        const normalized = file.replace(/^\/+/, '').replace(/\.js$/, '');

        if (!ALLOWED_FILES.has(normalized)) {
            return Response.json({
                error: `File "${normalized}" is not in the inspection allowlist.`,
                allowed_files: [...ALLOWED_FILES].sort(),
            }, { status: 403 });
        }

        // Fetch the raw source via the Base44 functions API
        // Each function is accessible as a named endpoint — we read its deployed source
        // by fetching the raw file content from the platform's function registry.
        const functionUrl = `https://api.base44.com/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/${normalized}`;

        const response = await fetch(functionUrl, {
            headers: {
                'Authorization': `Bearer ${Deno.env.get('BASE44_API_KEY') || ''}`,
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            // Fallback: return metadata only — source fetch not available in this environment
            console.warn('⚠️ [SELF_INSPECT_SOURCE_UNAVAILABLE]', { file: normalized, status: response.status });
            return Response.json({
                ok: true,
                file: normalized,
                content: null,
                note: 'Source fetch not available via this path. File is in allowlist. Use dashboard Code view for full source.',
                read_at: new Date().toISOString(),
                layer: 'LAYER_2_SELF_INSPECT',
            });
        }

        const data = await response.json();
        const content = data?.code || data?.content || data?.source || null;

        if (!content) {
            return Response.json({
                ok: true,
                file: normalized,
                content: null,
                note: 'Source returned empty from registry.',
                read_at: new Date().toISOString(),
                layer: 'LAYER_2_SELF_INSPECT',
            });
        }

        const line_count = content.split('\n').length;
        const char_count = content.length;

        console.log('✅ [SELF_INSPECT]', { user: user.email, file: normalized, line_count, char_count });

        return Response.json({
            ok: true,
            file: normalized,
            content,
            line_count,
            char_count,
            read_at: new Date().toISOString(),
            layer: 'LAYER_2_SELF_INSPECT',
        });

    } catch (error) {
        console.error('🔥 [SELF_INSPECT_ERROR]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});