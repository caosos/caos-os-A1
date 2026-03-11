import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export default function ErrorCard({ endpoint, error_code, stage, request_id, retryable, onRetry }) {
  const [expanded, setExpanded] = useState(false);

  const copyRequestId = () => {
    if (request_id) {
      navigator.clipboard.writeText(request_id);
      toast.success('Request ID copied');
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-red-500/40 bg-red-500/10 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-red-300 text-xs font-semibold flex-1">
          {error_code || 'REQUEST_FAILED'}
          {stage && <span className="text-red-400/70 font-normal ml-1">@ {stage}</span>}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 hover:bg-white/10 rounded transition-colors"
        >
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-white/40" />
            : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-2 space-y-1.5 text-xs font-mono border-t border-red-500/20 pt-2">
          {endpoint && (
            <div className="flex justify-between">
              <span className="text-white/40">endpoint</span>
              <span className="text-white/60">{endpoint}</span>
            </div>
          )}
          {stage && (
            <div className="flex justify-between">
              <span className="text-white/40">stage</span>
              <span className="text-red-300">{stage}</span>
            </div>
          )}
          {request_id && (
            <div className="flex justify-between items-center">
              <span className="text-white/40">request_id</span>
              <div className="flex items-center gap-1">
                <span className="text-white/50 truncate max-w-[140px]">{request_id.slice(0, 16)}…</span>
                <button onClick={copyRequestId} className="p-0.5 hover:bg-white/10 rounded">
                  <Copy className="w-3 h-3 text-white/40" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {retryable && onRetry && (
        <div className="px-3 pb-2">
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs text-red-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}