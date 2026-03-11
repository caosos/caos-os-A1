// MODULE: core/runtimeAuthority
// LOCK_SIGNATURE: CAOS_RUNTIME_AUTHORITY_v2_2026-03-05
// PURPOSE: Single canonical source of truth for all runtime configuration.
// CONSUMERS: promptBuilder, systemSnapshot, wcwMeasure
// CHANGE LOG: v2 — expanded capability declarations (all tools explicit + open)

export const RUNTIME_AUTHORITY = {
  build_id: "CAOS_RUNTIME_AUTHORITY_v2_2026-03-05",
  runtime: {
    model_name: "gpt-5.2",
    token_limit: 200000,
    platform_name: "CAOS",
    hosting_platform: "Base44",
    backend_runtime: "Deno",
    frontend_framework: "React",
    inference_provider: "OpenAI"
  },
  capabilities: {
    // ── Core inference ────────────────────────────────────────────────────────
    inference_enabled:    true,
    web_search_enabled:   true,
    web_search_trigger:   "NEEDS_BASED_AUTOMATIC_OR_EXPLICIT",
    web_search_provider:  "gemini_3_flash_via_base44",

    // ── File operations ───────────────────────────────────────────────────────
    file_read_enabled:    true,
    file_write_enabled:   true,
    file_read_trigger:    "USER_EXPLICIT",
    file_write_trigger:   "USER_EXPLICIT",

    // ── Vision / image ────────────────────────────────────────────────────────
    image_parse_enabled:  true,   // analyze user-attached images
    image_gen_enabled:    true,   // generate images on request

    // ── Code execution ────────────────────────────────────────────────────────
    python_enabled:       true,   // Python code generation and execution assistance

    // ── Voice / TTS ───────────────────────────────────────────────────────────
    tts_enabled:          true,
    stt_enabled:          true,

    // ── Memory ────────────────────────────────────────────────────────────────
    memory_enabled:       true,
    memory_mode:          "EXPLICIT_SAVE_EXPLICIT_RECALL",
    memory_policy_gating: "ACTIVE",  // Phase A: user must trigger save explicitly

    // ── Policy / governance ───────────────────────────────────────────────────
    policy_gating:        "ACTIVE",
    context_limit:        200000
  },
  safeguards: {
    domain_allowlist:          true,
    max_request_timeout_ms:    300000,
    max_response_size_bytes:   5242880,
    no_javascript_execution:   true,
    no_ssrf:                   true
  }
};

// ── KV LINE GENERATOR ────────────────────────────────────────────────────────
// Returns the canonical flat KV block injected into every system prompt.
// This is the authoritative source — hybridMessage and promptBuilder both use this.
export function buildAuthorityKV() {
  const r = RUNTIME_AUTHORITY;
  const c = r.capabilities;
  return [
    `model_name=${r.runtime.model_name}`,
    `token_limit=${r.runtime.token_limit}`,
    `platform_name=${r.runtime.platform_name}`,
    `hosting_platform=${r.runtime.hosting_platform}`,
    `backend_runtime=${r.runtime.backend_runtime}`,
    `frontend_framework=${r.runtime.frontend_framework}`,
    `inference_provider=${r.runtime.inference_provider}`,
    `inference_enabled=${c.inference_enabled}`,
    `web_search_enabled=${c.web_search_enabled}`,
    `web_search_trigger=${c.web_search_trigger}`,
    `web_search_provider=${c.web_search_provider}`,
    `file_read_enabled=${c.file_read_enabled}`,
    `file_write_enabled=${c.file_write_enabled}`,
    `image_parse_enabled=${c.image_parse_enabled}`,
    `image_gen_enabled=${c.image_gen_enabled}`,
    `python_enabled=${c.python_enabled}`,
    `tts_enabled=${c.tts_enabled}`,
    `stt_enabled=${c.stt_enabled}`,
    `memory_enabled=${c.memory_enabled}`,
    `memory_mode=${c.memory_mode}`,
    `memory_policy_gating=${c.memory_policy_gating}`,
    `policy_gating=${c.policy_gating}`,
    `context_limit=${c.context_limit}`,
  ].join('\n');
}