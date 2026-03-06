// errorClassifier.js — Pure utility, no React, no side effects.
// TSB entry: RSoD-001 (2026-03-06) — Classify pipeline errors for RSoD vs inline display.
// NEVER serialize request bodies, base64 blobs, or execution_receipt_full here.

const BLOCKING_CODES = new Set(['SERVER_ERROR', 'UPSTREAM_UNAVAILABLE', 'PAYLOAD_TOO_LARGE']);

/**
 * classifyError(err, response)
 * @param {Error|null} err - thrown JS error (network failure, JSON parse failure, etc.)
 * @param {object|null} response - Axios response object from base44.functions.invoke
 * @returns {{ blocking: boolean, error_code: string, stage: string, error_id: string|null, public_message: string }}
 */
export function classifyError(err, response) {
  // Case 1: Network / fetch error (no response at all)
  if (!response && err) {
    return {
      blocking: true,
      error_code: 'NETWORK_ERROR',
      stage: 'network',
      error_id: null,
      public_message: 'Network error — the server could not be reached.',
    };
  }

  // Case 2: Non-JSON / HTML response (e.g. Deno 500 HTML page)
  if (response && typeof response.data === 'string') {
    return {
      blocking: true,
      error_code: 'SERVER_ERROR',
      stage: 'unknown',
      error_id: null,
      public_message: 'Server returned an unexpected response. Please retry.',
    };
  }

  const status = response?.status ?? 0;
  const data = response?.data ?? {};
  const error_code = data.error_code || (status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN_ERROR');
  const stage = data.stage || (err?.message?.includes('timeout') ? 'timeout' : 'unknown');
  const error_id = data.error_id || null;

  // Case 3: HTTP 5xx → always blocking
  if (status >= 500) {
    return {
      blocking: true,
      error_code,
      stage,
      error_id,
      public_message: data.reply || 'A server error occurred. Your session is intact.',
    };
  }

  // Case 4: Structured ODEL error with blocking code
  if (BLOCKING_CODES.has(error_code)) {
    return {
      blocking: true,
      error_code,
      stage,
      error_id,
      public_message: data.reply || 'A critical error occurred.',
    };
  }

  // Case 5: Tool/validation error — non-blocking, render inline
  return {
    blocking: false,
    error_code,
    stage,
    error_id,
    public_message: data.reply || 'Something went wrong.',
  };
}