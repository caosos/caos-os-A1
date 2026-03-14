import React from 'react';
import { X, DollarSign, TrendingUp, Zap } from 'lucide-react';

export default function CostReportModal({ metrics, onClose }) {
  const t = metrics?.tokens || {};
  const m = metrics?.messages || {};

  const costPerMessage = m.total > 0 ? (t.estimated_cost_total / m.total).toFixed(5) : '0.00000';
  const tokensPerDollar = t.estimated_cost_total > 0
    ? Math.round(t.total_all_time / t.estimated_cost_total).toLocaleString()
    : '∞';

  const rows = [
    { label: 'Today', tokens: t.today, cost: t.estimated_cost_today },
    { label: 'This Month', tokens: t.this_month, cost: t.estimated_cost_month },
    { label: 'All Time', tokens: t.total_all_time, cost: t.estimated_cost_total },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-[#0a1628] border border-green-500/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-bold tracking-wider text-sm">COST ANALYSIS REPORT</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary Table */}
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Cost Breakdown</div>
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="text-left px-4 py-2 text-white/40 text-xs font-medium">Period</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-medium">Tokens</th>
                    <th className="text-right px-4 py-2 text-white/40 text-xs font-medium">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white/80">{r.label}</td>
                      <td className="px-4 py-3 text-right text-cyan-300 font-mono">{(r.tokens || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-green-300 font-bold">${(r.cost || 0).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Efficiency Metrics */}
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Efficiency Metrics</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">${costPerMessage}</div>
                <div className="text-[10px] text-white/40 mt-1">Cost per Message</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-yellow-300">{tokensPerDollar}</div>
                <div className="text-[10px] text-white/40 mt-1">Tokens per $1</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-blue-300">{m.total?.toLocaleString() || 0}</div>
                <div className="text-[10px] text-white/40 mt-1">Total Messages</div>
              </div>
            </div>
          </div>

          {/* Model pricing note */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Zap className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
              <div className="text-[11px] text-white/50">
                Cost estimates based on GPT-4o-mini pricing ($0.15/1M input · $0.60/1M output).
                Actual costs may vary by model. All-time data reflects 500 most recent receipts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}