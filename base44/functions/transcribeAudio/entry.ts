/**
 * transcribeAudio — CAOS Voice Input Transcription
 * LOCK_SIGNATURE: CAOS_TRANSCRIBE_AUDIO_LOCK_v3_2026-03-23
 *
 * Phase 1B: Contract-compliant JSON envelope on ALL error paths.
 * ALWAYS returns Content-Type: application/json.
 * NEVER returns text/plain for handled failures.
 *
 * ERROR CODES: TRANSCRIBE_FAILED | PAYLOAD_TOO_LARGE | AUDIO_TOO_LARGE |
 *              TIME_BUDGET_EXCEEDED | PROVIDER_TIMEOUT | AUDIO_UNSUPPORTED |
 *              MISSING_AUDIO | EMPTY_AUDIO | UNAUTHORIZED
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

// Always returns JSON — never text/plain
const jsonResponse = (body, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });

// Contract-complete response helpers (Phase 1.1)
const makeReceipt = (stage, elapsed_ms, overrides = {}) => ({
    tool: 'transcribeAudio',
    stage,
    elapsed_ms: elapsed_ms ?? null,
    provider_elapsed_ms: overrides.provider_elapsed_ms ?? null,
    model: overrides.model ?? null,
    fallback_tier: null,
    ...overrides,
});

const okResponse = (data, receipt) =>
    jsonResponse({ ok: true, degraded: false, data, request_id: receipt._request_id, diagnostic_receipt: makeReceipt(receipt.stage, receipt.elapsed_ms, receipt) });

const failResponse = (status, error_code, stage, message, retryable, elapsed_ms, request_id, receiptOverrides = {}) =>
    jsonResponse({
        ok: false, degraded: false, error_code, stage, message, retryable,
        request_id, elapsed_ms: elapsed_ms ?? null,
        data: { text: null },
        diagnostic_receipt: makeReceipt(stage, elapsed_ms, receiptOverrides),
        success: false,
    }, status);

Deno.serve(async (req) => {
    const request_id = crypto.randomUUID();
    const t_start = Date.now();

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return failResponse(401, 'UNAUTHORIZED', 'AUTH', 'Unauthorized', false, Date.now() - t_start, request_id);
        }

        let audioBuffer;
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const audioFile = formData.get('audio');
            if (!audioFile) {
                return jsonResponse({ ok: false, error_code: 'MISSING_AUDIO', stage: 'INPUT_VALIDATION', message: 'No audio file provided', request_id, retryable: false }, 400);
            }
            audioBuffer = await audioFile.arrayBuffer();

        } else if (contentType.includes('application/json')) {
            const body = await req.json();
            if (!body.audio_base64) {
                return failResponse(400, 'MISSING_AUDIO', 'INPUT_VALIDATION', 'audio_base64 field required', false, Date.now() - t_start, request_id);
            }

            // Size cap: ~10MB base64 ≈ 7.5MB audio
            const MAX_BASE64_LEN = 10 * 1024 * 1024;
            if (body.audio_base64.length > MAX_BASE64_LEN) {
                return failResponse(413, 'AUDIO_TOO_LARGE', 'INPUT_VALIDATION', `Audio exceeds max size (${MAX_BASE64_LEN} chars base64)`, false, Date.now() - t_start, request_id);
            }

            const t_decode_start = Date.now();
            const dataUrl = `data:audio/webm;base64,${body.audio_base64}`;
            const decodeRes = await fetch(dataUrl);
            audioBuffer = await decodeRes.arrayBuffer();
            const t_decode_ms = Date.now() - t_decode_start;
            console.log('⏱️ [DECODE_MS]', { t_decode_ms, bytes: audioBuffer.byteLength, request_id });

        } else {
            audioBuffer = await req.arrayBuffer();
        }

        if (!audioBuffer || audioBuffer.byteLength === 0) {
            return jsonResponse({ ok: false, error_code: 'EMPTY_AUDIO', stage: 'INPUT_VALIDATION', message: 'Audio buffer is empty', request_id, retryable: true }, 400);
        }

        // Validate audio size before sending to provider (~25MB Whisper limit)
        const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
        if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
            return jsonResponse({ ok: false, error_code: 'AUDIO_TOO_LARGE', stage: 'INPUT_VALIDATION', message: `Audio too large for provider (${audioBuffer.byteLength} bytes, max ${MAX_AUDIO_BYTES})`, request_id, retryable: false }, 413);
        }

        const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

        // Provider call with hard timeout — returns typed error before gateway fires
        const PROVIDER_TIMEOUT_MS = 20000;
        const t_provider_start = Date.now();

        let transcription;
        try {
            transcription = await Promise.race([
                openai.audio.transcriptions.create({
                    file,
                    model: 'whisper-1',
                    language: 'en',
                    response_format: 'verbose_json',
                    timestamp_granularities: ['segment']
                }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('PROVIDER_TIMEOUT')), PROVIDER_TIMEOUT_MS)
                )
            ]);
        } catch (providerError) {
            const elapsed_ms = Date.now() - t_start;
            const isTimeout = providerError.message === 'PROVIDER_TIMEOUT';
            const isFormat = providerError.message?.toLowerCase().includes('format') || providerError.message?.toLowerCase().includes('unsupported');
            return jsonResponse({
                ok: false,
                error_code: isTimeout ? 'PROVIDER_TIMEOUT' : isFormat ? 'AUDIO_UNSUPPORTED' : 'TRANSCRIBE_FAILED',
                stage: 'WHISPER_CALL',
                message: providerError.message,
                retryable: isTimeout,
                request_id,
                elapsed_ms,
                success: false,
            }, isTimeout ? 504 : 422);
        }

        const t_provider_ms = Date.now() - t_provider_start;
        const elapsed_ms = Date.now() - t_start;
        console.log('⏱️ [TRANSCRIBE_TIMING]', { t_provider_ms, elapsed_ms, request_id });

        return jsonResponse({
            ok: true, text: transcription.text, success: true, request_id,
            timing: { t_provider_ms, elapsed_ms }
        });

    } catch (error) {
        const elapsed_ms = Date.now() - t_start;
        console.error('[TRANSCRIBE_OUTER_ERROR]', error.message);

        const isTimeout = error.message === 'PROVIDER_TIMEOUT' || error.message?.includes('PROVIDER_TIMEOUT');
        const isPayloadTooLarge = error.message?.includes('413') || error.message?.includes('too large') || error.message?.includes('PAYLOAD_TOO_LARGE');
        const isUnsupported = error.message?.toLowerCase().includes('unsupported') || error.message?.toLowerCase().includes('format');

        return jsonResponse({
            ok: false,
            error_code: isTimeout ? 'PROVIDER_TIMEOUT' : isPayloadTooLarge ? 'PAYLOAD_TOO_LARGE' : isUnsupported ? 'AUDIO_UNSUPPORTED' : 'TRANSCRIBE_FAILED',
            stage: 'TRANSCRIPTION',
            message: error.message,
            retryable: isTimeout,
            request_id,
            elapsed_ms,
            success: false,
        }, isPayloadTooLarge ? 413 : isTimeout ? 504 : 500);
    }
});