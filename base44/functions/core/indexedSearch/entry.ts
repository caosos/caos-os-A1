/**
 * CAOS:INDEX.SEARCH/v1.0
 * 
 * Index-backed thread search execution
 * Deterministic AND intersection
 * Zero LLM. In-memory stub for Phase 1.
 */

import { normalizeText, extractTokens, TOKEN_CONFIG } from "./tokenizer.ts"

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

export interface Thread {
  id: string
  title: string
}

export interface TokenIndex {
  [token: string]: Set<string> // token → Set of thread IDs
}

export interface SearchOperation {
  queryTerms: string[]
  normalizedTerms: string[]
  tokenHits: Record<string, number>
  matchedThreadIds: Set<string>
  matchCount: number
  matchType: "exact" | "partial" | "none"
  confidence: "HIGH" | "MED" | "LOW"
  scope: "title_index"
}

export interface SearchOperationReport {
  searchScope: string
  queryTerms: string[]
  normalizedTerms: string[]
  tokenHits: Record<string, number>
  matchSummary: {
    matchCount: number
    matchType: "exact" | "partial" | "none"
    confidence: "HIGH" | "MED" | "LOW"
  }
  results: Array<{ threadId: string; title: string }>
  nextStep: string
}

// ─────────────────────────────────────────────
// IN-MEMORY STUB INDEX (Phase 1)
// ─────────────────────────────────────────────

export class IndexedThreadSearchEngine {
  private tokenIndex: TokenIndex = {}
  private threadMap: Map<string, Thread> = new Map()

  constructor(threads: Thread[] = []) {
    this.buildIndexFromThreads(threads)
  }

  // ─────────────────────────────────────────────
  // BUILD INDEX FROM THREADS
  // ─────────────────────────────────────────────

  private buildIndexFromThreads(threads: Thread[]): void {
    this.tokenIndex = {}
    this.threadMap.clear()

    for (const thread of threads) {
      this.threadMap.set(thread.id, thread)

      const normalized = normalizeText(thread.title)
      const tokens = extractTokens(normalized)

      for (const token of tokens) {
        if (!this.tokenIndex[token]) {
          this.tokenIndex[token] = new Set()
        }
        this.tokenIndex[token].add(thread.id)
      }
    }
  }

  // ─────────────────────────────────────────────
  // SEARCH THREADS BY TOPIC
  // ─────────────────────────────────────────────

  search(query: string): SearchOperation {
    // Normalize and extract tokens from query
    const normalizedQuery = normalizeText(query)
    const queryTokens = extractTokens(normalizedQuery)

    if (queryTokens.length === 0) {
      return {
        queryTerms: query.split(" "),
        normalizedTerms: [],
        tokenHits: {},
        matchedThreadIds: new Set(),
        matchCount: 0,
        matchType: "none",
        confidence: "LOW",
        scope: "title_index"
      }
    }

    // Count hits per term (even if no matches, we report attempted search)
    const tokenHits: Record<string, number> = {}
    for (const token of queryTokens) {
      tokenHits[token] = this.tokenIndex[token]?.size ?? 0
    }

    // AND intersection: threads matching ALL query tokens
    let matchedThreadIds: Set<string> | null = null

    for (const token of queryTokens) {
      const threadIdsForToken = this.tokenIndex[token] ?? new Set()

      if (matchedThreadIds === null) {
        // First token: initialize with its threads
        matchedThreadIds = new Set(threadIdsForToken)
      } else {
        // Intersect: keep only threads in both sets
        matchedThreadIds = new Set(
          [...matchedThreadIds].filter(id => threadIdsForToken.has(id))
        )
      }
    }

    if (matchedThreadIds === null) {
      matchedThreadIds = new Set()
    }

    // Determine match type and confidence
    const matchCount = matchedThreadIds.size
    let matchType: "exact" | "partial" | "none"
    let confidence: "HIGH" | "MED" | "LOW"

    if (matchCount === 0) {
      matchType = "none"
      confidence = "MED" // We searched correctly but found nothing
    } else if (matchCount === 1) {
      matchType = "exact"
      confidence = "HIGH"
    } else {
      matchType = "partial"
      confidence = "HIGH"
    }

    return {
      queryTerms: query.split(" "),
      normalizedTerms: queryTokens,
      tokenHits,
      matchedThreadIds,
      matchCount,
      matchType,
      confidence,
      scope: "title_index"
    }
  }

  // ─────────────────────────────────────────────
  // FORMAT SEARCH REPORT
  // ─────────────────────────────────────────────

  formatSearchReport(operation: SearchOperation): SearchOperationReport {
    const results = Array.from(operation.matchedThreadIds)
      .map(threadId => {
        const thread = this.threadMap.get(threadId)
        return {
          threadId,
          title: thread?.title ?? "(unknown)"
        }
      })

    const nextStep =
      operation.matchCount > 0
        ? "Reply with the thread title to open it."
        : "Try different terms or 'list my threads' for complete list."

    return {
      searchScope: "title_index",
      queryTerms: operation.queryTerms,
      normalizedTerms: operation.normalizedTerms,
      tokenHits: operation.tokenHits,
      matchSummary: {
        matchCount: operation.matchCount,
        matchType: operation.matchType,
        confidence: operation.confidence
      },
      results,
      nextStep
    }
  }

  // ─────────────────────────────────────────────
  // LIST ALL THREADS (NO FILTERING)
  // ─────────────────────────────────────────────

  listAll(): Array<{ threadId: string; title: string }> {
    return Array.from(this.threadMap.values()).map(thread => ({
      threadId: thread.id,
      title: thread.title
    }))
  }

  // ─────────────────────────────────────────────
  // INDEX HEALTH
  // ─────────────────────────────────────────────

  getIndexHealth() {
    const distinctTokens = Object.keys(this.tokenIndex).length
    const totalThreadsIndexed = this.threadMap.size

    let totalTokenRows = 0
    for (const token in this.tokenIndex) {
      totalTokenRows += this.tokenIndex[token].size
    }

    return {
      distinct_tokens: distinctTokens,
      total_threads_indexed: totalThreadsIndexed,
      total_token_rows: totalTokenRows,
      index_size_estimate_bytes: JSON.stringify(this.tokenIndex).length
    }
  }

  // ─────────────────────────────────────────────
  // UPDATE THREAD (FOR INCREMENTAL UPDATES)
  // ─────────────────────────────────────────────

  updateThread(thread: Thread): void {
    // Remove old tokens for this thread
    for (const token in this.tokenIndex) {
      this.tokenIndex[token].delete(thread.id)
      if (this.tokenIndex[token].size === 0) {
        delete this.tokenIndex[token]
      }
    }

    // Re-index the thread
    this.threadMap.set(thread.id, thread)

    const normalized = normalizeText(thread.title)
    const tokens = extractTokens(normalized)

    for (const token of tokens) {
      if (!this.tokenIndex[token]) {
        this.tokenIndex[token] = new Set()
      }
      this.tokenIndex[token].add(thread.id)
    }
  }
}