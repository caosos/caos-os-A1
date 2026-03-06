/**
 * textToSpeech — CAOS TTS Backend
 * LOCK_SIGNATURE: CAOS_TTS_OPENAI_LOCK_v1_2026-03-01
 * TSB-PENDING: Commit 1 instrumentation — dev-mode debug object added (body flag)
 *
 * LOCKED. DO NOT MODIFY without TSB entry + owner approval.
 * Model: tts-1-hd (ONLY valid TTS model — see TSB-011)
 * Returns: JSON { audio_base64, content_type: "audio/mpeg" }
 * Auth: handled by calling context (ChatBubble) — no auth check here (see TSB-009)
 * Encoding: chunked loop to avoid stack overflow on large buffers (see TSB-009)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// ── DEV INSTRUMENTATION — COMMIT 1 ───────────────────────────────────────────
// djb2 hash — no external dep, bounded output, no raw text exposed
function djb2Hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
}
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    const gen_start_ms = Date.now();
    try {
        // Auth check — required for published app
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!OPENAI_API_KEY) {
            return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const { text, voice = 'nova', speed = 1.0, dev_mode = false } = await req.json();
        const devMode = dev_mode === true;

        if (!text) {
            return Response.json({ error: 'Text is required' }, { status: 400 });
        }

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1-hd',
                voice: voice,
                input: text,
                speed: speed
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenAI TTS error:', response.status, error);
            return Response.json({ error: `OpenAI error (${response.status}): ${error}` }, { status: response.status });
        }

        // Safe base64 encoding — avoids stack overflow on large buffers
        const audioData = new Uint8Array(await response.arrayBuffer());
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < audioData.length; i += chunkSize) {
            binary += String.fromCharCode(...audioData.subarray(i, i + chunkSize));
        }
        const audio_base64 = btoa(binary);

        const gen_time_ms = Date.now() - gen_start_ms;
        const result = { audio_base64, content_type: 'audio/mpeg' };
        if (devMode) {
            result.debug = {
                provider: 'openai',
                model: 'tts-1-hd',
                input_chars: text.length,
                input_hash: djb2Hash(text),
                audio_bytes: audioData.byteLength,
                audio_base64_len: audio_base64.length,
                mime_type: 'audio/mpeg',
                gen_time_ms,
                voice,
                speed,
            };
        }
        return Response.json(result);

    } catch (error) {
        console.error('TTS error:', error);
        return Response.json({ error: error.message || 'Failed to generate speech' }, { status: 500 });
    }
});