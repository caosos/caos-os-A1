import React from 'react';

// Verbatim extraction of the replies render block from ChatBubble.jsx — Commit 7
// No logic changes, no DOM changes, identical classNames, quoting, and ai_response conditional.

export default function Replies({ replies }) {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {replies.map((reply, idx) => (
        <div
          key={idx}
          className="bg-white/5 border-l-2 border-blue-400 rounded px-2 py-1.5 text-xs space-y-1.5"
        >
          <p className="text-white/50 italic text-[11px]">"{reply.selected_text}"</p>
          <div className="bg-blue-600/20 rounded px-2 py-1">
            <p className="text-white/90">{reply.user_reply}</p>
          </div>
          {reply.ai_response && (
            <div className="bg-white/10 rounded px-2 py-1">
              <p className="text-blue-300 font-medium text-[10px] mb-0.5">CAOS</p>
              <p className="text-white/90">{reply.ai_response}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}