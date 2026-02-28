import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Clock, Search, ChevronDown, ChevronRight, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const STAGE_COLORS = {
  AUTH:           'bg-purple-500/20 text-purple-300 border-purple-500/30',
  PROFILE_LOAD:   'bg-blue-500/20 text-blue-300 border-blue-500/30',
  MEMORY_WRITE:   'bg-green-500/20 text-green-300 border-green-500/30',
  HISTORY_LOAD:   'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  HEURISTICS:     'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  PROMPT_BUILD:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  OPENAI_CALL:    'bg-red-500/20 text-red-300 border-red-500/30',
  MESSAGE_SAVE:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  RESPONSE_BUILD: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  EXECUTION_HOST: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const ERROR_CODE_LABELS = {
  RATE_LIMIT_EXCEEDED:     '🚦 Rate Limit',
  CONTEXT_LENGTH_EXCEEDED: '📏 Context Too Long',
  AUTH_FAILURE:            '🔒 Auth Failure',
  TIMEOUT:                 '⏱️ Timeout',
  EMPTY_RESPONSE:          '📭 Empty Response',
  NETWORK_ERROR:           '🌐 Network Error',
  QUOTA_EXCEEDED:          '📊 Quota Exceeded',
  OPENAI_CALL_FAILED:      '🤖 OpenAI Failed',
  MEMORY_WRITE_FAILED:     '🧠 Memory Write Failed',
  DATA_LOAD_FAILED:        '💾 Data Load Failed',
  INTERNAL_ERROR:          '⚠️ Internal Error',
};

function ErrorRow({ error }) {
  const [expanded, setExpanded] = useState(false);

  const stage = error.stage || 'UNKNOWN';
  const stageClass = STAGE_COLORS[stage] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  const errorCodeLabel = ERROR_CODE_LABELS[error.error_code] || error.error_code || 'unknown';
  const isOdel = !!error.error_id;

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden select-text">
      <div
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            {isOdel && (
              <span className="text-[10px] font-mono text-green-400 border border-green-500/30 bg-green-500/10 rounded px-1.5 py-0.5">ODEL v1</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded border font-mono ${stageClass}`}>{stage}</span>
            {error.error_code && (
              <span className="text-xs text-orange-300 bg-orange-500/10 border border-orange-500/30 rounded px-2 py-0.5">{errorCodeLabel}</span>
            )}
            {error.retry_attempted && (
              <span className="text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-0.5">Retried</span>
            )}
          </div>
          <p className="text-sm text-red-300 font-medium truncate">{error.error_message}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
            {error.error_id && <span className="font-mono">ID: {error.error_id.substring(0, 12)}…</span>}
            {error.latency_ms && <span>⏱️ {error.latency_ms}ms</span>}
            {error.model_used && <span>🤖 {error.model_used}</span>}
            <span>{new Date(error.created_date).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-white/40" />
            : <ChevronRight className="w-4 h-4 text-white/40" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 bg-black/20 p-4 space-y-3 text-xs">
          {error.user_email && (
            <div><span className="text-white/40">User: </span><span className="text-white/80">{error.user_email}</span></div>
          )}
          {error.conversation_id && error.conversation_id !== 'none' && (
            <div><span className="text-white/40">Session: </span><span className="font-mono text-white/80">{error.conversation_id}</span></div>
          )}
          {error.system_version && (
            <div><span className="text-white/40">System: </span><span className="text-white/80">{error.system_version}</span></div>
          )}
          {error.lost_message_content && (
            <div>
              <div className="text-white/40 mb-1">Lost message:</div>
              <div className="bg-white/5 rounded p-2 text-white/70 break-words">{error.lost_message_content.substring(0, 400)}{error.lost_message_content.length > 400 && '…'}</div>
            </div>
          )}
          {error.stack_trace && (
            <div>
              <div className="text-white/40 mb-1">Stack trace:</div>
              <pre className="bg-black/40 rounded p-2 text-white/60 overflow-x-auto whitespace-pre-wrap">{error.stack_trace}</pre>
            </div>
          )}
          {error.request_payload && (
            <div>
              <div className="text-white/40 mb-1">Request payload:</div>
              <pre className="bg-black/40 rounded p-2 text-white/60 overflow-x-auto whitespace-pre-wrap text-[10px]">{JSON.stringify(error.request_payload, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Logs() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');
  const [filterCode, setFilterCode] = useState('ALL');
  const [user, setUser] = useState(null);

  const fetchErrors = async () => {
    setLoading(true);
    try {
      const logs = await base44.asServiceRole.entities.ErrorLog.filter({}, '-created_date', 100);
      setErrors(logs || []);
    } catch (e) {
      console.error('Failed to load logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        if (u.role !== 'admin') {
          navigate(createPageUrl('Chat'));
          return;
        }
        fetchErrors();
      } catch {
        navigate(createPageUrl('Chat'));
      }
    };
    init();
  }, []);

  const stages = ['ALL', ...Object.keys(STAGE_COLORS)];
  const codes = ['ALL', ...Object.keys(ERROR_CODE_LABELS)];

  const filtered = errors.filter(e => {
    const matchSearch = !search || 
      e.error_message?.toLowerCase().includes(search.toLowerCase()) ||
      e.error_id?.includes(search) ||
      e.error_code?.toLowerCase().includes(search.toLowerCase()) ||
      e.stage?.toLowerCase().includes(search.toLowerCase()) ||
      e.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchStage = filterStage === 'ALL' || e.stage === filterStage;
    const matchCode = filterCode === 'ALL' || e.error_code === filterCode;
    return matchSearch && matchStage && matchCode;
  });

  const odelCount = errors.filter(e => !!e.error_id).length;
  const legacyCount = errors.length - odelCount;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl('Chat'))}
              className="flex items-center gap-2 text-blue-300 hover:text-blue-100 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </button>
          </div>
          <Button
            onClick={fetchErrors}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">System Logs</h1>
          <p className="text-blue-300 text-sm mt-1">CAOS error log — ODEL v1 structured envelopes</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70">
              Total: {errors.length}
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-300">
              ODEL v1: {odelCount}
            </span>
            {legacyCount > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-gray-500/10 border border-gray-500/30 text-gray-400">
                Legacy (pre-ODEL): {legacyCount}
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by message, error ID, stage..."
              className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-white/30 focus:border-blue-400/50"
            />
          </div>
          <select
            value={filterStage}
            onChange={e => setFilterStage(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-blue-400/50"
          >
            {stages.map(s => <option key={s} value={s} className="bg-[#0a1628]">{s === 'ALL' ? 'All Stages' : s}</option>)}
          </select>
          <select
            value={filterCode}
            onChange={e => setFilterCode(e.target.value)}
            className="bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-blue-400/50"
          >
            {codes.map(c => <option key={c} value={c} className="bg-[#0a1628]">{c === 'ALL' ? 'All Error Codes' : (ERROR_CODE_LABELS[c] || c)}</option>)}
          </select>
        </div>

        {/* Log list */}
        {loading && errors.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-white/40">
            <RefreshCw className="w-5 h-5 animate-spin mr-3" />
            Loading logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle className="w-10 h-10 text-green-400" />
            <p className="text-white/50">{errors.length === 0 ? 'No errors logged — system is clean.' : 'No results match your filters.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(error => (
              <ErrorRow key={error.id} error={error} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}