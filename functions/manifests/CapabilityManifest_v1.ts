{
  "manifest_version": "CAOS_CAPABILITY_MANIFEST_v1_2026-03-01",
  "root": "CAOS",

  "runtime": {
    "platform": "Base44",
    "backend_runtime": "Deno",
    "frontend_framework": "React",
    "frontend_build_system": "Vite",
    "inference_provider": "OpenAI",
    "active_model": "gpt-5.2",
    "token_limit": 200000
  },

  "governance": {
    "authority_domain_separation": "LOCKED",
    "pull_only_awareness": "LOCKED",
    "hybrid_message_spine": "LOCKED_v2",
    "phase_a_memory": "LOCKED",
    "heuristics_engine_v1": "LOCKED",
    "anchor_auto_extraction": "DISABLED"
  },

  "observability": {
    "error_envelope_writer": true,
    "receipt_writer": true,
    "wcw_budgeting": true,
    "stage_tracking": true,
    "latency_tracking": true
  },

  "frontend_structure": {
    "pages": [
      "Welcome",
      "Chat",
      "Admin",
      "Console",
      "Implementation",
      "MemoryIsolation",
      "SystemBlueprint",
      "News"
    ],
    "major_components": [
      "ChatInput",
      "ChatBubble",
      "ExecutionReceipt",
      "WCWMonitor",
      "PipelineVisualizer"
    ],
    "large_files_flagged_for_refactor": [
      "pages/Chat",
      "components/chat/ChatInput"
    ]
  },

  "entities_available": [
    "Conversation",
    "Message",
    "UserProfile",
    "UserFile",
    "ErrorLog",
    "DiagnosticReceipt",
    "SessionContext",
    "ThreadSnapshot",
    "ThreadMemory",
    "LearnedFact",
    "SelectorDecision",
    "Record"
  ],

  "backend_functions": {
    "primary_pipeline": "hybridMessage",
    "available": [
      "simpleMessage",
      "textToSpeech",
      "transcribeAudio",
      "systemHealth",
      "diagnostics",
      "grokProvider"
    ],
    "core_modules": [
      "memoryEngine",
      "heuristicsEngine",
      "receiptWriter",
      "errorEnvelopeWriter",
      "capabilityAwareness",
      "unifiedGovernanceGate"
    ]
  },

  "tooling_capabilities": {
    "web_search_enabled": false,
    "file_read_enabled": true,
    "image_parse_enabled": false,
    "pdf_generation_enabled": false,
    "tts_enabled": true,
    "email_enabled": true,
    "calendar_enabled": false,
    "sensor_registry_available": false
  },

  "explicitly_not_present": [
    "Google Calendar connector",
    "Live sensor ingestion layer",
    "Web search executor exposed to user",
    "PDF rendering engine",
    "Image parsing pipeline",
    "Autonomous background mutation",
    "Silent memory writes"
  ],

  "identity": {
    "persona_name": "Aria",
    "platform_name": "CAOS",
    "self_modification_allowed": false,
    "autonomous_tool_execution": false,
    "learning_mode": "EXPLICIT_ONLY"
  }
}