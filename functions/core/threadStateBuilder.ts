// MODULE: core/threadStateBuilder
// PURPOSE: Build + cache compressed thread state for token reduction (Phase 3 — Pattern 1 async)
// PATTERN: fetch_only=true → cache read only, no model call (used on hybridMessage critical path)
//          fetch_only=false → build via gpt-4o-mini + write to ThreadSnapshot (fire-and-forget)
// INVARIANTS: Never blocks hybridMessage. Always returns typed envelope. Errors are logged, never thrown.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILDER_TIMEOUT_MS = 5000;
const MAX_MESSAGES_FOR_BUILD = 30;

const STATE_PROMPT = `You are a session context compressor. Given the conversation history, output ONLY this block (no preamble, no extra text):

focus: [current main topic in 1 sentence]
decisions: [key decisions made, comma-separated, max 3]
constraints: [active rules/locks, comma-separated, max 3]
open: [unresolved questions, comma-separated, max 2]
last_action: [most recent completed step in 1 sentence]

Be extremely concise. Total output must be under 200 tokens.`;

Deno.serve(async (req) => {
    const request_id = crypto.randomUUID();
    const t0 = Date.now();

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ ok: false, error_code: 'UNAUTHORIZED', stage: 'AUTH', request_id }, { status: 401 });

        const body = await req.json();
        const { session_id, messages = [], fetch_only = false } = body;

        if (!session_id) {
            return Response.json({ ok: false, error_code: 'MISSING_SESSION_ID', stage: 'VALIDATION', request_id });
        }

        // ── FETCH-ONLY PATH: cache read, no model call ────────────────────────
        // Used by hybridMessage on the critical path — must return fast.
        if (fetch_only) {
            const snapshots = await base44.asServiceRole.entities.ThreadSnapshot.filter(
                { session_id }, '-created_date', 1
            ).catch(() => []);

            const snap = snapshots?.[0];
            if (snap?.compressed_seed) {
                console.log('✅ [TSB_CACHE_HIT]', { session_id: session_id.substring(0, 8), latency_ms: Date.now() - t0 });
                return Response.json({
                    ok: true,
                    block: snap.compressed_seed,
                    cached: true,
                    last_seq: snap.token_count_at_snapshot || 0,
                    request_id,
                    latency_ms: Date.now() - t0
                });
            }
            return Response.json({ ok: false, error_code: 'CACHE_MISS', cached: false, request_id, latency_ms: Date.now() - t0 });
        }

        // ── BUILD PATH: generate state via gpt-4o-mini ────────────────────────
        // Called fire-and-forget from hybridMessage after MESSAGE_SAVE.
        if (!messages || messages.length < 4) {
            return Response.json({ ok: false, error_code: 'INSUFFICIENT_HISTORY', request_id, latency_ms: Date.now() - t0 });
        }

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiKey) return Response.json({ ok: false, error_code: 'NO_API_KEY', stage: 'CONFIG', request_id });

        const historySlice = messages.slice(-MAX_MESSAGES_FOR_BUILD);
        const historyText = historySlice
            .map(m => `${m.role.toUpperCase()}: ${(m.content || '').substring(0, 500)}`)
            .join('\n');

        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), BUILDER_TIMEOUT_MS);

        let block = null;
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: STATE_PROMPT },
                        { role: 'user', content: `CONVERSATION HISTORY (last ${historySlice.length} messages):\n\n${historyText}` }
                    ],
                    max_completion_tokens: 250,
                    temperature: 0.2
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutHandle);
            if (res.ok) {
                const data = await res.json();
                block = data.choices?.[0]?.message?.content?.trim() || null;
            }
        } catch (e) {
            clearTimeout(timeoutHandle);
            const isTimeout = e?.name === 'AbortError';
            console.warn('⚠️ [TSB_BUILD_FAILED]', { reason: isTimeout ? 'timeout' : e.message });
            return Response.json({
                ok: false, error_code: isTimeout ? 'BUILD_TIMEOUT' : 'BUILD_FAILED',
                message: e.message, retryable: !isTimeout, stage: 'OPENAI_CALL', request_id, latency_ms: Date.now() - t0
            });
        }

        if (!block) {
            return Response.json({ ok: false, error_code: 'EMPTY_BLOCK', stage: 'OPENAI_CALL', request_id, latency_ms: Date.now() - t0 });
        }

        // ── CACHE WRITE: upsert ThreadSnapshot ───────────────────────────────
        const existing = await base44.asServiceRole.entities.ThreadSnapshot.filter(
            { session_id }, '-created_date', 1
        ).catch(() => []);

        if (existing?.[0]?.id) {
            await base44.asServiceRole.entities.ThreadSnapshot.delete(existing[0].id).catch(() => {});
        }

        const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(block));
        const integrity_hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

        await base44.asServiceRole.entities.ThreadSnapshot.create({
            snapshot_id: crypto.randomUUID(),
            session_id,
            snapshot_ts: Date.now(),
            compressed_seed: block,
            integrity_hash,
            token_count_at_snapshot: messages.length,
            rotation_reason: 'manual'
        });

        console.log('✅ [TSB_BUILT]', { session_id: session_id.substring(0, 8), messages: messages.length, chars: block.length, latency_ms: Date.now() - t0 });

        return Response.json({ ok: true, block, cached: false, request_id, latency_ms: Date.now() - t0 });

    } catch (error) {
        console.error('🔥 [TSB_INTERNAL_ERROR]', error.message);
        return Response.json({ ok: false, error_code: 'INTERNAL_ERROR', message: error.message, retryable: true, stage: 'UNKNOWN', request_id, latency_ms: Date.now() - t0 }, { status: 500 });
    }
});