import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { RUNTIME_AUTHORITY } from './runtimeAuthority.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { include = {} } = body;

        const ts_iso = new Date().toISOString();
        const request_id = crypto.randomUUID();
        const correlation_id = crypto.randomUUID();

        let ssx = {};
        let kv_lines = [];

        ssx.build_id = RUNTIME_AUTHORITY.build_id;

        if (include.runtime) {
            ssx.runtime = RUNTIME_AUTHORITY.runtime;
            Object.entries(ssx.runtime).forEach(([key, value]) => kv_lines.push(`${key}=${value}`));
        }

        if (include.tooling) {
            ssx.tooling = {
                web_search: RUNTIME_AUTHORITY.capabilities.web_search,
                file_read: RUNTIME_AUTHORITY.capabilities.file_read,
                file_write: RUNTIME_AUTHORITY.capabilities.file_write,
                vision: RUNTIME_AUTHORITY.capabilities.vision,
                tts: RUNTIME_AUTHORITY.capabilities.tts
            };
        }

        if (include.governance) {
            ssx.governance = {
                learning_mode: RUNTIME_AUTHORITY.capabilities.learning_mode,
                autonomous_tool_execution: false,
                self_modification: false,
                anchor_auto_extraction: false,
                hybrid_spine_lock: "CAOS_HYBRID_MESSAGE_SPINE_v2_2026-03-01"
            };
            Object.entries(ssx.governance).forEach(([key, value]) => kv_lines.push(`${key}=${value}`));
        }

        if (include.ui) {
            ssx.ui = {
                background: "animated_starfield_canvas",
                header: "fixed_top_bar",
                thread_list: "slide_in_sidebar_left",
                profile_panel: "slide_in_sidebar_right",
                chat_area: "scrollable_centered_max_width_2xl",
                input_bar: "fixed_bottom",
                token_meter: "top_right_header_wcw_bar",
                execution_receipt: "expandable_per_assistant_message",
                developer_mode: "resizable_split_chat_left_terminal_right",
                game_mode: "resizable_split_chat_left_gameview_right",
                multi_agent_mode: "agent_chips_above_input_blackboard_below",
                pages: ["Welcome", "Chat", "Admin", "Console", "Implementation", "MemoryIsolation", "SystemBlueprint", "News", "Logs"]
            };
        }

        if (include.routes) {
            ssx.routes = [
                { name: "hybridMessage", enabled: true },
                { name: "simpleMessage", enabled: true },
                { name: "textToSpeech", enabled: true },
                { name: "transcribeAudio", enabled: true },
                { name: "core/systemSnapshot", enabled: true },
                { name: "core/logsTail", enabled: true },
                { name: "core/systemStateIndex", enabled: true },
                { name: "core/systemStateDiff", enabled: true }
            ];
        }

        if (include.invoke_targets) {
            ssx.invoke_targets = [
                "core/memoryEngine",
                "core/heuristicsEngine",
                "core/receiptWriter",
                "core/errorEnvelopeWriter"
            ];
        }

        if (include.protected_files) {
            ssx.protected_files = [
                "functions/hybridMessage.ts",
                "functions/core/promptBuilder.js",
                "functions/core/systemSnapshot.js",
                "functions/core/logsTail.js",
                "functions/core/routesList.js",
                "functions/core/uiPages.js",
                "functions/core/wcwMeasure.js",
                "functions/core/repoRead.js",
                "docs/PROTECTED_FILES.json",
                "pages/SystemBlueprint.jsx"
            ];
        }

        const ssxContentString = JSON.stringify(ssx);
        const encoder = new TextEncoder();
        const data = encoder.encode(ssxContentString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const ssx_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        ssx.system_state_hash = `sha256:${ssx_hash}`;

        const kv_authority_order = [
            "model_name", "token_limit", "platform_name", "hosting_platform",
            "backend_runtime", "frontend_framework", "inference_provider",
            "web_search_enabled", "file_read_enabled", "tts_enabled", "learning_mode"
        ];

        const final_kv_lines = kv_authority_order.map(key => {
            if (ssx.runtime && ssx.runtime[key] !== undefined) {
                return `${key}=${ssx.runtime[key]}`;
            }
            if (ssx.tooling && ssx.tooling[key] !== undefined) {
                return `${key}=${ssx.tooling[key]}`;
            }
            if (ssx.governance && ssx.governance[key] !== undefined) {
                return `${key}=${ssx.governance[key]}`;
            }
            return `${key}=not_present_in_manifest`;
        });

        const payloadString = JSON.stringify({ ssx, kv_authority: { order: kv_authority_order, lines: final_kv_lines } });
        const payloadData = encoder.encode(payloadString);
        const payloadHashBuffer = await crypto.subtle.digest('SHA-256', payloadData);
        const payloadHashArray = Array.from(new Uint8Array(payloadHashBuffer));
        const payloadHash = payloadHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const responsePayload = {
            request_id,
            correlation_id,
            tool_name: "system.snapshot",
            tool_version: "SSX_v1_2026-03-02",
            ts_iso,
            source: "server_runtime",
            hash: `sha256:${payloadHash}`,
            ssx,
            kv_authority: {
                order: kv_authority_order,
                lines: final_kv_lines
            }
        };

        return Response.json(responsePayload);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});