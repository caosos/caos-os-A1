// LOCK_SIGNATURE: CAOS_SYSTEM_STATE_INDEX_v1_2026-03-02
// Deterministic runtime state generator.
// No LLM. No prompt parsing. No inference.

import { createHash } from "https://deno.land/std@0.224.0/hash/mod.ts";
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUILD_ID = "CAOS_BUILD_2026-03-02_SSX_V1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const state = {
      build_id: BUILD_ID,

      runtime: {
        model_name: "gpt-4o",
        token_limit: 200000,
        platform_name: "CAOS",
        hosting_platform: "Base44",
        backend_runtime: "Deno",
        frontend_framework: "React",
        inference_provider: "OpenAI",
      },

      tooling: {
        web_search_enabled: false,
        file_read_enabled: true,
        tts_enabled: true,
      },

      governance: {
        learning_mode: "EXPLICIT_ONLY",
        anchor_auto_extraction: false,
        hybrid_spine_lock: "CAOS_HYBRID_MESSAGE_SPINE_v2_2026-03-01",
      },

      protected_files: [
        "functions/hybridMessage.js",
        "functions/core/systemStateIndex.js",
        "functions/core/systemStateDiff.js",
        "docs/PROTECTED_FILES.json",
        "pages/SystemBlueprint.jsx",
        "functions/core/promptBuilder.js"
      ]
    };

    const hash = createHash("sha256");
    hash.update(JSON.stringify(state));
    const system_state_hash = hash.toString();

    const kv_lines = `model_name=${state.runtime.model_name}
token_limit=${state.runtime.token_limit}
platform_name=${state.runtime.platform_name}
hosting_platform=${state.runtime.hosting_platform}
backend_runtime=${state.runtime.backend_runtime}
frontend_framework=${state.runtime.frontend_framework}
inference_provider=${state.runtime.inference_provider}
web_search_enabled=${state.tooling.web_search_enabled}
file_read_enabled=${state.tooling.file_read_enabled}
tts_enabled=${state.tooling.tts_enabled}
learning_mode=${state.governance.learning_mode}`;

    return Response.json({
      system_state: state,
      system_state_hash,
      kv_lines
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});