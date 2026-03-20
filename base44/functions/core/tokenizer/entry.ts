/**
 * CAOS:INDEX.TOKENIZER/v1.0
 * 
 * Deterministic text normalization + token extraction
 * MUST be identical for indexing AND querying
 * Zero interpretation. Pure determinism.
 */

// ─────────────────────────────────────────────
// CONFIG (FROZEN FOR THIS VERSION)
// ─────────────────────────────────────────────

export const TOKEN_CONFIG = {
  minLength: 3,
  stopwords: new Set([
    "the", "and", "for", "with", "that", "this", "you", "are", "was", "have", "from", "your",
    "hello", "good", "morning", "evening", "aria", "new", "conversation",
    "a", "an", "is", "in", "it", "be", "to", "of", "on", "at", "by", "or", "if", "do", "has"
  ])
}

// ─────────────────────────────────────────────
// STAGE 1: NORMALIZE TEXT
// ─────────────────────────────────────────────

export function normalizeText(text: string): string {
  if (!text || typeof text !== "string") {
    return ""
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")   // punctuation → space
    .replace(/\s+/g, " ")       // collapse whitespace
    .trim()
}

// ─────────────────────────────────────────────
// STAGE 2: EXTRACT TOKENS
// ─────────────────────────────────────────────

export function extractTokens(normalizedText: string): string[] {
  if (!normalizedText) {
    return []
  }

  const tokens = normalizedText
    .split(" ")
    .filter(token => {
      // Length check
      if (token.length < TOKEN_CONFIG.minLength) {
        return false
      }

      // Stopword check
      if (TOKEN_CONFIG.stopwords.has(token)) {
        return false
      }

      return true
    })

  // Deduplicate
  return [...new Set(tokens)]
}

// ─────────────────────────────────────────────
// STAGE 3: HASH TITLE (DETECT CHANGES)
// ─────────────────────────────────────────────

export async function hashTitle(normalizedText: string): Promise<string> {
  if (!normalizedText) {
    return ""
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(normalizedText)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  
  // Convert to hex
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

// ─────────────────────────────────────────────
// UNIFIED: PROCESS TITLE (FULL PIPELINE)
// ─────────────────────────────────────────────

export async function processTitle(title: string) {
  const normalized = normalizeText(title)
  const tokens = extractTokens(normalized)
  const hash = await hashTitle(normalized)

  return {
    original: title,
    normalized,
    tokens,
    tokenCount: tokens.length,
    hash
  }
}

// ─────────────────────────────────────────────
// DEBUG HELPERS
// ─────────────────────────────────────────────

export function explainNormalization(text: string): {
  step1_input: string
  step2_lowercase: string
  step3_trim: string
  step4_punct_to_space: string
  step5_collapse_ws: string
  step6_final_trim: string
} {
  const step1 = text
  const step2 = step1.toLowerCase()
  const step3 = step2.trim()
  const step4 = step3.replace(/[^\w\s]/g, " ")
  const step5 = step4.replace(/\s+/g, " ")
  const step6 = step5.trim()

  return {
    step1_input: step1,
    step2_lowercase: step2,
    step3_trim: step3,
    step4_punct_to_space: step4,
    step5_collapse_ws: step5,
    step6_final_trim: step6
  }
}

export function explainTokenExtraction(normalizedText: string): {
  normalized: string
  raw_split: string[]
  after_length_filter: string[]
  after_stopword_filter: string[]
  final_deduplicated: string[]
  token_count: number
} {
  const rawSplit = normalizedText.split(" ")

  const afterLength = rawSplit.filter(t => t.length >= TOKEN_CONFIG.minLength)

  const afterStopword = afterLength.filter(t => !TOKEN_CONFIG.stopwords.has(t))

  const final = [...new Set(afterStopword)]

  return {
    normalized: normalizedText,
    raw_split: rawSplit,
    after_length_filter: afterLength,
    after_stopword_filter: afterStopword,
    final_deduplicated: final,
    token_count: final.length
  }
}