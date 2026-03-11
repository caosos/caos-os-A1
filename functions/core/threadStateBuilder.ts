// MODULE: core/threadStateBuilder
// PURPOSE: Build + cache compressed thread state for token reduction (Phase 3 — Pattern 1 async)
// PATTERN: fetch_only=true → cache read only, no model call (used on hybridMessage critical path)
//          fetch_only=false → build via gpt-4o-mini + write to ThreadSnapshot (fire-and-forget)
// INVARIANTS: Never blocks hybridMessage. Always returns typed envelope. Errors are logged, never thrown.
// STALENESS: last_seq = rawHistory.length at build time. Injector only windows if last_seq >= current rawHistory.length.
// DEDUP: in-flight map prevents concurrent builds for same session_id:last_seq.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILDER_TIMEOUT_MS = 5000;
// Aligned with hybridMessage MAX_HISTORY_MESSAGES=40 — summarize the same span we hydrate
const MAX_MESSAGES_FOR_BUILD = 40;

// Module-level in-flight dedup map: key = "session_id:last_seq" → true
const IN_FLIGHT = new Map();

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
        const { session_id, messages = [], fetch_only = false, last_seq = 0 } = body;

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
                const snap_last_seq = snap.token_count_at_snapshot || 0;
                console.log('✅ [TSB_CACHE_HIT]', { session_id: session_id.substring(0, 8), last_seq: snap_last_seq, latency_ms: Date.now() - t0 });
                return Response.json({
                    ok: true,
                    block: snap.compressed_seed,
                    cached: true,
                    last_seq: snap_last_seq,
                    covered_count: snap_last_seq,
                    request_id,
                    latency_ms: Date.now() - t0
                });
            }
            return Response.json({ ok: false, error_code: 'CACHE_MISS', cached: false, request_id, latency_ms: Date.now() - t0 });
        }

        // ── BUILD PATH: generate state via gpt-4o-mini ────────────────────────
        if (!messages || messages.length < 4) {
            return Response.json({ ok: false, error_code: 'INSUFFICIENT_HISTORY', request_id, latency_ms: Date.now() - t0 });
        }

        // Use caller's last_seq if provided, else fall back to messages.length
        const effective_seq = last_seq || messages.length;
        const inflight_key = `${session_id}:${effective_seq}`;

        // DEDUP: if already building this exact seq, return in_flight immediately
        if (IN_FLIGHT.get(inflight_key)) {
            console.log('⏭️ [TSB_IN_FLIGHT]', { key: inflight_key });
            return Response.json({ ok: true, cached: false, in_flight: true, request_id, latency_ms: Date.now() - t0 });
        }
        IN_FLIGHT.set(inflight_key, true);

        const openaiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiKey) {
            IN_FLIGHT.delete(inflight_key);
            return Response.json({ ok: false, error_code: 'NO_API_KEY', stage: 'CONFIG', request_id });
        }

        // Summarize up to MAX_MESSAGES_FOR_BUILD (=40), aligned with hybridMessage window
        const historySlice = messages.slice(-MAX_MESSAGES_FOR_BUILD);
        const covered_count = historySlice.length;
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
                        { role: 'user', content: `CONVERSATION HISTORY (last ${covered_count} messages):\n\n${historyText}` }
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
            IN_FLIGHT.delete(inflight_key);
            const isTimeout = e?.name === 'AbortError';
            console.warn('⚠️ [TSB_BUILD_FAILED]', { reason: isTimeout ? 'timeout' : e.message });
            return Response.json({
                ok: false, error_code: isTimeout ? 'BUILD_TIMEOUT' : 'BUILD_FAILED',
                message: e.message, retryable: !isTimeout, stage: 'OPENAI_CALL', request_id, latency_ms: Date.now() - t0
            });
        }

        IN_FLIGHT.delete(inflight_key);

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

        // token_count_at_snapshot stores effective_seq (the rawHistory.length from caller)
        // This is the seq the injector will compare against current rawHistory.length for freshness
        await base44.asServiceRole.entities.ThreadSnapshot.create({
            snapshot_id: crypto.randomUUID(),
            session_id,
            snapshot_ts: Date.now(),
            compressed_seed: block,
            integrity_hash,
            token_count_at_snapshot: effective_seq,
            rotation_reason: 'manual'
        });

        console.log('✅ [TSB_BUILT]', { session_id: session_id.substring(0, 8), effective_seq, covered_count, chars: block.length, latency_ms: Date.now() - t0 });

        return Response.json({ ok: true, block, cached: false, last_seq: effective_seq, covered_count, request_id, latency_ms: Date.now() - t0 });

    } catch (error) {
        console.error('🔥 [TSB_INTERNAL_ERROR]', error.message);
        return Response.json({ ok: false, error_code: 'INTERNAL_ERROR', message: error.message, retryable: true, stage: 'UNKNOWN', request_id, latency_ms: Date.now() - t0 }, { status: 500 });
    }
});