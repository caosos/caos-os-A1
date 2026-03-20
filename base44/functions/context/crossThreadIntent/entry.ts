/**
 * MODULE: context/crossThreadIntent
 * CTC Phase 2 — 2026-03-04
 *
 * RESPONSIBILITY:
 *   Detect whether the current user message is referencing a past thread.
 *   If yes — return the target thread_id(s) to hydrate.
 *   If no  — return { cross_thread: false } and pipeline continues unmodified.
 *
 * THIS MODULE NEVER:
 *   - Loads message content
 *   - Makes OpenAI calls
 *   - Modifies any entity
 *
 * INPUT CONTRACT:
 *   POST body: {
 *     input: string,          // current user message
 *     session_id: string,     // current thread (excluded from search)
 *     user_email: string
 *   }
 *
 * OUTPUT CONTRACT (cross_thread = true):
 *   {
 *     cross_thread: true,
 *     intent_type: "EXPLICIT_THREAD" | "TOPIC_RECALL" | "TIME_RECALL",
 *     thread_ids: string[],   // candidate threads to hydrate
 *     confidence: number,     // 0.0–1.0
 *     detected_at: ISO string
 *   }
 *
 * OUTPUT CONTRACT (cross_thread = false):
 *   { cross_thread: false, detected_at: ISO string }
 *
 * INTENT TYPES:
 *   EXPLICIT_THREAD — user names a thread: "in the Brookdale thread", "the immigration conversation"
 *   TOPIC_RECALL    — user asks about a topic across threads: "what did we decide about X"
 *   TIME_RECALL     — user references time: "last week", "a few days ago", "back in February"
 *
 * TEMPERATURE RULES:
 *   - HOT threads always evaluated
 *   - WARM threads evaluated if EXPLICIT or TOPIC_RECALL confidence > 0.5
 *   - COLD threads evaluated only if EXPLICIT_THREAD with named match
 *   - VANISH threads never evaluated (use explicit archive query instead)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── SIGNAL PATTERNS ─────────────────────────────────────────────────────────

const EXPLICIT_THREAD_PATTERNS = [
  /\bthe\s+(\w+)\s+thread\b/i,
  /\bthe\s+(\w+)\s+conversation\b/i,
  /\bthe\s+(\w+)\s+chat\b/i,
  /\bin\s+(?:our|the)\s+(\w+)\s+(?:thread|conversation|discussion)\b/i,
  /\bfrom\s+(?:the\s+)?(\w+)\s+(?:thread|conversation)\b/i,
  /\bthe\s+(\w+(?:\s+\w+)?)\s+project\s+(?:thread|conversation)\b/i,
];

const TOPIC_RECALL_PATTERNS = [
  /\bwhat\s+did\s+(?:we|I|you)\s+(?:decide|discuss|say|agree|conclude)\b/i,
  /\bwhat\s+was\s+(?:our|the)\s+(?:decision|conclusion|plan|approach)\b/i,
  /\bdo\s+you\s+remember\s+(?:when|what|where|how)\b/i,
  /\bwe\s+(?:talked|discussed|decided|agreed)\s+(?:about|on|to)\b/i,
  /\bfrom\s+(?:a\s+)?(?:previous|earlier|another|other|past)\s+(?:thread|conversation|session|chat)\b/i,
  /\bpick\s+up\s+(?:where|from)\b/i,
  /\bcontinue\s+(?:where|from|our)\b/i,
];

const TIME_RECALL_PATTERNS = [
  /\b(?:last|this\s+past)\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(?:a\s+few|several|a\s+couple\s+of)\s+(?:days|weeks|months)\s+ago\b/i,
  /\b(?:yesterday|the\s+other\s+day|recently|back\s+in|earlier\s+this)\b/i,
  /\bin\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
];

// ─── DETECTION ────────────────────────────────────────────────────────────────

function detectIntent(input) {
  const text = input || '';

  // Check explicit thread reference first (highest confidence)
  for (const pattern of EXPLICIT_THREAD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        intent_type: 'EXPLICIT_THREAD',
        extracted_name: match[1] || null,
        confidence: 0.9
      };
    }
  }

  // Topic recall
  let topicScore = 0;
  for (const pattern of TOPIC_RECALL_PATTERNS) {
    if (pattern.test(text)) topicScore++;
  }
  if (topicScore >= 1) {
    return {
      intent_type: 'TOPIC_RECALL',
      extracted_name: null,
      confidence: Math.min(0.5 + topicScore * 0.15, 0.85)
    };
  }

  // Time recall (weakest signal — needs corroboration)
  let timeScore = 0;
  for (const pattern of TIME_RECALL_PATTERNS) {
    if (pattern.test(text)) timeScore++;
  }
  if (timeScore >= 1) {
    return {
      intent_type: 'TIME_RECALL',
      extracted_name: null,
      confidence: Math.min(0.35 + timeScore * 0.1, 0.6)
    };
  }

  return null;
}

// ─── THREAD MATCHING ─────────────────────────────────────────────────────────

function matchThreads(intent, threadIndex, currentSessionId) {
  const candidates = threadIndex.filter(t =>
    t.thread_id !== currentSessionId &&
    t.temperature !== 'VANISH'
  );

  if (!intent) return [];

  const { intent_type, extracted_name, confidence } = intent;

  // Temperature gating
  const eligible = candidates.filter(t => {
    if (t.temperature === 'HOT') return true;
    if (t.temperature === 'WARM') return confidence > 0.5;
    if (t.temperature === 'COLD') return intent_type === 'EXPLICIT_THREAD';
    return false;
  });

  if (intent_type === 'EXPLICIT_THREAD' && extracted_name) {
    const nameLower = extracted_name.toLowerCase();
    const named = eligible.filter(t =>
      t.title?.toLowerCase().includes(nameLower) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(nameLower))
    );
    if (named.length > 0) return named.map(t => t.thread_id);
  }

  // For TOPIC_RECALL and TIME_RECALL — return top 3 most recently active HOT/WARM
  return eligible
    .sort((a, b) => new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0))
    .slice(0, 3)
    .map(t => t.thread_id);
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { input, session_id, user_email } = body;
    const detected_at = new Date().toISOString();

    if (!input) {
      return Response.json({ cross_thread: false, detected_at });
    }

    // 1. Detect intent from message text
    const intent = detectIntent(input);

    if (!intent) {
      return Response.json({ cross_thread: false, detected_at });
    }

    // 2. Load thread index (metadata only)
    const threadIndex = await base44.entities.ThreadIndex.filter(
      { user_email: user_email || user.email },
      '-last_active_at',
      100
    );

    // 3. Match candidate threads
    const thread_ids = matchThreads(intent, threadIndex, session_id);

    if (thread_ids.length === 0) {
      return Response.json({ cross_thread: false, detected_at });
    }

    console.log('🔗 [CROSS_THREAD_DETECTED]', {
      intent_type: intent.intent_type,
      confidence: intent.confidence,
      thread_ids,
      detected_at
    });

    return Response.json({
      cross_thread: true,
      intent_type: intent.intent_type,
      thread_ids,
      confidence: intent.confidence,
      detected_at
    });

  } catch (err) {
    console.error('🔥 [CROSS_THREAD_INTENT_FAILED]', err.message);
    // Non-fatal — return false so pipeline continues
    return Response.json({ cross_thread: false, detected_at: new Date().toISOString(), error: err.message });
  }
});