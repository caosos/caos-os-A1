import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Code, Search, List, Zap, ChevronRight, Shield, Lock, AlertTriangle } from 'lucide-react';

export default function ExecutionReceipt({ receipt }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!receipt) return null;

  const modeIcons = {
    SEARCH: Search,
    LIST: List,
    RETRIEVAL: Search,
    GEN: Zap
  };

  const ModeIcon = modeIcons[receipt.mode] || Code;

  // Handle both old and new receipt formats
  const intent = receipt.intent?.detected || receipt.intent;
  const confidence = receipt.intent?.confidence || receipt.confidence;
  const reason = receipt.intent?.reason;
  const extractedTerms = receipt.intent?.extracted_terms || receipt.extracted_terms || [];
  const route = receipt.route?.selected || receipt.route;
  const formatter = receipt.route?.formatter;
  const toolInvoked = receipt.tool_execution?.invoked || receipt.tool_invoked;
  const resultCount = receipt.tool_execution?.result_count || receipt.result_count || 0;
  const matchType = receipt.tool_execution?.match_type;
  const matchFields = receipt.tool_execution?.match_fields || [];
  const guardrails = receipt.guardrails || {};

  return (
    <div className="mt-3 border border-white/10 rounded-lg bg-white/5 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`w-3 h-3 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <ModeIcon className="w-3 h-3 text-blue-400" />
          <span className="text-white/70 font-semibold text-xs font-mono">EXECUTION TRACE</span>
        </div>
        <span className="text-white/30 text-xs">(Tap to Expand)</span>
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-3 text-xs font-mono border-t border-white/10 pt-3">
          {/* Intent Section */}
          <div className="space-y-1">
            <div className="text-white/50 font-semibold mb-1">Intent Resolution</div>
            <div className="flex justify-between">
              <span className="text-white/40">Intent:</span>
              <Badge variant="outline" className="text-xs">{intent}</Badge>
            </div>
            {confidence && (
              <div className="flex justify-between">
                <span className="text-white/40">Confidence:</span>
                <span className="text-white/60">{typeof confidence === 'number' ? confidence.toFixed(2) : confidence}</span>
              </div>
            )}
            {reason && (
              <div className="flex justify-between">
                <span className="text-white/40">Reason:</span>
                <span className="text-white/60">{reason}</span>
              </div>
            )}
            {extractedTerms.length > 0 && (
              <div className="flex justify-between">
                <span className="text-white/40">Extracted Terms:</span>
                <span className="text-yellow-400">[{extractedTerms.map(t => `"${t}"`).join(', ')}]</span>
              </div>
            )}
          </div>

          {/* Route Section */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="text-white/50 font-semibold mb-1">Route Selection</div>
            <div className="flex justify-between">
              <span className="text-white/40">Route:</span>
              <span className="text-white/60">{route}</span>
            </div>
            {formatter && (
              <div className="flex justify-between">
                <span className="text-white/40">Formatter:</span>
                <span className="text-white/60">{formatter}</span>
              </div>
            )}
          </div>

          {/* Tool Execution Section */}
          {toolInvoked && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-white/50 font-semibold mb-1">Tool Execution</div>
              <div className="flex justify-between">
                <span className="text-white/40">Tool Invoked:</span>
                <span className="text-green-400">{toolInvoked}</span>
              </div>
              {receipt.fallback_triggered !== undefined && (
                <div className="flex justify-between">
                  <span className="text-white/40">Fallback Triggered:</span>
                  <span className={receipt.fallback_triggered ? 'text-yellow-400' : 'text-white/60'}>
                    {receipt.fallback_triggered ? 'true' : 'false'}
                  </span>
                </div>
              )}
              {matchType && (
                <div className="flex justify-between">
                  <span className="text-white/40">Match Type:</span>
                  <span className="text-white/60">{matchType}</span>
                </div>
              )}
              {matchFields.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/40">Match Fields:</span>
                  <span className="text-white/60">{matchFields.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/40">Results:</span>
                <span className="text-white/60">{resultCount}</span>
              </div>
            </div>
          )}

          {/* Guardrails Section */}
          {Object.keys(guardrails).length > 0 && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-white/50 font-semibold mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Guardrails
              </div>
              {guardrails.refinement_lock_engaged !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Refinement Lock:</span>
                  <span className={guardrails.refinement_lock_engaged ? 'text-yellow-400 flex items-center gap-1' : 'text-white/60'}>
                    {guardrails.refinement_lock_engaged && <Lock className="w-3 h-3" />}
                    {guardrails.refinement_lock_engaged ? 'engaged' : 'false'}
                  </span>
                </div>
              )}
              {guardrails.echo_suppression_triggered !== undefined && (
                <div className="flex justify-between">
                  <span className="text-white/40">Echo Suppression:</span>
                  <span className="text-white/60">
                    {guardrails.echo_suppression_triggered ? 'triggered' : 'not triggered'}
                  </span>
                </div>
              )}
              {guardrails.empty_search_blocked !== undefined && (
                <div className="flex justify-between">
                  <span className="text-white/40">Empty Search Block:</span>
                  <span className={guardrails.empty_search_blocked ? 'text-red-400' : 'text-white/60'}>
                    {guardrails.empty_search_blocked ? 'blocked' : 'passed'}
                  </span>
                </div>
              )}
              {guardrails.forced_route && (
                <div className="flex justify-between items-center">
                  <span className="text-white/40">Forced Route:</span>
                  <span className="text-yellow-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {guardrails.forced_route}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Performance Section */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="text-white/50 font-semibold mb-1">Performance</div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">Execution Time:</span>
              <span className="flex items-center gap-1 text-white/60">
                <Clock className="w-3 h-3" />
                {receipt.execution_time_ms}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Mode:</span>
              <Badge variant="outline" className="text-xs">{receipt.mode}</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}