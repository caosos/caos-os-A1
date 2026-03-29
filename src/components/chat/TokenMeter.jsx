import React from 'react';

export default function TokenMeter({ messages = [], wcwUsed = null, wcwBudget = null, provider = 'openai' }) {
  // Budget: 200K for OpenAI, 1M for Gemini — always use provider-based budget
  const defaultBudget = provider === 'gemini' ? 1000000 : 200000;
  const hasRealData = wcwUsed !== null && wcwUsed > 0;

  let tokens, budget;
  budget = defaultBudget; // always use provider-correct budget
  if (hasRealData) {
    tokens = wcwUsed;
  } else {
    tokens = messages.reduce((sum, msg) => {
      if (msg.token_count && msg.token_count > 0) return sum + msg.token_count;
      return sum + Math.ceil((msg.content?.length || 0) / 4);
    }, 0);
    budget = defaultBudget;
  }

  const percentage = (tokens / budget) * 100;

  let colorClass = 'bg-green-500';
  if (percentage > 75) colorClass = 'bg-red-500';
  else if (percentage > 50) colorClass = 'bg-yellow-500';
  else if (percentage > 25) colorClass = 'bg-blue-500';

  const fmt = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

  return (
    <div className="flex flex-col items-end gap-0.5" title={hasRealData ? "Working Context Window (live)" : "Estimated token usage"}>
      <span className="text-[10px] text-white/50 whitespace-nowrap leading-none">
        {fmt(tokens)} / {fmt(budget)}{!hasRealData && <span className="text-white/30">~</span>}
      </span>
      <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}