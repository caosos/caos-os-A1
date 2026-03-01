/**
 * textToSpeech — CAOS TTS Backend
 * LOCK_SIGNATURE: CAOS_TTS_OPENAI_LOCK_v1_2026-03-01
 *
 * LOCKED. DO NOT MODIFY without TSB entry + owner approval.
 * Model: tts-1-hd (ONLY valid TTS model — see TSB-011)
 * Returns: JSON { audio_base64, content_type: "audio/mpeg" }
 * Auth: handled by calling context (ChatBubble) — no auth check here (see TSB-009)
 * Encoding: chunked loop to avoid stack overflow on large buffers (see TSB-009)
 */
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
    try {
        if (!OPENAI_API_KEY) {
            return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const { text, voice = 'nova', speed = 1.0 } = await req.json();

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

        return Response.json({ audio_base64, content_type: 'audio/mpeg' });

    } catch (error) {
        console.error('TTS error:', error);
        return Response.json({ error: error.message || 'Failed to generate speech' }, { status: 500 });
    }
});