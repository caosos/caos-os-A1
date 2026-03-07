// RecallResults.jsx — Verbatim extraction of Recall Results block from ChatBubble.jsx
// PR2-A, Mar 7, 2026. DOM-root parity preserved exactly.

import React from 'react';

export default function RecallResults({ recallResults }) {
  if (!recallResults || recallResults.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      <div className="text-xs text-blue-400 font-medium flex items-center gap-2">
        <span>🧠</span> Recalled Memories ({recallResults.length})
      </div>
      {recallResults.map((recall, idx) => {
        const preview = recall.payload?.content || recall.payload?.text || '';
        const previewText = preview.length > 80 ? preview.slice(0, 80) + '...' : preview;
        const timestamp = recall.ts_ms ? new Date(recall.ts_ms).toLocaleString() : '';
        return (
          <div key={idx} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-400 font-mono">session:{recall.session_id || 'default'}</span>
              {timestamp && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-white/50">{timestamp}</span>
                </>
              )}
            </div>
            {previewText && (
              <p className="text-sm text-white/90 leading-relaxed">{previewText}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}