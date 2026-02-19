import React from 'react';

export default function TokenMeter({ messages = [], maxTokens = 2000000 }) {
  // Calculate actual tokens from Record entity token_count if available
  const tokens = messages.reduce((sum, msg) => sum + (msg.token_count || 0), 0);
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
        {tokens.toLocaleString()} / {maxTokens >= 1000000 ? `${(maxTokens / 1000000).toFixed(1)}M` : `${(maxTokens / 1000).toFixed(0)}K`}
      </span>
    </div>
  );
}