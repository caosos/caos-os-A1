/**
 * googleTTSGemini — CAOS TTS Backend (Gemini Provider)
 * DATE: 2026-03-31
 * 
 * Generates speech using Google Gemini's TTS API.
 * Returns same format as textToSpeech for seamless provider swapping.
 * Auth: handled by calling context
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

function djb2Hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
}

Deno.serve(async (req) => {
    const gen_start_ms = Date.now();
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!GEMINI_API_KEY) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const { text, voice = 'Aoede', speed = 1.0, dev_mode = false } = await req.json();
        const devMode = dev_mode === true;

        if (!text) {
            return Response.json({ error: 'Text is required' }, { status: 400 });
        }

        // Gemini TTS API endpoint — v1beta
        const response = await fetch('https://texttospeech.googleapis.com/v1beta1/text:synthesize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': GEMINI_API_KEY,
            },
            body: JSON.stringify({
                input: { text: text },
                voice: {
                    language_code: 'en-US',
                    name: voice, // e.g. "en-US-Neural2-A", "en-US-Polyglot-1"
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: speed,
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Gemini TTS error:', response.status, error);
            return Response.json({ error: `Gemini error (${response.status}): ${error}` }, { status: response.status });
        }

        const data = await response.json();
        if (!data.audioContent) {
            return Response.json({ error: 'No audio content returned' }, { status: 500 });
        }

        // audioContent is already base64-encoded from Gemini API
        const audio_base64 = data.audioContent;
        const audioBytes = Buffer.from(audio_base64, 'base64').length;

        const gen_time_ms = Date.now() - gen_start_ms;
        const result = { audio_base64, content_type: 'audio/mpeg' };
        if (devMode) {
            result.debug = {
                provider: 'gemini',
                model: 'text-to-speech-1',
                input_chars: text.length,
                input_hash: djb2Hash(text),
                audio_bytes: audioBytes,
                audio_base64_len: audio_base64.length,
                mime_type: 'audio/mpeg',
                gen_time_ms,
                voice,
                speed,
            };
        }
        return Response.json(result);

    } catch (error) {
        console.error('Gemini TTS error:', error);
        return Response.json({ error: error.message || 'Failed to generate speech' }, { status: 500 });
    }
});