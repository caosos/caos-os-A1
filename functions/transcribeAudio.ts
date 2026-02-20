import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let audioBuffer;
    const contentType = req.headers.get('content-type');

    // Handle SDK invocation (binary audio data)
    if (contentType?.includes('application/octet-stream')) {
      audioBuffer = await req.arrayBuffer();
    } else {
      // Handle FormData for direct HTTP requests
      const formData = await req.formData();
      const audioFile = formData.get('audio');
      
      if (!audioFile) {
        return Response.json({ error: 'No audio file provided' }, { status: 400 });
      }
      
      audioBuffer = await audioFile.arrayBuffer();
    }

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return Response.json({ error: 'Audio buffer is empty' }, { status: 400 });
    }

    // Convert to File object for OpenAI
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    // OpenAI Whisper supports files up to 25MB and unlimited duration
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

    return Response.json({ 
      text: transcription.text,
      success: true 
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});