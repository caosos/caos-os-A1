import React, { useState } from 'react';
import { ArrowLeft, Search, Copy, Check, AlertTriangle, Info, AlertCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const LEVEL_CONFIG = {
  INFO:  { color: 'text-blue-300',  bg: 'bg-blue-950/40',  border: 'border-blue-500/30',  Icon: Info },
  WARN:  { color: 'text-yellow-300', bg: 'bg-yellow-950/40', border: 'border-yellow-500/30', Icon: AlertTriangle },
  ERROR: { color: 'text-red-300',   bg: 'bg-red-950/40',   border: 'border-red-500/30',   Icon: AlertCircle },
};

function EventRow({ event }) {
  const [open, setOpen] = useState(event.level === 'ERROR');
  const cfg = LEVEL_CONFIG[event.level] || LEVEL_CONFIG.INFO;
  const hasData = event.data && Object.keys(event.data).length > 0;

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <cfg.Icon className={`w-4 h-4 flex-shrink-0 ${cfg.color}`} />
        <span className="text-white/60 text-xs font-mono w-16 flex-shrink-0">
          {event.elapsed_ms != null ? `+${event.elapsed_ms}ms` : '—'}
        </span>
        <span className="text-white/50 text-xs font-mono w-28 flex-shrink-0 truncate">{event.stage}</span>
        <span className="text-gray-200 text-sm flex-1 truncate">{event.message}</span>
        {event.code && (
          <span className="text-xs px-2 py-0.5 bg-white/10 rounded font-mono text-white/60 flex-shrink-0">{event.code}</span>
        )}
        {hasData && (
          open ? <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
               : <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
        )}
      </button>
      {open && hasData && (
        <div className="px-4 pb-3">
          <pre className="bg-black/40 border border-white/10 rounded p-3 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function RequestBlock({ request_id, events }) {
  const [open, setOpen] = useState(true);
  const hasError = events.some(e => e.level === 'ERROR');
  const durationMs = events.length > 0
    ? Math.max(...events.map(e => e.elapsed_ms ?? 0))
    : null;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
      >
        {hasError
          ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          : <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
        }
        <span className="text-white font-mono text-xs flex-1 truncate">{request_id}</span>
        <span className="text-white/40 text-xs">{events.length} events</span>
        {durationMs != null && <span className="text-white/40 text-xs ml-2">{durationMs}ms</span>}
        {open ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
      </button>
      {open && (
        <div className="p-3 space-y-2 bg-[#0a1628]">
          {events.map((e, i) => <EventRow key={e.id || i} event={e} />)}
        </div>
      )}
    </div>
  );
}

export default function RequestInspector() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [queryType, setQueryType] = useState('request_id');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const runQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = queryType === 'request_id'
        ? { request_id: query.trim() }
        : { session_id: query.trim(), limit: 200 };
      const res = await base44.functions.invoke('getRequestTrace', payload);
      if (res.data?.ok) {
        setResult(res.data);
      } else {
        setError(res.data?.error || 'Query failed');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const copyBundle = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    toast.success('Support bundle copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const grouped = result?.grouped_by_request;
  const singleEvents = result?.events;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(createPageUrl('Chat'))}
            className="flex items-center gap-2 text-blue-300 hover:text-blue-100 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </button>
          {result && (
            <button
              onClick={copyBundle}
              className="flex items-center gap-2 text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy support bundle'}
            </button>
          )}
        </div>

        <h1 className="text-2xl font-bold mb-1">Request Inspector</h1>
        <p className="text-white/40 text-sm mb-6">Observability Plane v1 — full pipeline stage timeline per request</p>

        {/* Query bar */}
        <div className="flex gap-2 mb-6">
          <select
            value={queryType}
            onChange={e => setQueryType(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white outline-none"
          >
            <option value="request_id">request_id</option>
            <option value="session_id">session_id</option>
          </select>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runQuery()}
            placeholder={queryType === 'request_id' ? 'Paste request_id...' : 'Paste session_id...'}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm text-white placeholder-white/30 outline-none font-mono"
          />
          <button
            onClick={runQuery}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? 'Querying...' : 'Inspect'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/50 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-4 h-4 text-white/40" />
              <span className="text-white/40 text-sm">{result.total} events</span>
              {result.query.request_id && (
                <span className="text-white/40 text-xs font-mono">{result.query.request_id}</span>
              )}
            </div>

            {/* Single request_id view */}
            {result.query.request_id && singleEvents && (
              <div className="space-y-2">
                {singleEvents.map((e, i) => <EventRow key={e.id || i} event={e} />)}
                {singleEvents.length === 0 && (
                  <p className="text-white/40 text-sm text-center py-8">No events found for this request_id.</p>
                )}
              </div>
            )}

            {/* Session view — grouped by request */}
            {result.query.session_id && grouped && (
              <div>
                {Object.entries(grouped).map(([rid, evts]) => (
                  <RequestBlock key={rid} request_id={rid} events={evts} />
                ))}
                {Object.keys(grouped).length === 0 && (
                  <p className="text-white/40 text-sm text-center py-8">No events found for this session.</p>
                )}
              </div>
            )}
          </div>
        )}

        {!result && !error && !loading && (
          <div className="text-center py-16 text-white/20 text-sm">
            Paste a <span className="font-mono">request_id</span> from an execution receipt to see the full stage timeline.
          </div>
        )}
      </div>
    </div>
  );
}