// MemorySaveIndicator.jsx — Phase 2: 💾 visual badge for memory writes
// Shown on any assistant message that contains MEMORY_SAVED: TRUE
// Strips the technical marker from visible content — user sees only the badge.

import React, { useState } from 'react';
import { Save } from 'lucide-react';

export function hasMemorySave(content) {
  return typeof content === 'string' && content.includes('MEMORY_SAVED: TRUE');
}

export function stripMemoryMarker(content) {
  if (!content) return content;
  // Remove the MEMORY_SAVED: TRUE line and any trailing metadata on same line
  return content
    .replace(/MEMORY_SAVED: TRUE[^\n]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function MemorySaveIndicator({ content }) {
  const [expanded, setExpanded] = useState(false);

  if (!hasMemorySave(content)) return null;

  // Extract entry count if present
  const entriesMatch = content.match(/entries:\s*(\d+)/);
  const entryCount = entriesMatch ? parseInt(entriesMatch[1], 10) : 1;

  // Extract id(s) if present
  const idMatch = content.match(/id:\s*([a-f0-9-]+)/);
  const entryId = idMatch ? idMatch[1].slice(0, 8) : null;

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium
        bg-emerald-500/15 border border-emerald-500/30 text-emerald-300
        hover:bg-emerald-500/25 transition-colors cursor-pointer select-none"
      title="Memory saved — click for details"
    >
      <Save className="w-3 h-3" />
      <span>
        {entryCount === 1 ? 'Memory saved' : `${entryCount} memories saved`}
        {expanded && entryId ? ` · id: ${entryId}` : ''}
      </span>
    </button>
  );
}