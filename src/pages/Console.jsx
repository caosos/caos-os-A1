import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw, Activity, Zap, DollarSign, AlertTriangle, Database,
  Mic, ArrowLeft, Users, Globe, MessageSquare, Timer, TrendingUp, LifeBuoy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';
import SSHConsole from '@/components/console/SSHConsole';
import WebSocketAttach from '@/components/console/WebSocketAttach';
import AriaConsoleOverlay from '@/components/console/AriaConsoleOverlay';
import CostReportModal from '@/components/console/CostReportModal';
import SystemAlertsModal from '@/components/console/SystemAlertsModal';

export default function Console() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [terminalMode, setTerminalMode] = useState('metrics');
  const [showAria, setShowAria] = useState(false);
  const [showCostReport, setShowCostReport] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const metricsRef = useRef(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('getDashboardMetrics', {});
      if (res.data && !res.data.error) {
        setMetrics(res.data);
        metricsRef.current = res.data;
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <StarfieldBackground />
        <div className="text-white text-lg">Loading metrics...</div>
      </div>
    );
  }

  const m = metrics;

  return (
    <div className="fixed inset-0 bg-[#0a1628] overflow-hidden">
      <StarfieldBackground />

      {showAria && (
        <AriaConsoleOverlay
          metrics={metricsRef.current}
          onClose={() => setShowAria(false)}
        />
      )}

      <div className="relative z-10 h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wider">C·A·O·S — DUI</h1>
              <p className="text-white/40 text-xs">
                {terminalMode === 'metrics' && `Last updated: ${lastUpdate.toLocaleTimeString()} · Refresh: 15s`}
                {terminalMode === 'ssh' && 'SSH DIRECT ACCESS — LAYER 0'}
                {terminalMode === 'websocket' && 'WEBSOCKET DAEMON ATTACH'}
              </p>
            </div>
            <div className="flex gap-2">
              {['metrics', 'ssh', 'websocket'].map(mode => (
                <button key={mode}
                  onClick={() => setTerminalMode(mode)}
                  className={`px-3 py-1 rounded text-xs transition-colors capitalize ${
                    terminalMode === mode
                      ? mode === 'metrics' ? 'bg-cyan-600 text-white'
                        : mode === 'ssh' ? 'bg-green-600 text-white'
                        : 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {mode === 'metrics' ? 'Metrics' : mode === 'ssh' ? 'SSH' : 'WebSocket'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl('Chat'))}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowAria(v => !v)}
              className={`p-3 rounded-full transition-all border ${
                showAria
                  ? 'bg-cyan-500/30 border-cyan-500 text-cyan-300 animate-pulse'
                  : 'bg-white/10 border-white/20 hover:bg-white/20 text-white'
              }`}
              title="Talk to ARIA"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button onClick={fetchMetrics} disabled={loading}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* SSH Mode */}
        {terminalMode === 'ssh' && (
          <div className="flex-1 overflow-auto"><SSHConsole /></div>
        )}

        {/* WebSocket Mode */}
        {terminalMode === 'websocket' && (
          <div className="flex-1 overflow-auto">
            <WebSocketAttach onClose={() => setTerminalMode('metrics')} />
          </div>
        )}

        {/* Metrics Grid */}
        {terminalMode === 'metrics' && (
          <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden" style={{ gridTemplateRows: 'repeat(8, 1fr)' }}>

            {/* TOP ROW */}

            {/* Users Online */}
            <Card className="col-span-4 row-span-2 bg-[#0a1628]/90 border-cyan-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-cyan-400 tracking-wider flex items-center gap-2">
                  <Users className="w-3 h-3" /> USERS ONLINE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 mb-2">
                  <div>
                    <div className="text-3xl font-bold text-white">{m.users.total_active}</div>
                    <div className="text-xs text-white/40">total active</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-cyan-300">{m.users.active_registered}</div>
                    <div className="text-[10px] text-white/40">registered</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple-300">{m.users.active_guests}</div>
                    <div className="text-[10px] text-white/40">guests</div>
                  </div>
                </div>
                <div className="flex gap-3 text-[10px] text-white/40">
                  <span>Today: <span className="text-white/70">{m.users.logins_today}</span></span>
                  <span>Month: <span className="text-white/70">{m.users.logins_this_month}</span></span>
                  <span>Avg session: <span className="text-white/70">{m.users.avg_session_duration_minutes}m</span></span>
                </div>
              </CardContent>
            </Card>

            {/* User Breakdown */}
            <Card className="col-span-4 row-span-2 bg-[#0a1628]/90 border-blue-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-blue-400 tracking-wider flex items-center gap-2">
                  <Activity className="w-3 h-3" /> USER BREAKDOWN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-300">{m.users.by_login_method?.google || 0}</div>
                    <div className="text-[10px] text-white/40">Google</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-300">{m.users.by_login_method?.email || 0}</div>
                    <div className="text-[10px] text-white/40">Email</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-300">{m.users.by_login_method?.guest || 0}</div>
                    <div className="text-[10px] text-white/40">Guest</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/10 flex gap-3 text-[10px] text-white/40">
                  <span>Registered: <span className="text-white/70">{m.users.total_registered}</span></span>
                  {Object.entries(m.users.by_role || {}).map(([role, count]) => (
                    <span key={role}>{role}: <span className="text-white/70">{count}</span></span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Errors */}
            <Card className={`col-span-4 row-span-2 bg-[#0a1628]/90 backdrop-blur-sm overflow-hidden ${
              m.errors.count_24h > 0 ? 'border-red-500/50' : 'border-green-500/30'
            }`}>
              <CardHeader className="pb-1">
                <CardTitle className={`text-xs font-bold tracking-wider flex items-center gap-2 ${
                  m.errors.count_24h > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  <AlertTriangle className="w-3 h-3" /> SYSTEM ALERTS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-4 mb-2">
                  <div>
                    <div className="text-3xl font-bold text-white">{m.errors.count_24h}</div>
                    <div className="text-xs text-white/40">errors (24h)</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-orange-300">{m.errors.unresolved_count}</div>
                    <div className="text-[10px] text-white/40">unresolved</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-yellow-300">{m.errors.support_tickets_open}</div>
                    <div className="text-[10px] text-white/40">tickets open</div>
                  </div>
                </div>
                {m.errors.count_24h === 0
                  ? <div className="text-xs text-green-400">All systems nominal</div>
                  : <div className="text-[10px] text-white/40">{m.errors.count_7d} in last 7 days</div>
                }
              </CardContent>
            </Card>

            {/* MIDDLE LEFT — Geo */}
            <Card className="col-span-3 row-span-4 bg-[#0a1628]/90 border-emerald-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-emerald-400 tracking-wider flex items-center gap-2">
                  <Globe className="w-3 h-3" /> GEO DISTRIBUTION
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {m.users.countries?.length > 0
                  ? m.users.countries.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-white/70">{c.country || 'Unknown'}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 bg-emerald-500/40 rounded-full" style={{ width: `${Math.max(8, (c.count / (m.users.countries[0]?.count || 1)) * 60)}px` }} />
                        <span className="text-xs text-white font-bold w-5 text-right">{c.count}</span>
                      </div>
                    </div>
                  ))
                  : <div className="text-xs text-white/30">No location data yet</div>
                }
              </CardContent>
            </Card>

            {/* CENTER — Avatar */}
            <div className="col-span-6 row-span-4 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-pulse" style={{ animationDuration: '2s' }} />
                <div className="w-64 h-64 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border-2 border-cyan-500/50 overflow-hidden relative">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694a39ebf56fe3b59c5683d8/e47c9b9db_consoleofthefuture.png"
                    alt="CAOS AI Avatar"
                    className="w-full h-full object-cover opacity-90"
                    style={{ objectPosition: 'center 20%', transform: 'scale(2.5)', transformOrigin: 'center 35%' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-purple-900/40" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1 tracking-widest">C·A·O·S</div>
                      <div className="text-xs text-cyan-400 tracking-wider font-medium">
                        {showAria ? 'ARIA ACTIVE' : 'READY'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MIDDLE RIGHT — Token Usage */}
            <Card className="col-span-3 row-span-4 bg-[#0a1628]/90 border-yellow-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-yellow-400 tracking-wider flex items-center gap-2">
                  <Zap className="w-3 h-3" /> TOKEN USAGE
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-white">{(m.tokens.total_all_time || 0).toLocaleString()}</div>
                  <div className="text-xs text-white/40">all time</div>
                </div>
                <div className="border-t border-white/10 pt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Today</span>
                    <span className="text-white">{(m.tokens.today || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">This Month</span>
                    <span className="text-white">{(m.tokens.this_month || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-2">
                  <div className="text-[10px] text-white/40 mb-1">AVG PER MESSAGE</div>
                  <div className="text-sm font-bold text-yellow-300">{m.messages.avg_token_count || 0} tokens</div>
                </div>
              </CardContent>
            </Card>

            {/* BOTTOM ROW */}

            {/* Cost Analysis */}
            <Card className="col-span-3 row-span-2 bg-[#0a1628]/90 border-green-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-green-400 tracking-wider flex items-center gap-2">
                  <DollarSign className="w-3 h-3" /> COST ANALYSIS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-white">${m.tokens.estimated_cost_today?.toFixed(3)}</div>
                    <div className="text-[10px] text-white/40">Today</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">${m.tokens.estimated_cost_month?.toFixed(3)}</div>
                    <div className="text-[10px] text-white/40">Month</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">${m.tokens.estimated_cost_total?.toFixed(2)}</div>
                    <div className="text-[10px] text-white/40">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Stats */}
            <Card className="col-span-3 row-span-2 bg-[#0a1628]/90 border-blue-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-blue-400 tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> MESSAGES
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-lg font-bold text-white">{m.messages.total}</div>
                    <div className="text-[10px] text-white/40">total</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{m.messages.today}</div>
                    <div className="text-[10px] text-white/40">today</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white/80">{m.messages.avg_word_count}</div>
                    <div className="text-[10px] text-white/40">avg words</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white/80">{m.messages.tool_calls_total}</div>
                    <div className="text-[10px] text-white/40">tool calls</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card className="col-span-3 row-span-2 bg-[#0a1628]/90 border-orange-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-orange-400 tracking-wider flex items-center gap-2">
                  <Timer className="w-3 h-3" /> PERFORMANCE
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">Avg Latency</span>
                    <span className="text-sm font-bold text-white">{m.performance.avg_response_time_ms}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50">P95 Latency</span>
                    <span className={`text-sm font-bold ${m.performance.p95_response_time_ms > 5000 ? 'text-red-400' : 'text-white'}`}>
                      {m.performance.p95_response_time_ms}ms
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Memory System */}
            <Card className="col-span-3 row-span-2 bg-[#0a1628]/90 border-purple-500/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-bold text-purple-400 tracking-wider flex items-center gap-2">
                  <Database className="w-3 h-3" /> MEMORY SYSTEM
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{m.memory.recall_requests}</div>
                    <div className="text-[10px] text-white/40">Recalls</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{m.memory.cross_session_recalls}</div>
                    <div className="text-[10px] text-white/40">Cross-Session</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{m.memory.active_sessions_with_memory}</div>
                    <div className="text-[10px] text-white/40">Active</div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}