// MODULE: core/systemStateIndex
// PURPOSE: Generate deterministic system state snapshot with build info, runtime facts, and governance
// OUTPUT: { system_state, system_state_hash, kv_lines }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'https://deno.land/std/crypto/mod.ts';

const BUILD_ID = 'CAOS_SSX_v1_2026-03-02';
const ACTIVE_MODEL = 'gpt-5.2';
const INFERENCE_PROVIDER = 'openai';
const PLATFORM_NAME = 'CAOS';
const HOSTING_PLATFORM = 'Base44';
const BACKEND_RUNTIME = 'Deno';
const FRONTEND_FRAMEWORK = 'React 18';
const TOKEN_LIMIT = 200000;

// Protected files registry (immutable governance)
const PROTECTED_FILES = {
  'functions/hybridMessage.ts': 'Primary message pipeline — DO NOT MODIFY',
  'functions/core/promptBuilder.js': 'System prompt injection — governance critical',
  'functions/core/systemStateIndex.js': 'SSX v1 authority — self-referential protection',
  'docs/PROTECTED_FILES.json': 'Governance registry — immutable'
};

async function generateSystemState() {
  return {
    build_id: BUILD_ID,
    build_timestamp: new Date().toISOString(),
    model_name: ACTIVE_MODEL,
    token_limit: TOKEN_LIMIT,
    platform_name: PLATFORM_NAME,
    hosting_platform: HOSTING_PLATFORM,
    backend_runtime: BACKEND_RUNTIME,
    frontend_framework: FRONTEND_FRAMEWORK,
    inference_provider: INFERENCE_PROVIDER,
    web_search_enabled: true,
    file_read_enabled: true,
    image_parse_enabled: true,
    tts_enabled: true,
    learning_mode: true,
    protected_files: Object.keys(PROTECTED_FILES).length,
    governance_locks: {
      core_pipeline: 'LOCKED',
      prompt_injection: 'LOCKED',
      protected_registry: 'LOCKED'
    }
  };
}

async function computeHash(obj) {
  const json = JSON.stringify(obj);
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateKVLines(state) {
  const lines = [
    `model_name=${state.model_name}`,
    `token_limit=${state.token_limit}`,
    `platform_name=${state.platform_name}`,
    `hosting_platform=${state.hosting_platform}`,
    `backend_runtime=${state.backend_runtime}`,
    `frontend_framework=${state.frontend_framework}`,
    `inference_provider=${state.inference_provider}`,
    `web_search_enabled=${state.web_search_enabled}`,
    `file_read_enabled=${state.file_read_enabled}`,
    `image_parse_enabled=${state.image_parse_enabled}`,
    `tts_enabled=${state.tts_enabled}`,
    `learning_mode=${state.learning_mode}`,
    `build_id=${state.build_id}`
  ];
  return lines.join('\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const systemState = await generateSystemState();
    const systemStateHash = await computeHash(systemState);
    const kvLines = generateKVLines(systemState);

    return Response.json({
      system_state: systemState,
      system_state_hash: systemStateHash,
      kv_lines: kvLines,
      protected_files: PROTECTED_FILES
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});