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
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
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
      // SDK JSON invocation — body may be empty or contain metadata, ignore
      // Fall through to error below
      return Response.json({ error: 'Audio must be sent as binary (ArrayBuffer), not JSON' }, { status: 400 });
    } else {
      // SDK binary invocation (application/octet-stream or any other binary content-type)
      audioBuffer = await req.arrayBuffer();
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