export const RUNTIME_AUTHORITY = {
  build_id: "CAOS_RUNTIME_AUTHORITY_v1_2026-03-02",
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
    file_read: "USER_EXPLICIT_ONLY",
    file_write: "USER_EXPLICIT_ONLY",
    vision: "USER_PROVIDED_IMAGE_ONLY",
    web_search: {
      enabled: true,
      trigger: "NEEDS_BASED_AUTOMATIC",
      provider: "bing_api"
    },
    tts: true,
    learning_mode: "EXPLICIT_ONLY"
  },
  safeguards: {
    domain_allowlist: true,
    max_request_timeout_ms: 10000,
    max_response_size_bytes: 5242880,
    no_javascript_execution: true,
    no_ssrf: true
  }
};