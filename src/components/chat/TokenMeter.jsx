import React from 'react';

// Rough token estimator: ~4 chars per token
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export default function TokenMeter({ messages = [], maxTokens = 128000 }) {
  // Use stored token_count if available, otherwise estimate from content length
  const tokens = messages.reduce((sum, msg) => {
    if (msg.token_count && msg.token_count > 0) return sum + msg.token_count;
    return sum + estimateTokens(msg.content);
  }, 0);
  const percentage = (tokens / maxTokens) * 100;
  
  let colorClass = 'bg-green-500';
  if (percentage > 75) colorClass = 'bg-red-500';
  else if (percentage > 50) colorClass = 'bg-yellow-500';
  else if (percentage > 25) colorClass = 'bg-blue-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="text-xs text-white/50 whitespace-nowrap">
        {tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : tokens} / {maxTokens >= 1000000 ? `${(maxTokens / 1000000).toFixed(1)}M` : `${(maxTokens / 1000).toFixed(0)}K`}
      </span>
    </div>
  );
}