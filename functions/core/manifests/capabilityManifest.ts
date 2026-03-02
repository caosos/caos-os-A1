// LOCK_SIGNATURE: CAOS_ENVIRONMENT_LAYER_v1_2026-03-01
// STATIC — NO DYNAMIC FIELDS — NO RUNTIME CALLS — REGENERATE MANUALLY ONLY

export const CAPABILITY_MANIFEST_V1 = `
CAOS_CAPABILITY_MANIFEST_v1_2026-03-01

TOOLING CAPABILITIES:
- web_search_enabled: false
- file_read_enabled: true (UserFile entity only)
- image_parse_enabled: false
- pdf_generation_enabled: false
- tts_enabled: true
- email_enabled: true (entity-level only)
- calendar_enabled: false
- sensor_registry_available: false

EXPLICITLY NOT PRESENT:
- Google Calendar connector
- Live sensor ingestion layer
- Web search executor exposed to user
- PDF rendering engine
- Image parsing pipeline
- Autonomous background mutation
- Silent memory writes

IDENTITY:
- Persona: Aria
- Platform: CAOS
- Self-modification: DISABLED
- Autonomous tool execution: DISABLED
- Learning Mode: EXPLICIT_ONLY
`;