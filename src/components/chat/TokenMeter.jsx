import React from 'react';

export default function TokenMeter({ messages = [], maxTokens = 200000, wcwUsed = null, wcwBudget = null }) {
  // Prefer real backend data over client-side estimation
  const hasRealData = wcwUsed !== null && wcwBudget !== null && wcwBudget > 0;

  let tokens, budget;
  if (hasRealData) {
    tokens = wcwUsed;
    budget = wcwBudget;
  } else {
    // Fallback: estimate from message content (~4 chars per token)
    tokens = messages.reduce((sum, msg) => {
      if (msg.token_count && msg.token_count > 0) return sum + msg.token_count;
      return sum + Math.ceil((msg.content?.length || 0) / 4);
    }, 0);
    budget = maxTokens;
  }

  const percentage = (tokens / budget) * 100;

  let colorClass = 'bg-green-500';
  if (percentage > 75) colorClass = 'bg-red-500';
  else if (percentage > 50) colorClass = 'bg-yellow-500';
  else if (percentage > 25) colorClass = 'bg-blue-500';

  const fmt = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n;

  return (
    <div className="flex items-center gap-1" title={hasRealData ? "Working Context Window (live)" : "Estimated token usage"}>
      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="text-[10px] text-white/40 whitespace-nowrap">
        {fmt(tokens)}
        {!hasRealData && <span className="text-white/20">~</span>}
      </span>
    </div>
  );
}