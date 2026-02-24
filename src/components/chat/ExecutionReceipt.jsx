import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Code, Search, List, Zap, ChevronRight, Shield, Lock, AlertTriangle } from 'lucide-react';

export default function ExecutionReceipt({ receipt }) {
  const [expanded, setExpanded] = useState(false);
  
  // INSTRUMENTATION: Receipt required, always present
  if (!receipt) return null;

  // Schema v1.0 unified format
  const mode = receipt.execution_mode || receipt.mode || 'UNKNOWN';
  const intent = receipt.intent?.classification || 'UNKNOWN';
  const confidence = receipt.intent?.confidence || 0.0;
  const reason = receipt.intent?.reason;
  const forceRetrieval = receipt.intent?.force_retrieval || false;
  const route = receipt.routing?.pipeline || 'UNKNOWN';
  const formatter = receipt.routing?.formatter;
  const requiresTool = receipt.routing?.requires_tool || false;
  const toolInvoked = receipt.tools?.invoked || false;
  const toolName = receipt.tools?.tool_name;
  const toolStatus = receipt.tools?.execution_status;
  const fallback = receipt.fallback || {};
  const memoryUsed = receipt.memory_access?.used || false;
  const memorySource = receipt.memory_access?.source;
  const downgradeBlocked = receipt.guardrails?.downgrade_blocked || false;
  const policyTriggered = receipt.guardrails?.policy_triggered || false;
  const latencyMs = receipt.latency_ms || 0;

  const modeIcons = {
    SEARCH: Search,
    LIST: List,
    RETRIEVAL: Search,
    GEN: Zap,
    ERROR: AlertTriangle
  };

  const ModeIcon = modeIcons[mode] || Code;

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
          {/* Intent Section (Schema v1.0) */}
          <div className="space-y-1">
            <div className="text-white/50 font-semibold mb-1">Intent Resolution</div>
            <div className="flex justify-between">
              <span className="text-white/40">Intent:</span>
              <Badge variant="outline" className="text-xs">{intent}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Confidence:</span>
              <span className="text-white/60">{confidence.toFixed(2)}</span>
            </div>
            {reason && (
              <div className="flex justify-between">
                <span className="text-white/40">Reason:</span>
                <span className="text-white/60">{reason}</span>
              </div>
            )}
            {forceRetrieval && (
              <div className="flex justify-between">
                <span className="text-white/40">Force Retrieval:</span>
                <span className="text-yellow-400">true</span>
              </div>
            )}
          </div>

          {/* Route Section (Schema v1.0) */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="text-white/50 font-semibold mb-1">Route Selection</div>
            <div className="flex justify-between">
              <span className="text-white/40">Pipeline:</span>
              <span className="text-white/60">{route}</span>
            </div>
            {formatter && (
              <div className="flex justify-between">
                <span className="text-white/40">Formatter:</span>
                <span className="text-white/60">{formatter}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/40">Requires Tool:</span>
              <span className="text-white/60">{requiresTool ? 'true' : 'false'}</span>
            </div>
          </div>

          {/* Tool Execution Section (Schema v1.0) */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="text-white/50 font-semibold mb-1">Tool Execution</div>
            <div className="flex justify-between">
              <span className="text-white/40">Invoked:</span>
              <span className={toolInvoked ? 'text-green-400' : 'text-white/60'}>{toolInvoked ? 'true' : 'false'}</span>
            </div>
            {toolName && (
              <div className="flex justify-between">
                <span className="text-white/40">Tool Name:</span>
                <span className="text-white/60">{toolName}</span>
              </div>
            )}
            {toolStatus && (
              <div className="flex justify-between">
                <span className="text-white/40">Status:</span>
                <span className={toolStatus === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>{toolStatus}</span>
              </div>
            )}
          </div>

          {/* Fallback Section (Schema v1.0) */}
          {fallback.triggered && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-white/50 font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                Fallback
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Triggered:</span>
                <span className="text-yellow-400">true</span>
              </div>
              {fallback.fallback_type && (
                <div className="flex justify-between">
                  <span className="text-white/40">Type:</span>
                  <span className="text-white/60">{fallback.fallback_type}</span>
                </div>
              )}
              {fallback.reason && (
                <div className="flex justify-between">
                  <span className="text-white/40">Reason:</span>
                  <span className="text-white/60 text-right max-w-[60%]">{fallback.reason}</span>
                </div>
              )}
            </div>
          )}

          {/* Memory Section (Schema v1.0) */}
          {memoryUsed && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-white/50 font-semibold mb-1">Memory Access</div>
              <div className="flex justify-between">
                <span className="text-white/40">Used:</span>
                <span className="text-green-400">true</span>
              </div>
              {memorySource && (
                <div className="flex justify-between">
                  <span className="text-white/40">Source:</span>
                  <span className="text-white/60">{memorySource}</span>
                </div>
              )}
            </div>
          )}

          {/* Guardrails Section (Schema v1.0) */}
          {(downgradeBlocked || policyTriggered) && (
            <div className="space-y-1 pt-2 border-t border-white/10">
              <div className="text-white/50 font-semibold mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Guardrails
              </div>
              {downgradeBlocked && (
                <div className="flex justify-between">
                  <span className="text-white/40">Downgrade Blocked:</span>
                  <span className="text-yellow-400">true</span>
                </div>
              )}
              {policyTriggered && (
                <div className="flex justify-between">
                  <span className="text-white/40">Policy Triggered:</span>
                  <span className="text-yellow-400">true</span>
                </div>
              )}
            </div>
          )}

          {/* Performance Section (Schema v1.0) */}
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="text-white/50 font-semibold mb-1">Performance</div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">Latency:</span>
              <span className="flex items-center gap-1 text-white/60">
                <Clock className="w-3 h-3" />
                {latencyMs}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Execution Mode:</span>
              <Badge variant="outline" className="text-xs">{mode}</Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}