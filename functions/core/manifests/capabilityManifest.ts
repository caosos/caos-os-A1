
// LOCK_SIGNATURE: CAOS_CAPABILITY_MANIFEST_v1_2026-03-01
// STATIC — NO DYNAMIC FIELDS — NO FUNCTION CALLS — NO TIMESTAMPS
// Regenerate only when capabilities change.

// Full descriptive manifest — for documentation and introspection only. NOT injected into systemPrompt.
export const CAPABILITY_MANIFEST_V1 = `
CAOS_CAPABILITY_MANIFEST_v1_2026-03-01

MACHINE_READABLE:
web_search_enabled=false
file_read_enabled=true
image_parse_enabled=false
pdf_generation_enabled=false
tts_enabled=true
email_enabled=true
calendar_enabled=false
sensor_registry_available=false
persona=Aria
platform_name=CAOS
self_modification=DISABLED
autonomous_tool_execution=DISABLED
learning_mode=EXPLICIT_ONLY

TOOLING CAPABILITIES:
- web_search_enabled: false
- file_read_enabled: true
- image_parse_enabled: false
- pdf_generation_enabled: false
- tts_enabled: true
- email_enabled: true
- calendar_enabled: false
- sensor_registry_available: false

IDENTITY:
- Persona: Aria
- Platform: CAOS
- Self-modification: DISABLED
- Autonomous tool execution: DISABLED
- Learning Mode: EXPLICIT_ONLY
`;

// LOCK_SIGNATURE: CAOS_CAPABILITY_AUTHORITY_v1_2026-03-02
// MACHINE AUTHORITY BLOCK — NO PROSE — NO DUPLICATES — NO BULLETS
// THIS is what gets injected into systemPrompt. Nothing else.
export const CAPABILITY_MANIFEST_AUTHORITY = `
=== CAOS_CAPABILITY_AUTHORITY_BEGIN ===
web_search_enabled=false
file_read_enabled=true
image_parse_enabled=false
pdf_generation_enabled=false
tts_enabled=true
email_enabled=true
calendar_enabled=false
sensor_registry_available=false
self_modification=DISABLED
autonomous_tool_execution=DISABLED
learning_mode=EXPLICIT_ONLY
=== CAOS_CAPABILITY_AUTHORITY_END ===
`;
