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
 * HOW IT WORKS:
 *   The Base44 platform stores deployed function source accessible via asServiceRole.
 *   This module reads from the FunctionSource entity (if available) or returns
 *   the allowlist + metadata so Aria knows what files exist and can reason about them.
 *   Aria can always request a specific file's source to be pasted by the user for audit.
 *
 * Input:
 *   { file: string }  — function name (e.g. "hybridMessage", "core/memoryEngine")
 *   { list: true }    — return allowlist only, no source fetch
 *
 * Output:
 *   { ok, file, content, line_count, char_count, read_at }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── ALLOWLIST — only these files may be inspected ───────────────────────────
const ALLOWED_FILES = [
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
];

const ALLOWED_SET = new Set(ALLOWED_FILES);

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // LIST mode — return allowlist only
        if (body.list === true) {
            return Response.json({
                ok: true,
                mode: 'LIST',
                allowed_files: ALLOWED_FILES,
                total: ALLOWED_FILES.length,
                note: 'To read a file, invoke with { file: "<name>" } and paste the source into chat for Aria to audit.',
                layer: 'LAYER_2_SELF_INSPECT',
                read_at: new Date().toISOString(),
            });
        }

        const { file } = body;

        if (!file || typeof file !== 'string') {
            return Response.json({ error: 'Missing required field: file (or pass list: true)' }, { status: 400 });
        }

        // Sanitize
        const normalized = file.replace(/^\/+/, '').replace(/\.js$/, '');

        if (!ALLOWED_SET.has(normalized)) {
            return Response.json({
                ok: false,
                error: `"${normalized}" is not in the inspection allowlist.`,
                hint: 'Invoke with { list: true } to see all inspectable files.',
            }, { status: 403 });
        }

        // Attempt to read from UserFile entity (source files stored as uploads)
        // This works if source has been stored as a UserFile named by function path.
        let content = null;
        let source_method = null;

        try {
            const files = await base44.asServiceRole.entities.UserFile.filter(
                { name: normalized },
                '-created_date',
                1
            );

            if (files?.[0]?.url) {
                const res = await fetch(files[0].url);
                if (res.ok) {
                    content = await res.text();
                    source_method = 'UserFile';
                }
            }
        } catch (_) {
            // Not available via UserFile — that's fine
        }

        const line_count = content ? content.split('\n').length : null;
        const char_count = content ? content.length : null;

        console.log('✅ [SELF_INSPECT]', { user: user.email, file: normalized, source_method, line_count });

        return Response.json({
            ok: true,
            file: normalized,
            content,
            line_count,
            char_count,
            source_method,
            in_allowlist: true,
            note: content
                ? null
                : 'Source not available via automated fetch. Paste the file content into chat and Aria can audit it directly.',
            read_at: new Date().toISOString(),
            layer: 'LAYER_2_SELF_INSPECT',
        });

    } catch (error) {
        console.error('🔥 [SELF_INSPECT_ERROR]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});