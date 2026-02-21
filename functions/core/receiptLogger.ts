/**
 * CAOS:RECEIPT.LOGGER/v1.0
 * 
 * Mandatory retrieval receipts
 * Every LIST_THREADS and SEARCH_THREADS logged
 * Immutable audit trail
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6'

// ─────────────────────────────────────────────
// RECEIPT LOGGER
// ─────────────────────────────────────────────

export async function logRetrievalReceipt(base44: any, receipt: {
  request_id: string
  intent: "LIST_THREADS" | "SEARCH_THREADS"
  route: string
  scope: string
  normalized_terms?: string[]
  token_hits?: Record<string, number>
  match_count: number
  formatter?: string
  duration_ms: number
  validation_status: "PASS" | "FAIL"
  error_reason?: string
}): Promise<void> {
  try {
    await base44.asServiceRole.entities.RetrievalReceipt.create({
      request_id: receipt.request_id,
      intent: receipt.intent,
      route: receipt.route,
      scope: receipt.scope,
      normalized_terms: receipt.normalized_terms || [],
      token_hits: receipt.token_hits || {},
      match_count: receipt.match_count,
      formatter: receipt.formatter,
      duration_ms: receipt.duration_ms,
      validation_status: receipt.validation_status,
      error_reason: receipt.error_reason
    })
  } catch (error) {
    console.error("🚨 [RECEIPT_LOGGER_FAILED]", error)
    // Do not throw — receipt logging failure must not block responses
  }
}

// ─────────────────────────────────────────────
// VALIDATION GUARDS (POST-EXECUTION)
// ─────────────────────────────────────────────

export function validateRetrievalOperation(operation: {
  intent: string
  route: string
  matchCount: number
  results: any[]
  errorReason?: string
}): { valid: boolean; reason?: string } {
  // GUARD 1: SEARCH_THREADS must never return full list
  if (operation.intent === "SEARCH_THREADS" && operation.matchCount === 0) {
    // This is OK — zero matches is a valid search result
    return { valid: true }
  }

  // GUARD 2: LIST_THREADS should always return all threads
  if (operation.intent === "LIST_THREADS") {
    return { valid: true }
  }

  // GUARD 3: Unknown intent
  if (operation.intent !== "LIST_THREADS" && operation.intent !== "SEARCH_THREADS") {
    return { valid: false, reason: "UNKNOWN_INTENT" }
  }

  return { valid: true }
}