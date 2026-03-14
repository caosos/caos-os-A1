// PROTECTED_FILES_REGISTRY
// Governance registry for protected system files
// This is an immutable reference; actual enforcement happens in backend functions

export const PROTECTED_FILES_REGISTRY = {
  version: "1.1",
  last_updated: "2026-03-14",
  protected: [
    "functions/hybridMessage.js",
    "functions/core/systemStateIndex.js",
    "functions/core/systemStateDiff.js",
    "functions/core/promptBuilder.js",
    "components/governance/ProtectedFilesRegistry.jsx",
    "pages/SystemBlueprint.jsx",
    "components/docs/OperationalBootstrap.jsx"
  ],
  rationale: {
    "hybridMessage.js": "Core message pipeline spine — must remain orchestration-only",
    "systemStateIndex.js": "SSX generator — authoritative system state",
    "systemStateDiff.js": "Drift detector — enforces consistency",
    "promptBuilder.js": "Authority KV injection — controls Aria's self-description",
    "ProtectedFilesRegistry.jsx": "Governance registry — self-referential protection",
    "SystemBlueprint.jsx": "System documentation — single source of truth",
    "OperationalBootstrap.jsx": "Baseline assistant behavior contract — prevents passive behavioral regression across all intents"
  }
};

export function isProtected(filePath) {
  return PROTECTED_FILES_REGISTRY.protected.includes(filePath);
}

export function getProtectionReason(filePath) {
  return PROTECTED_FILES_REGISTRY.rationale[filePath] || null;
}