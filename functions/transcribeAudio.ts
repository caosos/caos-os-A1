/**
 * transcribeAudio — CAOS Voice Input Transcription
 * LOCK_SIGNATURE: CAOS_TRANSCRIBE_AUDIO_LOCK_v2_2026-03-03
 *
 * LOCKED. DO NOT MODIFY without TSB entry + owner approval.
 * Model: whisper-1 | Input: audio/webm | Output: { text, success }
 *
 * ⚠️  TRANSPORT LAW — READ BEFORE TOUCHING:
 *   base44.functions.invoke() ALWAYS sends Content-Type: application/json.
 *   It does NOT support FormData or raw binary (ArrayBuffer) transmission.
 *   Any attempt to send FormData or ArrayBuffer via invoke() results in {}.
 *   The ONLY correct transport from the frontend SDK is base64-in-JSON:
 *     { audio_base64: "<base64 string>" }
 *   This is NOT a workaround. This IS the contract. Do not change it.
 *
 * TSB-019 applied: 2026-03-03 — base64 JSON path added, binary/FormData kept
 *   for direct HTTP callers only (non-SDK). SDK callers MUST use audio_base64.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  const request_id = crypto.randomUUID();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ ok: false, error_code: 'UNAUTHORIZED', stage: 'AUTH', message: 'Unauthorized', request_id, retryable: false }, { status: 401 });
    }

    let audioBuffer;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Direct HTTP FormData upload
      const formData = await req.formData();
      const audioFile = formData.get('audio');
      if (!audioFile) {
        return Response.json({ error: 'No audio file provided' }, { status: 400 });
      }
      audioBuffer = await audioFile.arrayBuffer();
    } else if (contentType.includes('application/json')) {
      // SDK invocation path — base44.functions.invoke() always sends JSON.
      // Frontend must encode audio as base64 and send { audio_base64: "..." }.
      // DO NOT change this to expect binary — the SDK cannot send binary.
      // TSB-019 | LOCK_SIGNATURE: CAOS_STT_BASE64_TRANSPORT_v1_2026-03-03
      const body = await req.json();
      if (!body.audio_base64) {
        return Response.json({ ok: false, error_code: 'MISSING_AUDIO', stage: 'INPUT_VALIDATION', message: 'audio_base64 field required', request_id, retryable: false }, { status: 400 });
      }
      // Size cap: ~10MB base64 ≈ 7.5MB audio — fast-fail before decode
      const MAX_BASE64_LEN = 10 * 1024 * 1024;
      if (body.audio_base64.length > MAX_BASE64_LEN) {
        return Response.json({ ok: false, error_code: 'PAYLOAD_TOO_LARGE', stage: 'INPUT_VALIDATION', message: `Audio base64 exceeds max size (${MAX_BASE64_LEN} chars)`, request_id, retryable: false }, { status: 413 });
      }
      // Async decode via fetch data URL — avoids synchronous CPU block (replaces atob+loop)
      const t_decode_start = Date.now();
      const dataUrl = `data:audio/webm;base64,${body.audio_base64}`;
      const decodeRes = await fetch(dataUrl);
      audioBuffer = await decodeRes.arrayBuffer();
      const t_decode_ms = Date.now() - t_decode_start;
      console.log('⏱️ [DECODE_MS]', { t_decode_ms, bytes: audioBuffer.byteLength, request_id });
    } else {
      // SDK binary invocation (application/octet-stream or any other binary content-type)
      audioBuffer = await req.arrayBuffer();
    }

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return Response.json({ ok: false, error_code: 'EMPTY_AUDIO', stage: 'INPUT_VALIDATION', message: 'Audio buffer is empty', request_id, retryable: true }, { status: 400 });
    }

    // Convert to File object for OpenAI
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    // Provider call with hard timeout (20s) — returns typed retryable error before gateway fires
    const PROVIDER_TIMEOUT_MS = 20000;
    const t_provider_start = Date.now();
    const transcription = await Promise.race([
      openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'en',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment']
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('PROVIDER_TIMEOUT')), PROVIDER_TIMEOUT_MS))
    ]);
    const t_provider_ms = Date.now() - t_provider_start;
    const t_total_ms = Date.now() - (t_provider_start - (typeof t_decode_ms !== 'undefined' ? t_decode_ms : 0));
    console.log('⏱️ [TRANSCRIBE_TIMING]', { t_provider_ms, t_total_ms, request_id });

    return Response.json({ ok: true, text: transcription.text, success: true, request_id, timing: { t_decode_ms: typeof t_decode_ms !== 'undefined' ? t_decode_ms : null, t_provider_ms, t_total_ms } });
  } catch (error) {
    console.error('Transcription error:', error);
    const isWhisper = error.message?.includes('openai') || error.message?.includes('whisper') || error.status;
    return Response.json({
      ok: false,
      error_code: isWhisper ? 'WHISPER_FAILED' : 'TRANSCRIBE_FAILED',
      stage: isWhisper ? 'WHISPER_CALL' : 'PROCESSING',
      message: error.message,
      request_id,
      retryable: true,
      success: false
    }, { status: 500 });
  }
});