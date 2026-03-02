// LOCK_SIGNATURE: CAOS_ENVIRONMENT_LAYER_v1_2026-03-01
// STATIC — NO DYNAMIC FIELDS — NO FUNCTION CALLS — NO TIMESTAMPS
// Regenerate only when architecture changes.

// Full descriptive manifest — for documentation and introspection only. NOT injected into systemPrompt.
export const ENVIRONMENT_MANIFEST_V1 = `
CAOS_ENVIRONMENT_MANIFEST_v1_2026-03-01
ROOT: CAOS

MACHINE_READABLE:
model_name=gpt-5.2
token_limit=200000
platform_name=CAOS
hosting_platform=Base44
backend_runtime=Deno
frontend_framework=React
frontend_build_tool=Vite
inference_provider=OpenAI

BACKEND FUNCTIONS (active):
- hybridMessage: primary pipeline spine (AUTH→PROFILE_LOAD→MEMORY_WRITE→HISTORY_LOAD→HEURISTICS→PROMPT_BUILD→OPENAI_CALL→MESSAGE_SAVE→RESPONSE_BUILD)
- simpleMessage: alternate lightweight message path
- textToSpeech: voice output (OpenAI TTS tts-1-hd)
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

// LOCK_SIGNATURE: CAOS_ENVIRONMENT_AUTHORITY_v1_2026-03-02
// MACHINE AUTHORITY BLOCK — NO PROSE — NO DUPLICATES — NO BULLETS
// THIS is what gets injected into systemPrompt. Nothing else.
export const ENVIRONMENT_MANIFEST_AUTHORITY = `
=== CAOS_ENVIRONMENT_AUTHORITY_BEGIN ===
model_name=gpt-5.2
token_limit=200000
platform_name=CAOS
hosting_platform=Base44
backend_runtime=Deno
frontend_framework=React
inference_provider=OpenAI
=== CAOS_ENVIRONMENT_AUTHORITY_END ===
`;