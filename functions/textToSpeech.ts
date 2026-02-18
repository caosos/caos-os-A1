import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!OPENAI_API_KEY) {
            return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const { text, voice = 'nova', speed = 1.0 } = await req.json();

        if (!text) {
            return Response.json({ error: 'Text is required' }, { status: 400 });
        }

        // Call OpenAI TTS API
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: voice,
                input: text,
                speed: speed
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('OpenAI API Response:', response.status, error);
            return Response.json({ 
                error: `OpenAI API error (${response.status}): ${error}`,
                status_code: response.status 
            }, { status: response.status });
        }

        // Get audio data
        const audioData = await response.arrayBuffer();

        // Return audio file
        return new Response(audioData, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioData.byteLength.toString()
            }
        });

    } catch (error) {
        console.error('TTS error:', error);
        return Response.json({ 
            error: error.message || 'Failed to generate speech'
        }, { status: 500 });
    }
});