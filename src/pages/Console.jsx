import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, MessageSquare, Zap, DollarSign, AlertTriangle, Database, Clock } from 'lucide-react';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';

export default function Console() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const CAOS_SERVER = "https://nonextractive-son-ichnographical.ngrok-free.dev";

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual CAOS backend endpoints when deployed
      // const response = await fetch(`${CAOS_SERVER}/api/metrics/all`);
      // const data = await response.json();
      
      // Mock data structure - replace with real API calls
      const mockData = {
        tokens: {
          total: 0,
          this_session: 0,
          today: 0,
          this_month: 0,
          limit: 100000,
          cost_per_1k: 0.002
        },
        messages: {
          total: 0,
          user_messages: 0,
          ai_messages: 0,
          today: 0,
          limit: 1000
        },
        sessions: {
          active: 0,
          total: 0,
          avg_duration_minutes: 0
        },
        agents: {
          architect: { executions: 0, tokens: 0 },
          security: { executions: 0, tokens: 0 },
          engineer: { executions: 0, tokens: 0 },
          qa: { executions: 0, tokens: 0 },
          docs: { executions: 0, tokens: 0 }
        },
        costs: {
          today: 0,
          this_month: 0,
          total: 0
        },
        errors: {
          count_24h: 0,
          last_error: null,
          types: {}
        },
        performance: {
          avg_response_time_ms: 0,
          p95_response_time_ms: 0,
          uptime_percent: 100
        },
        memory: {
          recall_requests: 0,
          cross_session_recalls: 0,
          memory_enabled_sessions: 0
        }
      };

      setMetrics(mockData);
      setLastUpdate(new Date());
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

  const tokenUsagePercent = (metrics.tokens.this_month / metrics.tokens.limit) * 100;
  const messageUsagePercent = (metrics.messages.today / metrics.messages.limit) * 100;

  return (
    <div className="fixed inset-0 bg-[#0a1628] overflow-y-auto">
      <StarfieldBackground />
      
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">CAOS Console</h1>
            <p className="text-white/60 text-sm">
              System Metrics & Monitoring
            </p>
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="text-xs text-white/40 mb-6">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>

        {/* Token Usage */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Tokens (Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {metrics.tokens.this_month.toLocaleString()}
              </div>
              <div className="text-xs text-white/50 mb-2">
                of {metrics.tokens.limit.toLocaleString()} limit
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-yellow-400 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(tokenUsagePercent, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Messages (Today)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {metrics.messages.today}
              </div>
              <div className="text-xs text-white/50 mb-2">
                of {metrics.messages.limit} limit
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(messageUsagePercent, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                Cost (Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                ${metrics.costs.this_month.toFixed(2)}
              </div>
              <div className="text-xs text-white/50">
                Total: ${metrics.costs.total.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {metrics.sessions.active}
              </div>
              <div className="text-xs text-white/50">
                Total: {metrics.sessions.total}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              Agent Execution Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(metrics.agents).map(([agent, data]) => (
                <div key={agent} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-white/70 text-sm font-medium mb-3 uppercase">
                    {agent}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-white/50">Executions</div>
                      <div className="text-lg font-bold text-white">{data.executions}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Tokens</div>
                      <div className="text-lg font-bold text-white">{data.tokens.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance & Health */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-white/70 mb-1">Avg Response Time</div>
                  <div className="text-2xl font-bold text-white">
                    {metrics.performance.avg_response_time_ms}ms
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/70 mb-1">P95 Response Time</div>
                  <div className="text-2xl font-bold text-white">
                    {metrics.performance.p95_response_time_ms}ms
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/70 mb-1">Uptime</div>
                  <div className="text-2xl font-bold text-white">
                    {metrics.performance.uptime_percent}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Errors (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-white/70 mb-1">Error Count</div>
                  <div className="text-2xl font-bold text-white">
                    {metrics.errors.count_24h}
                  </div>
                </div>
                {metrics.errors.last_error ? (
                  <div>
                    <div className="text-sm text-white/70 mb-1">Last Error</div>
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                      {metrics.errors.last_error}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-green-400">No errors in the last 24 hours</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Memory System */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              Memory System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-2">Recall Requests</div>
                <div className="text-2xl font-bold text-white">{metrics.memory.recall_requests}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-2">Cross-Session Recalls</div>
                <div className="text-2xl font-bold text-white">{metrics.memory.cross_session_recalls}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="text-sm text-white/70 mb-2">Memory-Enabled Sessions</div>
                <div className="text-2xl font-bold text-white">{metrics.memory.memory_enabled_sessions}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backend Connection Note */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-blue-300 text-sm">
            <strong>Backend Status:</strong> Currently showing mock data. Connect to CAOS backend at <code className="bg-white/10 px-1 py-0.5 rounded text-xs">{CAOS_SERVER}/api/metrics/all</code> to display live metrics.
          </div>
        </div>
      </div>
    </div>
  );
}