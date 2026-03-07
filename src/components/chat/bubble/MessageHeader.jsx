import React from 'react';
import { toast } from 'sonner';

export default function MessageHeader({ isUser, userInitials, messageId }) {
  const handleCopyMessageId = () => {
    if (messageId) {
      navigator.clipboard.writeText(messageId);
      toast.success('Message ID copied');
    }
  };

  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-medium">
        {isUser ? (
          <span className="text-green-300">{userInitials}</span>
        ) : (
          <span className="text-blue-300">CAOS</span>
        )}
      </p>
      {messageId && (
        <button
          onClick={handleCopyMessageId}
          className="text-[10px] text-white/40 hover:text-white/60 font-mono cursor-pointer"
          title={`Message ID: ${messageId}`}
        >
          {messageId.substring(0, 8)}…
        </button>
      )}
    </div>
  );
}