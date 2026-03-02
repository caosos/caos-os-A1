// ============================================================
// RESTORE POINT — 2026-03-02 — BEFORE selfDescribe MODULE
// ============================================================
// Captured before implementing:
//   - functions/core/selfDescribe.js (new module)
//   - FILE_READ_TEST probe in hybridMessage
//   - CAOS_AUTHORITY_KV_BEGIN injection via selfDescribe
//   - AUDIT_BUILD / AUDIT_SYSTEM probes
//
// STATE AT THIS POINT:
//   - hybridMessage.ts: CAOS RUNTIME FACTS block injected inline (flat KV, no delimiters)
//   - SELF-DESCRIPTION RULE present but model still returning not_present_in_manifest
//   - BUILD_ID and AUDIT_PROBE (boolean flags) added in previous session
//   - selfDescribe module: NOT YET CREATED
//   - compressHistory summary role: 'assistant' (CORRECT — no change needed)
//   - Manifest imports removed from hybridMessage (ENVIRONMENT, CAPABILITY, UI)
//   - All 3 authority manifest files intact and unmodified
//
// KEY FILES (exact state):
//   functions/hybridMessage.ts         — see file in codebase
//   functions/core/manifests/environmentManifest.js  — unchanged
//   functions/core/manifests/capabilityManifest.js   — unchanged
//   functions/core/manifests/uiManifest.js           — unchanged
//
// WHAT WAS NOT WORKING:
//   Model returning not_present_in_manifest for most keys
//   Root cause hypothesis: prompt injection confirmed via boolean flags,
//   but model not reliably reading/quoting from inline KV block
//   selfDescribe module (deterministic, hardcoded) not yet wired in
//
// TO RESTORE TO THIS STATE:
//   Revert functions/hybridMessage.ts to the version below this marker.
//   Delete functions/core/selfDescribe.js if it was created.
//
// ============================================================
// hybridMessage.ts FULL CONTENT AT THIS RESTORE POINT:
// ============================================================
/*
/**
 * hybridMessage — CAOS Primary Pipeline
 * CONTRACT v2 — 2026-03-01
 * LOCK_SIGNATURE: CAOS_HYBRID_MESSAGE_SPINE_v2_2026-03-01
 *
 * THIS FILE IS THE SPINE. IT ORCHESTRATES. IT DOES NOT IMPLEMENT.
 * All logic lives in contracted modules:
 *   - functions/core/memoryEngine     (Phase A: save/recall)
 *   - functions/core/heuristicsEngine (intent, DCS, directive)
 *   - functions/core/receiptWriter    (DiagnosticReceipt + SessionContext)
 *   - functions/core/errorEnvelopeWriter (ODEL v1 error persistence)
 *
 * PIPELINE STAGES (in order):
 *   AUTH → PROFILE_LOAD → MEMORY_WRITE → HISTORY_LOAD →
 *   HEURISTICS → PROMPT_BUILD → OPENAI_CALL → MESSAGE_SAVE → RESPONSE_BUILD
 *
 * INVARIANTS (do not change without TSB + new lock):
 *   - SESSION_RESUME sentinel → noop, no AI call, no message saved
 *   - Memory save → returns immediately, bypasses inference
 *   - Receipt write is AWAITED (I2) — no fire-and-forget
 *   - body and user hoisted above try{} so catch block has full context
 *   - Active model: gpt-5.2
 *   - compressHistory: HOT_HEAD=15, HOT_TAIL=40
 *
 *  (full source preserved in functions/hybridMessage.ts in the live codebase)
 */
*/
// ============================================================
// END RESTORE POINT
// ============================================================