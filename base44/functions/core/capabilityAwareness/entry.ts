/**
 * LAYER 1 — Capability Awareness Module
 * CAOS Environment Awareness Layer v1
 *
 * PURPOSE: Reflect what is ACTUALLY enabled in this session.
 * CONTRACT: READ-ONLY. Executes nothing. Infers nothing. No side effects.
 * LOCK: Do not add execution logic. Do not modify tool paths. Reflect only.
 *
 * Output schema:
 *   { web_enabled, file_read_enabled, image_parse_enabled,
 *     pdf_generation_enabled, tts_enabled, email_enabled,
 *     calendar_enabled, sensor_registry_available,
 *     model_name, token_limit }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── KNOWN MODEL CONTEXT WINDOWS ─────────────────────────────────────────────
const MODEL_TOKEN_LIMITS = {
    'gpt-4o':       128000,
    'gpt-4o-mini':  128000,
    'gpt-4-turbo':  128000,
    'gpt-4':        8192,
    'gpt-3.5-turbo': 16385,
    'gpt-5':        200000,
    'gpt-5.2':      200000,
};

// ─── ACTIVE SYSTEM CONFIG (mirrors hybridMessage constants — read only) ───────
const ACTIVE_MODEL = 'gpt-5.2';

// ─── CAPABILITY RESOLVER ──────────────────────────────────────────────────────
function resolveCapabilities(user) {
    // Each capability is derived from known system state.
    // Nothing is assumed. Nothing is executed. This is a mirror of truth.

    const model_name = ACTIVE_MODEL;
    const token_limit = MODEL_TOKEN_LIMITS[model_name] ?? 128000;
    const is_admin = user?.role === 'admin';

    return {
        // Web search: enabled — needs-based automatic via webSearch executor
        web_enabled: true,

        // File read: UserFile entity exists and is readable — capability is present
        file_read_enabled: true,

        // Image parse: file_urls + OpenAI vision both active in hybridMessage pipeline
        image_parse_enabled: true,

        // PDF generation: jsPDF available as npm package but no active function wired
        pdf_generation_enabled: false,

        // TTS: textToSpeech function is active and locked (tts-1-hd)
        tts_enabled: true,

        // Email: SendEmail integration available via base44 Core integrations
        email_enabled: true,

        // Calendar: no Google Calendar connector authorized
        calendar_enabled: false,

        // Sensor registry: no sensor layer exists in this deployment
        sensor_registry_available: false,

        // REPO_READ: admin-only autonomous file read via core/repoReadGate
        repo_read_enabled: is_admin,

        // REPO_LIST: admin-only path discovery via core/repoList
        repo_list_enabled: is_admin,

        // Model
        model_name,
        token_limit,
    };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const capabilities = resolveCapabilities(user);

        console.log('✅ [CAPABILITY_AWARENESS]', {
            user: user.email,
            role: user.role,
            model: capabilities.model_name,
            token_limit: capabilities.token_limit,
            tts: capabilities.tts_enabled,
            email: capabilities.email_enabled,
            repo_read_enabled: capabilities.repo_read_enabled,
            repo_list_enabled: capabilities.repo_list_enabled,
        });

        return Response.json({
            ok: true,
            capabilities,
            resolved_at: new Date().toISOString(),
            layer: 'LAYER_1_CAPABILITY_AWARENESS',
        });

    } catch (error) {
        console.error('🔥 [CAPABILITY_AWARENESS_ERROR]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});