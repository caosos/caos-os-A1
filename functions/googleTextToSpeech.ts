import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// LOCKED: Google Web Speech API TTS implementation
// This is separate from OpenAI TTS and uses only built-in browser APIs.
// DO NOT MODIFY THIS FUNCTION.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { text, voice = 'Google US English', speed = 1.0 } = body;

    if (!text || text.trim().length === 0) {
      return Response.json({ error: 'Text is required' }, { status: 400 });
    }

    // Google Web Speech API voices - LOCKED list, do not modify
    const googleVoices = {
      'Google US English': { lang: 'en-US', name: 'Google US English' },
      'Google UK English': { lang: 'en-GB', name: 'Google UK English' },
      'Google US Spanish': { lang: 'es-ES', name: 'Google US Spanish' },
      'Google French': { lang: 'fr-FR', name: 'Google French' },
      'Google German': { lang: 'de-DE', name: 'Google German' },
      'Google Italian': { lang: 'it-IT', name: 'Google Italian' },
      'Google Japanese': { lang: 'ja-JP', name: 'Google Japanese' },
      'Google Mandarin': { lang: 'zh-CN', name: 'Google Mandarin' },
      'Google Korean': { lang: 'ko-KR', name: 'Google Korean' },
    };

    const selectedVoice = googleVoices[voice] || googleVoices['Google US English'];

    // Return configuration for client-side Google Web Speech API usage
    // The browser will handle speech synthesis using its built-in capabilities
    return Response.json({
      status: 'success',
      config: {
        text,
        lang: selectedVoice.lang,
        voice: selectedVoice.name,
        rate: Math.max(0.1, Math.min(speed, 2.0)),
        pitch: 1.0,
        volume: 1.0,
        engine: 'google_web_speech'
      },
      message: 'Use Google Web Speech API on client side'
    });

  } catch (error) {
    console.error('Google TTS error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});