/**
 * CAOS:INDEX.PERSISTENTSEARCH/v1.0
 * 
 * Database-backed search executor
 * Replaces in-memory stub
 * Index-only lookups, no full scans
 */

import { normalizeText, extractTokens } from "./tokenizer.ts"

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

export interface DBSearchOperation {
  queryTerms: string[]
  normalizedTerms: string[]
  tokenHits: Record<string, number>
  matchedThreadIds: string[]
  matchCount: number
  matchType: "exact" | "partial" | "none"
  confidence: "HIGH" | "MED" | "LOW"
  scope: "title_index"
  dbQueryTime_ms: number
}

export interface DBSearchOperationReport {
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
// PERSISTENT SEARCH ENGINE
// ─────────────────────────────────────────────

export class PersistentSearchEngine {
  constructor(private base44: any) {}

  // ─────────────────────────────────────────────
  // SEARCH: INDEX-BACKED ONLY
  // ─────────────────────────────────────────────

  async search(query: string): Promise<DBSearchOperation> {
    const queryStartTime = Date.now()

    // Normalize and extract tokens from query
    const normalizedQuery = normalizeText(query)
    const queryTokens = extractTokens(normalizedQuery)

    if (queryTokens.length === 0) {
      return {
        queryTerms: query.split(" "),
        normalizedTerms: [],
        tokenHits: {},
        matchedThreadIds: [],
        matchCount: 0,
        matchType: "none",
        confidence: "LOW",
        scope: "title_index",
        dbQueryTime_ms: Date.now() - queryStartTime
      }
    }

    // For each token, query the index
    const tokenHits: Record<string, number> = {}
    const matchedThreadIdSets: Set<string>[] = []

    for (const token of queryTokens) {
      const tokenRows = await this.base44.asServiceRole.entities.ThreadToken.filter(
        { token, source: "title", token_version: 1 },
        undefined,
        1000
      )

      tokenHits[token] = tokenRows.length

      // Collect thread IDs for this token
      const threadIds = new Set(tokenRows.map((row: any) => row.thread_id))
      matchedThreadIdSets.push(threadIds)
    }

    // AND intersection: threads matching ALL tokens
    let matchedThreadIds: Set<string> = new Set()

    if (matchedThreadIdSets.length > 0) {
      matchedThreadIds = matchedThreadIdSets[0]

      for (let i = 1; i < matchedThreadIdSets.length; i++) {
        matchedThreadIds = new Set(
          [...matchedThreadIds].filter(id => matchedThreadIdSets[i].has(id))
        )
      }
    }

    // Determine match type and confidence
    const matchCount = matchedThreadIds.size
    let matchType: "exact" | "partial" | "none"
    let confidence: "HIGH" | "MED" | "LOW"

    if (matchCount === 0) {
      matchType = "none"
      confidence = "MED" // Searched correctly but found nothing
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
      matchedThreadIds: Array.from(matchedThreadIds),
      matchCount,
      matchType,
      confidence,
      scope: "title_index",
      dbQueryTime_ms: Date.now() - queryStartTime
    }
  }

  // ─────────────────────────────────────────────
  // FORMAT SEARCH REPORT
  // ─────────────────────────────────────────────

  async formatSearchReport(operation: DBSearchOperation): Promise<DBSearchOperationReport> {
    // Fetch thread titles for matched IDs
    const results: Array<{ threadId: string; title: string }> = []

    if (operation.matchedThreadIds.length > 0) {
      const threads = await this.base44.asServiceRole.entities.Conversation.filter(
        { id: { $in: operation.matchedThreadIds } },
        undefined,
        1000
      )

      results.push(
        ...threads.map((thread: any) => ({
          threadId: thread.id,
          title: thread.title || "(untitled)"
        }))
      )
    }

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
  // LIST ALL THREADS (UNFILTERED)
  // ─────────────────────────────────────────────

  async listAll(): Promise<Array<{ threadId: string; title: string }>> {
    const threads = await this.base44.asServiceRole.entities.Conversation.filter(
      {},
      "-updated_date",
      1000
    )

    return threads.map((thread: any) => ({
      threadId: thread.id,
      title: thread.title || "(untitled)"
    }))
  }

  // ─────────────────────────────────────────────
  // INDEX HEALTH CHECK
  // ─────────────────────────────────────────────

  async getIndexHealth(): Promise<{
    distinctTokens: number
    totalThreadsIndexed: number
    totalTokenRows: number
    lastUpdated: string | null
  }> {
    const allTokens = await this.base44.asServiceRole.entities.ThreadToken.filter(
      { source: "title" },
      undefined,
      100000
    )

    const allMeta = await this.base44.asServiceRole.entities.ThreadTokenMeta.filter(
      {},
      "-updated_at",
      1
    )

    const distinctTokens = new Set(allTokens.map((t: any) => t.token)).size
    const totalThreadsIndexed = new Set(allTokens.map((t: any) => t.thread_id)).size

    return {
      distinctTokens,
      totalThreadsIndexed,
      totalTokenRows: allTokens.length,
      lastUpdated: allMeta.length > 0 ? allMeta[0].updated_at : null
    }
  }
}