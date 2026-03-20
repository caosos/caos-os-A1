/**
 * MODULE: context/seedCompressor
 * CTC Phase 3 — 2026-03-04
 * PRE-FLIGHT DOC: CAOS CTC PHASE 3 PREFLIGHT v1.0
 *
 * RESPONSIBILITY:
 *   Take a raw message span (from sanitizer output or direct messages),
 *   compress it into a structured ARC pack via one OpenAI call,
 *   and write the result to ContextSeed.
 *
 * HARD RULES (Pre-flight §2, §3, §5, §7):
 *   1. Seeds are ALWAYS generated from raw message spans — NEVER from prior seeds.
 *      (Anti-drift rule: "compression-of-compression" is BLOCKED here by design.)
 *   2. Idempotent: if span_hash exists, ABORT + return existing seed_id.
 *   3. Seeds never overlap: caller must provide non-overlapping message_ids.
 *   4. Output is structured JSON only — { definitions, decisions, constraints, action_items, references }
 *   5. Every seed creation emits SEED_CREATED log with full provenance.
 *   6. Fail closed on any error — no partial seed writes.
 *
 * INPUT CONTRACT:
 *   POST body: {
 *     messages: Array<{ id: string, role: string, content: string, timestamp: string }>,
 *     thread_id: string,
 *     lane_id?: string,
 *     user_email?: string
 *   }
 *
 * OUTPUT CONTRACT (success):
 *   {
 *     status: "CREATED" | "SKIPPED_DUPLICATE",
 *     seed_id: string,
 *     span_hash: string,
 *     arc_pack: object,
 *     approx_tokens_in: number,
 *     approx_tokens_out: number,
 *     token_reduction_ratio: number,
 *     created_at: ISO string
 *   }
 *
 * COMPRESSOR_VERSION: SEED_COMPRESSOR_v1_2026-03-04
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const COMPRESSOR_VERSION = 'SEED_COMPRESSOR_v1_2026-03-04';
const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const ACTIVE_MODEL = 'gpt-5.2';

// ─── SPAN HASH (idempotency key) ──────────────────────────────────────────────
// Hash = sorted message_ids + their timestamps concatenated
async function computeSpanHash(messages) {
  const input = messages
    .map(m => `${m.id}:${m.timestamp || ''}`)
    .join('|');
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── ARC PACK HASH ────────────────────────────────────────────────────────────
async function computeArcHash(arcPack) {
  const input = JSON.stringify(arcPack);
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── TOKEN ESTIMATOR (rough: 1 token ≈ 4 chars) ──────────────────────────────
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

// ─── COMPRESSOR PROMPT ───────────────────────────────────────────────────────
function buildCompressorPrompt(messages) {
  const transcript = messages
    .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join('\n\n');

  return `You are a deterministic context compressor. Given a conversation transcript, extract only signal-bearing information into a structured JSON object.

OUTPUT FORMAT (strict JSON — no prose, no markdown wrapper):
{
  "definitions": [
    { "term": "string", "definition": "string", "context": "optional short note" }
  ],
  "decisions": [
    { "decision": "string", "rationale": "optional", "timestamp": "if known from transcript" }
  ],
  "constraints": [
    { "constraint": "string", "source": "user | system" }
  ],
  "action_items": [
    { "task": "string", "owner": "optional", "deadline": "optional" }
  ],
  "references": [
    { "type": "artifact | message | url | concept", "id_or_value": "string", "note": "optional" }
  ]
}

RULES:
- Extract ONLY what is explicitly stated in the transcript.
- Do NOT infer, speculate, or add information not present.
- If nothing fits a category, use an empty array [].
- If something cannot be expressed as a structured field, add it to references[].
- Timestamps in decisions should be taken from the transcript context where evident.

TRANSCRIPT:
${transcript}`;
}

// ─── OPENAI CALL ──────────────────────────────────────────────────────────────
async function callOpenAI(key, prompt) {
  const response = await fetch(OPENAI_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ACTIVE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,        // deterministic compression
      max_completion_tokens: 2000
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    usage: data.usage || null
  };
}

// ─── PARSE ARC PACK ───────────────────────────────────────────────────────────
function parseArcPack(raw) {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  // Enforce schema — ensure all required keys exist
  return {
    definitions:  Array.isArray(parsed.definitions)  ? parsed.definitions  : [],
    decisions:    Array.isArray(parsed.decisions)     ? parsed.decisions    : [],
    constraints:  Array.isArray(parsed.constraints)   ? parsed.constraints  : [],
    action_items: Array.isArray(parsed.action_items)  ? parsed.action_items : [],
    references:   Array.isArray(parsed.references)    ? parsed.references   : []
  };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const started_at = new Date().toISOString();

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { messages = [], thread_id, lane_id = 'general', user_email } = body;

    const target_email = user_email || user.email;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!thread_id) return Response.json({ error: 'thread_id is required' }, { status: 400 });
    if (messages.length === 0) return Response.json({ error: 'messages array is empty' }, { status: 400 });

    // ── §2 IDEMPOTENCY: compute span_hash first ───────────────────────────────
    const span_hash = await computeSpanHash(messages);

    // Check for existing seed with this span_hash
    const existing = await base44.entities.ContextSeed.filter(
      { thread_id, user_email: target_email },
      '-created_at',
      50
    );
    const duplicate = existing.find(s => s.source_span?.span_hash === span_hash);
    if (duplicate) {
      console.log('⏭️ [SEED_DUPLICATE_SKIPPED]', { span_hash, existing_seed_id: duplicate.seed_id || duplicate.id });
      return Response.json({
        status: 'SKIPPED_DUPLICATE',
        seed_id: duplicate.seed_id || duplicate.id,
        span_hash,
        arc_pack: duplicate.arc_pack_json,
        created_at: duplicate.created_at
      });
    }

    // ── TOKEN ESTIMATE (pre-compression) ─────────────────────────────────────
    const rawText = messages.map(m => m.content || '').join(' ');
    const approx_tokens_in = estimateTokens(rawText);

    // ── COMPRESS via OpenAI ───────────────────────────────────────────────────
    // ANTI-DRIFT RULE: prompt is built from raw messages only — never from prior seeds
    const compressorPrompt = buildCompressorPrompt(messages);
    const { content: rawArc, usage } = await callOpenAI(openaiKey, compressorPrompt);

    // ── PARSE + VALIDATE ──────────────────────────────────────────────────────
    const arc_pack = parseArcPack(rawArc);
    const arc_pack_hash = await computeArcHash(arc_pack);

    // ── TOKEN ESTIMATE (post-compression) ────────────────────────────────────
    const approx_tokens_out = estimateTokens(JSON.stringify(arc_pack));
    const token_reduction_ratio = approx_tokens_in > 0
      ? Number((approx_tokens_out / approx_tokens_in).toFixed(3))
      : 0;

    // ── BUILD SOURCE SPAN ─────────────────────────────────────────────────────
    const timestamps = messages.map(m => m.timestamp).filter(Boolean).sort();
    const source_span = {
      from_ts: timestamps[0] || null,
      to_ts: timestamps[timestamps.length - 1] || null,
      message_ids: messages.map(m => m.id).filter(Boolean),
      span_hash,
      msg_count: messages.length
    };

    // ── WRITE SEED ────────────────────────────────────────────────────────────
    const seed_id = crypto.randomUUID();
    const created_at = new Date().toISOString();

    await base44.asServiceRole.entities.ContextSeed.create({
      seed_id,
      thread_id,
      lane_id,
      user_email: target_email,
      created_at,
      last_hydrated_at: null,
      source_span,
      arc_pack_json: arc_pack,
      arc_pack_hash,
      approx_tokens_in,
      approx_tokens_out,
      token_reduction_ratio,
      compressor_version: COMPRESSOR_VERSION,
      temperature: 'HOT',
      topics: [],
      importance_score: 0.7,
      version: 1
    });

    // ── §5 SEED_CREATED LOG ───────────────────────────────────────────────────
    console.log('🌱 [SEED_CREATED]', {
      seed_id,
      lane_id,
      thread_id,
      created_at,
      source_span: {
        from_ts: source_span.from_ts,
        to_ts: source_span.to_ts,
        message_id_first: source_span.message_ids[0] || null,
        message_id_last: source_span.message_ids[source_span.message_ids.length - 1] || null,
        msg_count: source_span.msg_count
      },
      approx_tokens_in,
      approx_tokens_out,
      token_reduction_ratio,
      span_hash,
      compressor_version: COMPRESSOR_VERSION
    });

    return Response.json({
      status: 'CREATED',
      seed_id,
      span_hash,
      arc_pack,
      approx_tokens_in,
      approx_tokens_out,
      token_reduction_ratio,
      created_at
    });

  } catch (err) {
    console.error('🔥 [SEED_COMPRESSOR_FAILED]', { error: err.message, started_at });

    try {
      await base44.asServiceRole.entities.ErrorLog.create({
        user_email: 'unknown',
        error_type: 'server_error',
        error_message: `SEED_COMPRESSOR_FAILED: ${err.message}`,
        error_code: 'CTC_SEED_COMPRESS_FAILURE',
        stage: 'SEED_COMPRESS',
        system_version: COMPRESSOR_VERSION
      });
    } catch (_) {}

    // FAIL CLOSED — no partial writes
    return Response.json({ error: err.message, status: 'FAILED' }, { status: 500 });
  }
});