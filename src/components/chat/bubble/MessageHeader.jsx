import React from 'react';
import { toast } from 'sonner';

const PROVIDER_LABELS = {
  gemini: { label: 'Gemini', color: 'text-blue-300 border-blue-400/40 bg-blue-500/10' },
  openai: { label: 'OpenAI', color: 'text-white/50 border-white/10 bg-white/5' },
  grok:   { label: 'Grok',   color: 'text-purple-300 border-purple-400/40 bg-purple-500/10' },
  local:  { label: 'Local',  color: 'text-yellow-300 border-yellow-400/40 bg-yellow-500/10' },
};

export default function MessageHeader({ isUser, userInitials, messageId, inferenceProvider }) {
  const handleCopyMessageId = () => {
    if (messageId) {
      navigator.clipboard.writeText(messageId);
      toast.success('Message ID copied');
    }
  };

  const providerInfo = !isUser && inferenceProvider ? PROVIDER_LABELS[inferenceProvider] : null;

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-medium">
          {isUser ? (
            <span className="text-green-300">{userInitials}</span>
          ) : (
            <span className="text-blue-300">CAOS</span>
          )}
        </p>
        {providerInfo && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${providerInfo.color}`}>
            {providerInfo.label}
          </span>
        )}
      </div>
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