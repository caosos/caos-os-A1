import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Code, Search, List, Zap } from 'lucide-react';

export default function ExecutionReceipt({ receipt }) {
  if (!receipt) return null;

  const modeIcons = {
    SEARCH: Search,
    LIST: List,
    RETRIEVAL: Search,
    GEN: Zap
  };

  const ModeIcon = modeIcons[receipt.mode] || Code;

  return (
    <div className="mt-3 border border-white/10 rounded-lg bg-white/5 backdrop-blur-sm p-3 text-xs font-mono">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
        <ModeIcon className="w-3 h-3 text-blue-400" />
        <span className="text-white/70 font-semibold">Execution Receipt</span>
      </div>
      
      <div className="space-y-1.5 text-white/60">
        <div className="flex justify-between">
          <span className="text-white/40">Mode:</span>
          <Badge variant="outline" className="text-xs">
            {receipt.mode}
          </Badge>
        </div>
        
        {receipt.route && (
          <div className="flex justify-between">
            <span className="text-white/40">Route:</span>
            <span>{receipt.route}</span>
          </div>
        )}
        
        {receipt.tool_invoked && (
          <div className="flex justify-between">
            <span className="text-white/40">Tool:</span>
            <span className="text-green-400">{receipt.tool_invoked}</span>
          </div>
        )}
        
        {receipt.extracted_terms?.length > 0 && (
          <div className="flex justify-between">
            <span className="text-white/40">Query:</span>
            <span className="text-yellow-400">{receipt.extracted_terms.join(', ')}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-white/40">Results:</span>
          <span>{receipt.result_count}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/40">Time:</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {receipt.execution_time_ms}ms
          </span>
        </div>

        {receipt.confidence && (
          <div className="flex justify-between">
            <span className="text-white/40">Confidence:</span>
            <span>{receipt.confidence.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}