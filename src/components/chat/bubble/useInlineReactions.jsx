// useInlineReactions.js — Local-only reaction/reply handlers.
// PR2-A decision (Mar 7, 2026 — TSB-027):
//   External fetch calls to http://172.234.25.199:3001/api/message REMOVED.
//   Reactions and replies update message state locally only via onUpdateMessage.
//   No external AI acknowledgment. No network calls.
//   Rollback: restore fetch behind explicit feature flag when needed.

export function useInlineReactions(message, onUpdateMessage) {
  const handleReact = (text, emoji) => {
    const reactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
    reactions.push({ emoji, selected_text: text, timestamp: new Date().toISOString() });
    onUpdateMessage(message.id, { reactions });
  };

  const handleReply = (text, replyContent) => {
    const replies = Array.isArray(message.replies) ? [...message.replies] : [];
    replies.push({
      selected_text: text,
      user_reply: replyContent,
      ai_response: null,
      timestamp: new Date().toISOString()
    });
    onUpdateMessage(message.id, { replies });
  };

  return { handleReact, handleReply };
}