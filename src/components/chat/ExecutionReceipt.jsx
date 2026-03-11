import React, { useState } from 'react';
import { Clock, ChevronRight, AlertTriangle, Zap, BarChart2 } from 'lucide-react';

const ms = (v) => v != null ? `${v}ms` : '—';
const tok = (v) => v != null ? v.toLocaleString() : '—';

const STAGE_LABELS = {
  t_auth: 'Auth',
  t_profile_and_history_load: 'Profile + History',
  t_sanitizer: 'History Compress',
  t_prompt_build: 'Prompt Build',
  t_openai_call: 'Inference',
  t_save_messages: 'Save Messages',
  t_total: 'Total',
};

export default function ExecutionReceipt({ receipt, forceExpand = false }) {
  const [expanded, setExpanded] = useState(forceExpand);

  if (!receipt) return null;

  const isError = receipt.mode === 'ERROR' || receipt.ok === false;
  const lb = receipt.latency_breakdown || {};
  const tb = receipt.token_breakdown || {};

  return (
    <div className="mt-3 border border-white/10 rounded-lg bg-white/5 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`w-3 h-3 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {isError
            ? <AlertTriangle className="w-3 h-3 text-red-400" />
            : <Zap className="w-3 h-3 text-blue-400" />}
          <span className="text-white/70 font-semibold text-xs font-mono">EXECUTION TRACE</span>
          {lb.t_total != null && (
            <span className={`text-xs font-mono ml-1 ${lb.t_total > 30000 ? 'text-red-400' : lb.t_total > 15000 ? 'text-yellow-400' : 'text-green-400'}`}>
              {(lb.t_total / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        <span className="text-white/30 text-xs">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 text-xs font-mono border-t border-white/10 pt-3">

          {/* Route + Model */}
          <div className="space-y-1">
            <div className="text-white/50 font-semibold mb-1">Pipeline</div>
            <Row label="model" value={receipt.model_used} />
            <Row label="route" value={receipt.route} />
            <Row label="route_reason" value={receipt.route_reason} dim />
            <Row label="intent" value={receipt.heuristics_intent} />
            <Row label="depth" value={receipt.heuristics_depth} />
            <Row label="cog_level" value={receipt.cognitive_level?.toFixed(2)} />
          </div>

          {/* Stage Timings */}
          {Object.keys(lb).length > 0 && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-white/50 font-semibold mb-1 flex items-center gap-1">
                <BarChart2 className="w-3 h-3" /> Stage Timings
              </div>
              {Object.entries(STAGE_LABELS).map(([key, label]) => {
                if (lb[key] == null) return null;
                const val = lb[key];
                const isSlow = key !== 't_total' && val > 10000;
                return (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-white/40">{label}</span>
                    <span className={`tabular-nums ${isSlow ? 'text-yellow-400' : 'text-white/60'}`}>
                      {ms(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tokens + WCW */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="text-white/50 font-semibold mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Tokens / WCW
            </div>
            <Row label="prompt_tokens" value={tok(tb.total_prompt_tokens)} />
            <Row label="completion_tokens" value={tok(tb.completion_tokens)} />
            <Row label="total_tokens" value={tok(tb.total_tokens)} />
            <Row label="wcw_budget" value={tok(receipt.wcw_budget)} />
            <Row label="wcw_used" value={tok(receipt.wcw_used)} />
            <Row label="wcw_remaining" value={tok(receipt.wcw_remaining)} />
          </div>

          {/* Memory + CTC */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="text-white/50 font-semibold mb-1">Context</div>
            <Row label="history_messages" value={receipt.history_messages} />
            <Row label="matched_memories" value={receipt.matched_memories} />
            <Row label="ctc_injected" value={String(receipt.ctc_injected ?? false)} />
          </div>

          {/* IDs */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="text-white/50 font-semibold mb-1">Identifiers</div>
            <Row label="request_id" value={receipt.request_id?.slice(0, 16) + '…'} dim />
            <Row label="session_id" value={receipt.session_id?.slice(0, 16) + '…'} dim />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, dim = false }) {
  if (value == null || value === '—') return null;
  return (
    <div className="flex justify-between">
      <span className="text-white/40">{label}</span>
      <span className={dim ? 'text-white/30' : 'text-white/60'}>{value}</span>
    </div>
  );
}