import React, { useState } from 'react';
import { Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Function';
  const status = toolCall?.status || 'completed';
  const results = toolCall?.results;
  
  const parsedResults = (() => {
    if (!results) return null;
    try {
      return typeof results === 'string' ? JSON.parse(results) : results;
    } catch {
      return results;
    }
  })();
  
  const isError = results && (
    (typeof results === 'string' && /error|failed/i.test(results)) ||
    (parsedResults?.success === false)
  );
  
  // Enhanced status with decision rationale
  const getToolDescription = (toolName) => {
    const descriptions = {
      'search_internet': '🔍 Searching web for real-time information',
      'recall_memory': '🧠 Searching conversation history',
      'read_app_file': '📄 Reading system file',
      'list_app_structure': '📋 Mapping system structure',
      'update_user_profile': '💾 Updating permanent memory',
      'create_text_file': '📝 Generating text file',
      'create_pdf': '📄 Generating PDF document'
    };
    return descriptions[toolName] || `⚙️ ${toolName.replace(/_/g, ' ')}`;
  };
  
  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-400', text: 'Queued' },
    running: { icon: Loader2, color: 'text-blue-500', text: 'Working...', spin: true },
    completed: isError ? 
      { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
      { icon: CheckCircle2, color: 'text-green-500', text: 'Complete' },
    success: { icon: CheckCircle2, color: 'text-green-500', text: 'Complete' },
    failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
  }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
  
  const Icon = statusConfig.icon;
  const toolDescription = getToolDescription(name);
  
  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all w-full ${
          expanded ? "bg-white/10 border-white/30" : "bg-white/5 border-white/20"
        } ${statusConfig.spin ? 'animate-pulse' : ''}`}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`} />
        <div className="flex-1 text-left">
          <div className="text-white/90 font-medium">{toolDescription}</div>
          {statusConfig.text && (
            <div className={`text-xs ${isError ? 'text-red-400' : statusConfig.spin ? 'text-blue-400' : 'text-green-400'} mt-0.5`}>
              {statusConfig.text}
            </div>
          )}
        </div>
        {!statusConfig.spin && (toolCall.arguments_string || results) && (
          <ChevronRight className={`h-3 w-3 text-white/40 transition-transform flex-shrink-0 ${
            expanded ? 'rotate-90' : ''
          }`} />
        )}
      </button>
      
      {expanded && !statusConfig.spin && (
        <div className="mt-2 ml-6 space-y-3 border-l-2 border-white/20 pl-3">
          {toolCall.arguments_string && (
            <div>
              <div className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1">
                <span>📋</span> Input Parameters
              </div>
              <pre className="bg-slate-900/50 rounded-md p-3 text-xs text-white/80 whitespace-pre-wrap overflow-x-auto">
                {(() => {
                  try {
                    const parsed = JSON.parse(toolCall.arguments_string);
                    // Highlight query if it's a search
                    if (parsed.query) {
                      return `Query: "${parsed.query}"${parsed.limit ? `\nLimit: ${parsed.limit} results` : ''}`;
                    }
                    return JSON.stringify(parsed, null, 2);
                  } catch {
                    return toolCall.arguments_string;
                  }
                })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-xs font-semibold text-white/60 mb-1.5 flex items-center gap-1">
                <span>✨</span> Results {parsedResults.found !== undefined && `(${parsedResults.found} found)`}
              </div>
              <div className="bg-slate-900/50 rounded-md p-3 text-xs text-white/80 space-y-2 max-h-64 overflow-auto">
                {parsedResults.messages && parsedResults.messages.length > 0 ? (
                  <div className="space-y-2">
                    {parsedResults.messages.slice(0, 5).map((msg, idx) => (
                      <div key={idx} className="border-l-2 border-blue-400/30 pl-2 py-1">
                        <div className="text-blue-400 text-[10px] uppercase mb-0.5">{msg.role}</div>
                        <div className="text-white/70 leading-relaxed">{msg.content}</div>
                        {msg.timestamp && (
                          <div className="text-white/40 text-[10px] mt-1">{new Date(msg.timestamp).toLocaleString()}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : typeof parsedResults === 'string' ? (
                  <pre className="whitespace-pre-wrap">{parsedResults}</pre>
                ) : (
                  <pre className="whitespace-pre-wrap overflow-x-auto">{JSON.stringify(parsedResults, null, 2)}</pre>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FunctionDisplay;