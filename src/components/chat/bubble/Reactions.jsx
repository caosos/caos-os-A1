import React from 'react';

// Verbatim extraction of the reactions render block from ChatBubble.jsx — Commit 6
// No logic changes, no DOM changes, identical classNames and title attribute.

export default function Reactions({ reactions }) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {reactions.map((reaction, idx) => (
        <div
          key={idx}
          className="bg-white/10 border border-white/20 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
          title={reaction.selected_text}
        >
          <span>{reaction.emoji}</span>
        </div>
      ))}
    </div>
  );
}