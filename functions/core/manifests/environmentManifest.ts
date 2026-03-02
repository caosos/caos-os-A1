
// LOCK_SIGNATURE: CAOS_ENVIRONMENT_LAYER_v1_2026-03-01
// STATIC — NO DYNAMIC FIELDS — NO FUNCTION CALLS — NO TIMESTAMPS
// Regenerate only when architecture changes.

export const ENVIRONMENT_MANIFEST_V1 = `
CAOS_ENVIRONMENT_MANIFEST_v1_2026-03-01
ROOT: CAOS

RUNTIME:
- Platform: Base44
- Backend Runtime: Deno
- Frontend Framework: React
- Frontend Build Tool: Vite
- Inference Provider: OpenAI
- Active Model: gpt-5.2
- Token Limit: 200000

BACKEND FUNCTIONS (active):
- hybridMessage: primary pipeline spine (AUTH→PROFILE_LOAD→MEMORY_WRITE→HISTORY_LOAD→HEURISTICS→PROMPT_BUILD→OPENAI_CALL→MESSAGE_SAVE→RESPONSE_BUILD)
- simpleMessage: alternate lightweight message path
- textToSpeech: voice output (Google TTS)
- transcribeAudio: voice input (STT with chunking)
- generateThreadSummary: summarizes past conversation threads
- systemHealth: runtime health check endpoint
- core/memoryEngine: memory save/recall/detect
- core/heuristicsEngine: intent + DCS + directive
- core/receiptWriter: DiagnosticReceipt + SessionContext
- core/errorEnvelopeWriter: ODEL v1 error persistence

DOCUMENTED BUT NOT DEPLOYED:
- CAOS Python backend blueprint (FastAPI + SQLite) — architecture reference only, not in active runtime

GOVERNANCE:
- Authority Domain Separation: LOCKED
- Pull-Only Awareness: LOCKED
- hybridMessage Spine: LOCKED_v2
- Phase A Memory: LOCKED
- Heuristics Engine v1: LOCKED
- Anchor Auto-Extraction: DISABLED

OBSERVABILITY:
- Error Envelope Writer: ACTIVE
- Receipt Writer: ACTIVE
- WCW Budgeting: ACTIVE
- Stage Tracking: ACTIVE
`;
