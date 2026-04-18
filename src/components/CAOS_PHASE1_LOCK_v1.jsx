{
  "snapshot_id": "CAOS_PHASE1_LOCK_v1",
  "snapshot_date": "2026-02-28T00:00:00Z",
  "description": "Phase 1 completion checkpoint — Observability and Deterministic Error Control locked. Restore point before Phase 2 work.",
  "phase": "PHASE_1_LOCK",
  "restoration_instructions": "To restore: read each file_hash entry, compare SHA-256 of current file to 'expected_hash'. If mismatch, revert file content to restore snapshot backup. This is your ground truth.",
  "active_versions": {
    "hybridMessage": "v1.4 — Stage tracking + ODEL v1 + session context upsert",
    "heuristics_engine": "v1 — LOCKED",
    "memory_system": "Phase A LOCKED",
    "dcs_cognitive_scaling": "v1 — LOCKED",
    "error_envelope": "ODEL v1 deterministic",
    "platform": "Base44 React + Deno backend"
  },
  "invariants": {
    "no_background_memory_writes": true,
    "correlation_id_required": true,
    "receipt_write_in_band": true,
    "receipt_write_awaited_before_response": true,
    "file_max_lines": 400,
    "no_ui_layout_mutation": true,
    "no_cross_file_coupling": true,
    "no_silent_failures": true,
    "all_errors_structured": true
  },
  "controlled_files": [
    {
      "file": "functions/hybridMessage.js",
      "purpose": "Primary backend function — unified governance gate for all messages",
      "line_count": 929,
      "critical": true,
      "changes_this_phase": [
        "Added stage tracking: setStage(STAGES.*) throughout pipeline",
        "Implemented ODEL v1: buildDeterministicErrorEnvelope()",
        "Hoisted body/user declarations above try{} for catch access",
        "Added DiagnosticReceipt write (in-band, awaited)",
        "Added SessionContext upsert (wcw_budget, wcw_used, last_seq)",
        "Execution receipt now includes: cognitive_level, heuristics_intent, heuristics_depth, elevation_delta, token_breakdown",
        "Background anchor extraction still present (Phase 3.1 pending removal)"
      ],
      "entry_point": "Deno.serve(async (req) => {...})",
      "deployment_test": "call with valid session_id, verify execution_receipt in response contains request_id, correlation_id, heuristics_intent, heuristics_depth, cognitive_level",
      "critical_paths": [
        "AUTH → 401 if !user",
        "MEMORY_WRITE → if memory save trigger, returns immediately with MEMORY_SAVE mode",
        "HISTORY_LOAD → loads last 100 messages, compresses if needed",
        "HEURISTICS → classifyIntent + calibrateDepth (internal, never surfaced)",
        "OPENAI_CALL → gpt-5.2 at 2000 max_tokens",
        "RESPONSE_BUILD → builds receipt + sessioncontext, awaits write before return",
        "ERROR catch → ODEL envelope, persists to ErrorLog (service role), returns 500"
      ]
    },
    {
      "file": "pages/Chat.jsx",
      "purpose": "Main chat interface — message rendering, thread management, file upload, voice",
      "line_count": 646,
      "critical": true,
      "changes_this_phase": [
        "Updated error handling: check response.status !== 200, display error_id (admin visible)",
        "WCW state tracking: wcwState object with {used, budget} from execution_receipt",
        "No generic masking: error responses show real error content, not fallback text"
      ],
      "entry_point": "default export Chat component",
      "deployment_test": "Force error in hybridMessage (e.g., throw Error), verify Chat page displays error_id and structured error_code",
      "critical_paths": [
        "handleSendMessage() → calls base44.functions.invoke('hybridMessage', {...})",
        "Error handling: if !response or response.status !== 200 → show error + error_id",
        "Success path: update messages, conversation, display reply",
        "WCW display: Chat header shows TokenMeter with wcw_used/wcw_budget from receipt"
      ]
    },
    {
      "file": "pages/Admin.jsx",
      "purpose": "Admin dashboard — tabs for health, routes, wcw, stats, errors, pipeline",
      "line_count": 124,
      "critical": false,
      "changes_this_phase": [
        "Exists but not fully wired for Phase 1.3",
        "Phase 1.3 work: wire RecentErrors component to display ErrorLog envelopes with filtering/search"
      ],
      "entry_point": "default export AdminDashboard",
      "deployment_test": "Admin user navigates to /Admin, errors tab loads and displays error list",
      "critical_paths": [
        "Auth check: user.role === 'admin' required, else redirect to Chat",
        "Tabs: health, routes, wcw, stats, errors, pipeline",
        "errors tab → RecentErrors component"
      ]
    },
    {
      "file": "pages/Logs.jsx",
      "purpose": "Error logs viewer — displays ErrorLog entity records with filtering and search",
      "line_count": 262,
      "critical": true,
      "changes_this_phase": [
        "Admin-only access (user.role === 'admin')",
        "Displays ErrorLog records: error_id, error_code, stage, message, latency_ms, model_used, created_date",
        "Expandable rows: shows user_email, conversation_id, system_version, lost_message_content, stack_trace, request_payload",
        "Filters: by stage, error_code, search by error_id/message",
        "ODEL v1 badge for structured errors (has error_id)"
      ],
      "entry_point": "default export Logs",
      "deployment_test": "Admin user navigates to /Logs, errors load, click to expand, verify fields populate correctly",
      "critical_paths": [
        "fetchErrors() → base44.asServiceRole.entities.ErrorLog.filter({}, '-created_date', 100)",
        "Display error_id, error_code, stage tags, error_message, latency_ms, model_used",
        "Expanded view: user_email, conversation_id, lost_message_content, stack_trace, request_payload (JSON)",
        "Filters: stage dropdown, error_code dropdown, search input"
      ]
    },
    {
      "file": "pages/SystemBlueprint.jsx",
      "purpose": "Living architecture documentation — phases, memory, heuristics, TSB troubleshooting",
      "line_count": 804,
      "critical": false,
      "changes_this_phase": [
        "Updated: Phase 1 status to 'IN PROGRESS', items 1.3 and 1.4 marked PENDING",
        "TSB-008 added: Welcome page infinite loading (FIXED)",
        "Build sequence updated with exit conditions for Phase 1"
      ],
      "entry_point": "default export SystemBlueprint",
      "deployment_test": "User navigates to SystemBlueprint, sections load and expand, TSB list visible",
      "critical_paths": [
        "Section component: collapsible architecture docs",
        "Phase 1 section: shows stage tracker, ODEL v1, admin console, UI masking removal",
        "TSB entries: permanent record of issues and fixes"
      ]
    }
  ],
  "deployment_verification_checklist": [
    {
      "step": 1,
      "test_name": "hybridMessage executes successfully",
      "payload": {"input": "Test message", "session_id": "test_session_12345"},
      "verify": [
        "response.status === 200",
        "response.data.execution_receipt exists",
        "response.data.execution_receipt.request_id === uuid",
        "response.data.execution_receipt.correlation_id === uuid",
        "response.data.execution_receipt.heuristics_intent in ['MEMORY_ACTION', 'TECHNICAL_DESIGN', 'GENERAL_QUERY', ...]",
        "response.data.execution_receipt.heuristics_depth in ['COMPACT', 'STANDARD', 'LAYERED']",
        "response.data.execution_receipt.cognitive_level is number (0-10)",
        "response.data.execution_receipt.elevation_delta === 0.75"
      ]
    },
    {
      "step": 2,
      "test_name": "Error handling returns non-200 with ODEL envelope",
      "trigger": "Modify hybridMessage to throw Error('TEST_ERROR') at AUTH stage",
      "verify": [
        "response.status === 500",
        "response.data.error_id exists and is uuid",
        "response.data.error_code === 'SERVER_ERROR'",
        "response.data.stage in STAGES.*",
        "response.data.reply is public-safe (no error details)"
      ]
    },
    {
      "step": 3,
      "test_name": "ErrorLog receives error envelope",
      "query": "ErrorLog.filter({error_id: response.data.error_id})",
      "verify": [
        "record exists",
        "record.error_code === 'SERVER_ERROR'",
        "record.stage === envelope.stage",
        "record.model_used === 'gpt-5.2'",
        "record.latency_ms > 0"
      ]
    },
    {
      "step": 4,
      "test_name": "Admin can view error in Logs page",
      "action": "Admin user navigates to /Logs, searches by error_id from step 2",
      "verify": [
        "Error row displays",
        "ODEL v1 badge visible",
        "Stage badge shows correct stage",
        "Error code label displays",
        "Click expands row",
        "Expanded view shows error_id, stage, code, stack_trace, request_payload"
      ]
    },
    {
      "step": 5,
      "test_name": "Chat page handles error gracefully",
      "action": "Send message while hybridMessage is throwing errors",
      "verify": [
        "Error displayed to user",
        "error_id visible (admin only)",
        "No generic fallback message",
        "Retry option available",
        "Message saved in error log"
      ]
    }
  ],
  "what_must_not_change": [
    "Memory save is explicit only (no background auto-extraction)",
    "Execution receipt includes request_id, correlation_id, heuristics_intent, heuristics_depth, cognitive_level",
    "Error handling returns non-200 status with structured envelope",
    "Receipt writes are awaited before response returns (in-band, not fire-and-forget)",
    "No 200-status masking of errors",
    "Stage tracking on every major pipeline step",
    "SessionContext upsert on every request (wcw_budget, wcw_used, last_seq updated)"
  ],
  "phase_2_changes": [
    "Diagnostic context injection for self-diagnostic mode",
    "Model awareness of its own failures",
    "Version metadata exposure in execution_receipt"
  ],
  "phase_3_changes": [
    "Remove background auto-anchor extraction block (lines 820–843 in hybridMessage)",
    "Enforce explicit memory save triggers only",
    "Memory write receipt with idempotency protection"
  ],
  "integrity_check": {
    "method": "Compare current file content to snapshot",
    "trigger": "Before Phase 2 or Phase 3 work begins",
    "action_if_drift": "HALT, alert developer, show diffs for all controlled_files"
  },
  "locked": true,
  "approval_required_for_future_mutations": true,
  "mutation_protocol": "CAOS_MUTATION_PROTOCOL_v1"
}