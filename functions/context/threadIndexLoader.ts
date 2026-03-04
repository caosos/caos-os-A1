/**
 * MODULE: context/threadIndexLoader
 * CTC Phase 1 — 2026-03-04
 * PATCH: CTC-TIME-001, CTC-TIME-002
 *
 * RESPONSIBILITIES:
 *   - Load ThreadIndex records for a user (metadata only — NO thread content)
 *   - Calculate temperature on every access (HOT/WARM/COLD/VANISH)
 *   - Return sorted index for use by crossThreadIntent and arcAssembler
 *
 * INPUT CONTRACT:
 *   POST body: { user_email?: string }  — defaults to authenticated user
 *
 * OUTPUT CONTRACT:
 *   { threads: ThreadIndex[], loaded_at: ISO string, count: number }
 *
 * TEMPERATURE RULES (recalculated on every access):
 *   HOT    — last_active_at <= 24 hours
 *   WARM   — last_active_at <= 30 days
 *   COLD   — last_active_at <= 90 days
 *   VANISH — last_active_at >  90 days (still retrievable, excluded from active routing)
 *
 * INVARIANTS:
 *   - This module NEVER loads thread message content
 *   - Index visibility ≠ content hydration (CTC Design Rule §9)
 *   - Temperature is always recalculated — never trusted from stored value
 *   - ErrorLog written on any failure before returning
 *
 * LOCKED: No — Phase 1, pre-production
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const NOW = () => Date.now();

// ─── TEMPERATURE CALCULATION ────────────────────────────────────────────────
// RULE: recalculated on every access, never trusted from stored value
function calculateTemperature(last_active_at) {
    if (!last_active_at) return 'COLD';
    const ageMs = NOW() - new Date(last_active_at).getTime();
    const hours = ageMs / (1000 * 60 * 60);
    if (hours <= 24)         return 'HOT';
    if (hours <= 24 * 30)    return 'WARM';
    if (hours <= 24 * 90)    return 'COLD';
    return 'VANISH';
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const target_email = body.user_email || user.email;

        const loaded_at = new Date().toISOString();

        // Load index — metadata only, no content
        const rawIndex = await base44.entities.ThreadIndex.filter(
            { user_email: target_email },
            '-last_active_at',
            200
        );

        // Recalculate temperature on every access (CTC-TIME-002)
        const threads = rawIndex.map(t => ({
            ...t,
            temperature: calculateTemperature(t.last_active_at)
        }));

        console.log('📋 [THREAD_INDEX_LOADED]', {
            user: target_email,
            count: threads.length,
            hot: threads.filter(t => t.temperature === 'HOT').length,
            warm: threads.filter(t => t.temperature === 'WARM').length,
            cold: threads.filter(t => t.temperature === 'COLD').length,
            vanish: threads.filter(t => t.temperature === 'VANISH').length,
            loaded_at
        });

        return Response.json({
            threads,
            loaded_at,
            count: threads.length
        });

    } catch (err) {
        console.error('🔥 [THREAD_INDEX_LOAD_FAILED]', err.message);

        // Write ErrorLog — traceable, non-blocking to caller
        try {
            const user = await base44.auth.me().catch(() => null);
            await base44.asServiceRole.entities.ErrorLog.create({
                user_email: user?.email || 'unknown',
                error_type: 'server_error',
                error_message: `THREAD_INDEX_LOAD_FAILED: ${err.message}`,
                error_code: 'CTC_INDEX_LOAD_FAILURE',
                stage: 'THREAD_INDEX_LOAD',
                system_version: 'CTC_PHASE1_v1'
            });
        } catch (_) { /* ignore secondary */ }

        return Response.json({ error: err.message }, { status: 500 });
    }
});