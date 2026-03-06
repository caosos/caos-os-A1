// RedScreenOfDeath.jsx — Blocking error modal for pipeline failures.
// TSB entry: RSoD-001 (2026-03-06)
// GOVERNANCE: Never log/serialize request bodies, base64, or execution_receipt_full.
// Only renders: error_id, error_code, stage, session_id, timestamp, public_message.
// ~80 lines — under 400-line limit.

import React, { useEffect } from 'react';
import { AlertTriangle, Copy, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

export default function RedScreenOfDeath({ error, sessionId, onRetry, onDismiss }) {
  const { error_code, error_id, stage, public_message } = error;
  const timestamp = new Date().toISOString();

  // Keyboard: Escape → dismiss
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  const copyDiagnostics = () => {
    const diag = [
      `error_code: ${error_code}`,
      `error_id: ${error_id || 'n/a'}`,
      `stage: ${stage || 'unknown'}`,
      `session_id: ${sessionId || 'n/a'}`,
      `timestamp: ${timestamp}`,
      `message: ${public_message}`,
    ].join('\n');
    navigator.clipboard.writeText(diag);
    toast.success('Diagnostics copied');
  };

  const copyId = (label, value) => {
    if (!value) { toast.error(`No ${label} available`); return; }
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a0505] border border-red-500/60 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div>
            <div className="text-red-300 font-bold text-sm tracking-widest uppercase">Pipeline Failure</div>
            <div className="text-red-500/70 text-xs font-mono mt-0.5">{error_code}</div>
          </div>
        </div>

        {/* Message */}
        <p className="text-white/80 text-sm mb-4 leading-relaxed">{public_message}</p>

        {/* Diagnostic fields — minimal, no payloads */}
        <div className="bg-black/40 rounded-lg p-3 mb-4 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="text-white/40">error_id</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white/70">{error_id || 'n/a'}</span>
              {error_id && (
                <button onClick={() => copyId('Error ID', error_id)} className="text-white/30 hover:text-white/70 transition-colors">
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/40">session_id</span>
            <div className="flex items-center gap-1.5">
              <span className="text-white/70">{sessionId ? sessionId.substring(0, 16) + '…' : 'n/a'}</span>
              {sessionId && (
                <button onClick={() => copyId('Session ID', sessionId)} className="text-white/30 hover:text-white/70 transition-colors">
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">stage</span>
            <span className="text-white/70">{stage || 'unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">time</span>
            <span className="text-white/50">{new Date(timestamp).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
          <button
            onClick={copyDiagnostics}
            className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white/70 text-sm py-2.5 px-3 rounded-lg transition-colors"
            title="Copy all diagnostics"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/50 text-sm py-2.5 px-3 rounded-lg transition-colors"
            title="Dismiss (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}