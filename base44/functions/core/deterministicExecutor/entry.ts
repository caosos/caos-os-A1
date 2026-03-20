/**
 * CAOS:EXECUTOR.DETERMINISTIC/v1.0
 * 
 * Unified execution: LIST_THREADS vs SEARCH_THREADS (index-backed)
 * NO fallbacks. NO LLM. NO interpretation.
 * HARD FAIL states explicit.
 */

import { IndexedThreadSearchEngine, Thread, SearchOperationReport } from "./indexedSearch.ts"

// ─────────────────────────────────────────────
// EXECUTION RESULT TYPES
// ─────────────────────────────────────────────

export interface ExecutionResult {
  type: "LIST_THREADS" | "SEARCH_THREADS"
  valid: boolean
  errorReason?: string
  matchCount?: number
  results?: Array<{ threadId: string; title: string }>
  report?: SearchOperationReport
  indexHealth?: any
}

// ─────────────────────────────────────────────
// EXECUTOR CLASS (STATEFUL ENGINE)
// ─────────────────────────────────────────────

export class DeterministicExecutor {
  private searchEngine: IndexedThreadSearchEngine

  constructor(threads: Thread[] = []) {
    this.searchEngine = new IndexedThreadSearchEngine(threads)
  }

  // ─────────────────────────────────────────────
  // EXECUTE: LIST_THREADS
  // ─────────────────────────────────────────────

  executeListThreads(): ExecutionResult {
    const results = this.searchEngine.listAll()

    return {
      type: "LIST_THREADS",
      valid: true,
      matchCount: results.length,
      results,
      indexHealth: this.searchEngine.getIndexHealth()
    }
  }

  // ─────────────────────────────────────────────
  // EXECUTE: SEARCH_THREADS
  // ─────────────────────────────────────────────

  executeSearchThreads(query: string): ExecutionResult {
    if (!query || query.trim().length === 0) {
      return {
        type: "SEARCH_THREADS",
        valid: false,
        errorReason: "EMPTY_QUERY"
      }
    }

    const operation = this.searchEngine.search(query)

    // HARD FAIL: SEARCH_THREADS with zero normalized terms
    if (operation.normalizedTerms.length === 0) {
      return {
        type: "SEARCH_THREADS",
        valid: false,
        errorReason: "SEARCH_REQUIRES_TOPICS"
      }
    }

    const report = this.searchEngine.formatSearchReport(operation)

    return {
      type: "SEARCH_THREADS",
      valid: true,
      matchCount: operation.matchCount,
      results: report.results,
      report,
      indexHealth: this.searchEngine.getIndexHealth()
    }
  }

  // ─────────────────────────────────────────────
  // UPDATE THREAD (INCREMENTAL)
  // ─────────────────────────────────────────────

  updateThread(thread: Thread): void {
    this.searchEngine.updateThread(thread)
  }

  // ─────────────────────────────────────────────
  // BULK REBUILD (ADMIN)
  // ─────────────────────────────────────────────

  rebuild(threads: Thread[]): { success: boolean; threadsIndexed: number } {
    // Private method of search engine handles the reset
    this.searchEngine = new IndexedThreadSearchEngine(threads)
    return {
      success: true,
      threadsIndexed: threads.length
    }
  }
}

// ─────────────────────────────────────────────
// GLOBAL INSTANCE (SINGLETON)
// ─────────────────────────────────────────────

let globalExecutor: DeterministicExecutor | null = null

export function initializeGlobalExecutor(threads: Thread[]): DeterministicExecutor {
  globalExecutor = new DeterministicExecutor(threads)
  return globalExecutor
}

export function getGlobalExecutor(): DeterministicExecutor {
  if (!globalExecutor) {
    globalExecutor = new DeterministicExecutor()
  }
  return globalExecutor
}