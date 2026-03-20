/**
 * MODULE: context/sanitizer
 * CTC Phase 2 — 2026-03-04
 *
 * RESPONSIBILITY:
 *   Strip conversational filler from raw message history.
 *   Keep only signal-bearing content: decisions, definitions,
 *   constraints, action items, named entities, facts.
 *
 *   Output is used by seedCompressor (Phase 3) to build ARC packs.
 *   This module runs on message arrays BEFORE compression.
 *
 * THIS MODULE NEVER:
 *   - Makes OpenAI calls (pure string processing)
 *   - Touches the database
 *   - Modifies the live pipeline directly
 *
 * INPUT CONTRACT:
 *   POST body: {
 *     messages: Array<{ role: string, content: string, timestamp?: string }>,
 *     mode?: "STRICT" | "STANDARD"   // default: STANDARD
 *   }
 *
 *   STRICT   — removes all filler, keeps only decisions/facts/actions
 *   STANDARD — keeps meaningful discussion, removes pure pleasantries
 *
 * OUTPUT CONTRACT:
 *   {
 *     sanitized: Array<{ role, content, timestamp?, signal_score: number }>,
 *     original_count: number,
 *     kept_count: number,
 *     stripped_count: number,
 *     sanitized_at: ISO string
 *   }
 *
 * SIGNAL SCORING (0.0–1.0):
 *   >= 0.6 — kept in STANDARD mode
 *   >= 0.8 — kept in STRICT mode
 *   Boosts: decision verbs, named entities, code/technical terms
 *   Penalties: greeting words, filler phrases, single words
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── FILLER PATTERNS (strip these entirely) ───────────────────────────────────
const FILLER_EXACT = new Set([
  'ok', 'okay', 'sure', 'yes', 'no', 'yeah', 'yep', 'nope', 'got it',
  'sounds good', 'perfect', 'great', 'awesome', 'cool', 'thanks', 'thank you',
  'good', 'nice', 'alright', 'right', 'exactly', 'absolutely', 'of course',
  'makes sense', 'understood', 'noted', 'i see', 'i got it', 'got it',
  'please continue', 'go ahead', 'proceed', 'continue'
]);

const FILLER_PATTERNS = [
  /^(hi|hello|hey|howdy|good\s+(morning|afternoon|evening))[,!.\s]*$/i,
  /^(how\s+are\s+you|how's\s+it\s+going|what'?s\s+up)[?]?$/i,
  /^(i\s+see|i\s+understand|understood|got\s+it)[.!]?$/i,
  /^(ok|okay|sure|right|yep|yeah|nope|nah)[.!,]?$/i,
  /^(thank\s+you|thanks)[.!]?(\s+.*)?$/i,
  /^(great|awesome|perfect|excellent|sounds\s+good)[.!]?$/i,
];

// ─── SIGNAL BOOSTERS ──────────────────────────────────────────────────────────
const DECISION_VERBS = [
  /\b(decided|agreed|confirmed|concluded|approved|rejected|chose|selected|finalized)\b/i,
  /\b(will\s+use|going\s+to\s+use|let'?s\s+use|we'?ll\s+go\s+with)\b/i,
  /\b(must|should|need\s+to|have\s+to|required\s+to|constraint|limitation|rule)\b/i,
  /\b(action\s+item|next\s+step|todo|follow\s+up|deadline|by\s+\w+day)\b/i,
];

const DEFINITION_PATTERNS = [
  /\b(is\s+defined\s+as|means|refers\s+to|stands\s+for|is\s+called)\b/i,
  /\b(the\s+\w+\s+is|a\s+\w+\s+is|this\s+is\s+a)\b/i,
];

const TECHNICAL_SIGNALS = [
  /```[\s\S]+?```/,           // code blocks
  /\b[A-Z][A-Z_]{2,}\b/,     // constants: TSB_020, THREAD_INDEX
  /\b\w+\(\)/,                 // function calls
  /\b\d+\s*(ms|px|kb|mb|gb|tokens|lines|hours|days)\b/i,
];

// ─── SCORING ─────────────────────────────────────────────────────────────────
function scoreMessage(content) {
  if (!content || typeof content !== 'string') return 0;

  const text = content.trim();
  if (!text) return 0;

  // Instant reject: exact filler
  if (FILLER_EXACT.has(text.toLowerCase())) return 0.1;

  // Filler pattern match
  for (const p of FILLER_PATTERNS) {
    if (p.test(text)) return 0.15;
  }

  let score = 0.4; // baseline for non-filler

  // Length bonus (longer = more likely substantive)
  if (text.length > 50)  score += 0.05;
  if (text.length > 150) score += 0.05;
  if (text.length > 400) score += 0.05;

  // Decision verb boost
  for (const p of DECISION_VERBS) {
    if (p.test(text)) { score += 0.2; break; }
  }

  // Definition pattern boost
  for (const p of DEFINITION_PATTERNS) {
    if (p.test(text)) { score += 0.1; break; }
  }

  // Technical signal boost
  for (const p of TECHNICAL_SIGNALS) {
    if (p.test(text)) { score += 0.15; break; }
  }

  return Math.min(score, 1.0);
}

// ─── SANITIZE ─────────────────────────────────────────────────────────────────
function sanitize(messages, mode = 'STANDARD') {
  const threshold = mode === 'STRICT' ? 0.8 : 0.6;

  return messages.map(msg => ({
    ...msg,
    signal_score: scoreMessage(msg.content)
  })).filter(msg => msg.signal_score >= threshold);
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { messages = [], mode = 'STANDARD' } = body;

    const sanitized_at = new Date().toISOString();
    const sanitized = sanitize(messages, mode);

    console.log('🧹 [SANITIZER]', {
      original: messages.length,
      kept: sanitized.length,
      stripped: messages.length - sanitized.length,
      mode,
      sanitized_at
    });

    return Response.json({
      sanitized,
      original_count: messages.length,
      kept_count: sanitized.length,
      stripped_count: messages.length - sanitized.length,
      sanitized_at
    });

  } catch (err) {
    console.error('🔥 [SANITIZER_FAILED]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});