import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ERROR_TYPE_COLORS = {
  server_error: 'text-red-400 bg-red-500/10 border-red-500/30',
  timeout:      'text-orange-400 bg-orange-500/10 border-orange-500/30',
  network_error:'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  unknown:      'text-white/50 bg-white/5 border-white/10',
  message_send_failed: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export default function SystemAlertsModal({ metrics, onClose }) {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unresolved | 24h | 7d

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getDashboardMetrics', {});
      if (res.data?.error_records) {
        setErrors(res.data.error_records);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const now = Date.now();
  const filtered = errors.filter(e => {
    if (filter === 'unresolved') return !e.resolved;
    if (filter === '24h') return e.created_date && (now - new Date(e.created_date)) < 86400000;
    if (filter === '7d')  return e.created_date && (now - new Date(e.created_date)) < 7 * 86400000;
    return true;
  });

  const m = metrics?.errors || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-[#0a1628] border border-red-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-red-500/20 bg-red-500/5 shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-bold tracking-wider text-sm">SYSTEM ALERTS</span>
            <span className="text-white/30 text-xs">{m.unresolved_count} unresolved · {m.count_7d} in 7d</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-0 border-b border-white/10 shrink-0">
          {[
            { label: '24h', value: m.count_24h, color: 'text-red-300' },
            { label: '7 Days', value: m.count_7d, color: 'text-orange-300' },
            { label: 'Unresolved', value: m.unresolved_count, color: 'text-yellow-300' },
            { label: 'Tickets Open', value: m.support_tickets_open, color: 'text-blue-300' },
          ].map((s, i) => (
            <div key={i} className="px-4 py-3 text-center border-r border-white/10 last:border-0">
              <div className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</div>
              <div className="text-[10px] text-white/40">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-white/10 shrink-0">
          {['all', 'unresolved', '24h', '7d'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs transition-colors uppercase tracking-wide ${
                filter === f ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-white/40 hover:text-white/70'
              }`}>
              {f === 'all' ? 'All' : f === 'unresolved' ? 'Unresolved' : f === '24h' ? 'Last 24h' : 'Last 7d'}
            </button>
          ))}
          <span className="ml-auto text-xs text-white/30 self-center">{filtered.length} shown</span>
        </div>

        {/* Error List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-white/40 text-sm">Loading errors...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-green-400 text-sm">No errors in this filter</div>
            </div>
          ) : (
            filtered.map((err, i) => {
              const colorClass = ERROR_TYPE_COLORS[err.error_type] || ERROR_TYPE_COLORS.unknown;
              const age = err.created_date
                ? (() => {
                    const diff = now - new Date(err.created_date);
                    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
                    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
                    return `${Math.floor(diff/86400000)}d ago`;
                  })()
                : 'unknown';
              return (
                <div key={i} className={`rounded-xl border p-3 ${colorClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                          {err.error_type?.replace(/_/g, ' ') || 'unknown'}
                        </span>
                        {err.error_code && (
                          <span className="text-[10px] font-mono bg-black/30 px-1.5 py-0.5 rounded text-white/50">
                            {err.error_code}
                          </span>
                        )}
                        {err.resolved && (
                          <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded">
                            resolved
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/80 truncate">{err.error_message || 'No message'}</div>
                      {err.user_email && (
                        <div className="text-[10px] text-white/40 mt-1">{err.user_email}</div>
                      )}
                    </div>
                    <div className="text-[10px] text-white/30 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{age}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}