/**
 * CAOS — DETERMINISTIC TOPIC EXTRACTOR v1.0
 * 
 * Zero LLM dependency. One pass. Auditable routing.
 * Input → Normalized → Intent → Topics → Segmented → Plan
 */

// ─────────────────────────────────────────────
// STAGE 1: NORMALIZE INPUT
// ─────────────────────────────────────────────
export function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")     // remove punctuation
    .replace(/\s+/g, " ")         // collapse whitespace
}

// ─────────────────────────────────────────────
// STAGE 2: INTENT CLASSIFICATION
// ─────────────────────────────────────────────
export function classifyIntent(normalized: string): "LIST_THREADS" | "SEARCH_THREADS" | "GEN" {
  const hasListVerb = /\b(list|show|display|give me|what are)\b/.test(normalized)
  const hasThreadWord = /\b(thread|threads|conversation|conversations)\b/.test(normalized)
  const hasSearchVerb = /\b(about|contain|mentions|related to|familiar with|find|search)\b/.test(normalized)

  // SEARCH takes priority over LIST
  if (hasThreadWord && hasSearchVerb) {
    return "SEARCH_THREADS"
  }

  if (hasListVerb && hasThreadWord && !hasSearchVerb) {
    return "LIST_THREADS"
  }

  return "GEN"
}

// ─────────────────────────────────────────────
// STAGE 3: TOPIC TOKEN EXTRACTION
// ─────────────────────────────────────────────
export function extractTopics(normalized: string): string[] {
  const stopWords = new Set([
    "list", "show", "display", "give", "me", "what", "are",
    "threads", "thread", "conversations", "conversation",
    "that", "about", "contain", "mentions", "related", "to",
    "find", "search", "the", "and", "of", "in", "my",
    "threads", "with", "talk", "talking", "do", "you", "have", "for", "is", "a", "an"
  ])

  const tokens = normalized.split(" ")

  const topics = tokens.filter(token =>
    token.length > 2 &&
    !stopWords.has(token)
  )

  return [...new Set(topics)]  // deduplicate
}

// ─────────────────────────────────────────────
// STAGE 4: MULTI-TOPIC SEGMENTATION
// ─────────────────────────────────────────────
export function segmentTopics(topics: string[]) {
  if (topics.length === 0) {
    return { type: "EMPTY_TOPIC_SET" as const }
  }

  if (topics.length === 1) {
    return { type: "SINGLE_TOPIC" as const, topic: topics[0] }
  }

  return {
    type: "MULTI_TOPIC" as const,
    topics
  }
}

// ─────────────────────────────────────────────
// STAGE 5: FINAL ROUTING OBJECT
// ─────────────────────────────────────────────
export function resolveDeterministicIntent(input: string) {
  const normalized = normalizeInput(input)
  const intentType = classifyIntent(normalized)
  const topics = extractTopics(normalized)
  const segmentation = segmentTopics(topics)

  return {
    original_input: input,
    normalized_input: normalized,
    intent_type: intentType,
    topic_segmentation: segmentation,
    topic_count: topics.length,
    allow_cognitive_layer: intentType === "GEN"
  }
}

// ─────────────────────────────────────────────
// STAGE 6: SEARCH PLAN BUILDER
// ─────────────────────────────────────────────
export function buildSearchPlan(intent: ReturnType<typeof resolveDeterministicIntent>) {
  if (intent.intent_type !== "SEARCH_THREADS") {
    return null
  }

  if (intent.topic_segmentation.type === "EMPTY_TOPIC_SET") {
    return {
      mode: "FAIL" as const,
      reason: "NO_TOPICS_EXTRACTED"
    }
  }

  if (intent.topic_segmentation.type === "SINGLE_TOPIC") {
    return {
      mode: "SINGLE" as const,
      topics: [intent.topic_segmentation.topic]
    }
  }

  if (intent.topic_segmentation.type === "MULTI_TOPIC") {
    return {
      mode: "MULTI" as const,
      topics: intent.topic_segmentation.topics
    }
  }

  return {
    mode: "FAIL" as const,
    reason: "UNKNOWN_SEGMENTATION"
  }
}

// ─────────────────────────────────────────────
// UNIFIED ENTRY POINT
// ─────────────────────────────────────────────
export function extractAndPlanIntent(input: string) {
  const intent = resolveDeterministicIntent(input)
  const searchPlan = buildSearchPlan(intent)

  // HARD FAIL: SEARCH_THREADS with zero topics
  if (intent.intent_type === "SEARCH_THREADS" && intent.topic_count === 0) {
    console.error("🚨 [EXTRACTION_HARD_FAIL]: SEARCH_THREADS with no topics extracted")
    return {
      error: "EXTRACTION_VALIDATION_FAILURE",
      reason: "SEARCH_THREADS requires extracted topics",
      intent
    }
  }

  return {
    intent,
    searchPlan,
    valid: searchPlan?.mode !== "FAIL"
  }
}