// LOCK_SIGNATURE: CAOS_SELF_DESCRIBE_v1_2026-03-02
// MODULE: core/selfDescribe
// PURPOSE: Single source of truth for runtime self-description.
// DO NOT pull from LLM. DO NOT parse manifests. HARDCODED from known deployment config.
// Returns structured object + preformatted kv_lines string for direct prompt injection.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const RUNTIME_FACTS = {
    model_name: "gpt-5.2",
    token_limit: 200000,
    platform_name: "CAOS",
    hosting_platform: "Base44",
    backend_runtime: "Deno",
    frontend_framework: "React",
    inference_provider: "OpenAI",
    web_search_enabled: true,
    file_read_enabled: true,
    image_parse_enabled: true,
    tts_enabled: true,
    email_enabled: true,
    self_modification: "DISABLED",
    autonomous_tool_execution: "DISABLED",
    learning_mode: "EXPLICIT_ONLY",
    background: "animated_starfield_canvas",
    header: "fixed_top_bar",
    thread_list: "slide_in_sidebar_left",
    profile_panel: "slide_in_sidebar_right",
    input_bar: "fixed_bottom",
    token_meter: "top_right_header_wcw_bar",
    execution_receipt: "expandable_per_assistant_message",
};

const kv_lines = Object.entries(RUNTIME_FACTS)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return Response.json({ ...RUNTIME_FACTS, kv_lines });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});