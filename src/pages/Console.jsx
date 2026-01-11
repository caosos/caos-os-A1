import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Activity, MessageSquare, Zap, DollarSign, AlertTriangle, Database, Clock, Mic, Volume2, ArrowLeft, FileText, HardDrive, Timer, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';
import SSHConsole from '@/components/console/SSHConsole';
import WebSocketAttach from '@/components/console/WebSocketAttach';

export default function Console() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [pendingIntent, setPendingIntent] = useState(null);
  const [terminalMode, setTerminalMode] = useState('metrics'); // 'metrics', 'ssh', 'websocket'
  const recognitionRef = useRef(null);

  const CAOS_SERVER = "https://nonextractive-son-ichnographical.ngrok-free.dev";

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const text = event.results[event.results.length - 1][0].transcript;
        setTranscript(text);
        handleVoiceCommand(text);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    }
  };

  const handleVoiceCommand = async (command) => {
    console.log('[Voice → CAOS] Transcript:', command);
    
    try {
      const response = await fetch(`${CAOS_SERVER}/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: command,
          session: 'console_voice_session',
          memory_gate: {
            allowed: true,
            scope: 'session',
            explicit_recall: false,
            reason: 'Voice console session'
          },
          recall: {
            mode: 'session_tail',
            limit: 10
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        speakResponse(data.reply || 'I heard you');
      } else {
        speakResponse('Sorry, I had trouble understanding that');
      }
    } catch (error) {
      console.error('[CAOS] Connection failed:', error);
      speakResponse('Connection error. Please check the server.');
    }
  };

  const speakResponse = (text) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

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
        },
        export: {
          last_exported_seq: 0,
          latest_committed_seq: 0,
          lag: 0,
          lag_threshold: 100,
          last_export_ts: null,
          health_status: 'healthy'
        },
        pending_resolution: {
          count: 0,
          oldest_age_hours: 0,
          count_threshold: 50,
          ttl_expirations_24h: 0
        },
        wal: {
          last_checkpoint_ms: 0,
          checkpoint_lag_ms: 0,
          write_latency_p95_ms: 0,
          wal_size_kb: 0,
          status: 'healthy'
        },
        rebuild: {
          in_progress: false,
          progress_percent: 0,
          parity_status: 'verified',
          last_rebuild_ts: null,
          shadow_lag: 0
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
    <div className="fixed inset-0 bg-[#0a1628] overflow-hidden">
      <StarfieldBackground />
      
      <div className="relative z-10 h-full flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wider">C-A-O-S D-U-I</h1>
                <p className="text-white/60 text-xs">
                  {terminalMode === 'metrics' && 'CONTEXTUALLY ADAPTIVE OPERATING SYSTEM'}
                  {terminalMode === 'ssh' && 'SSH DIRECT ACCESS - LAYER 0'}
                  {terminalMode === 'websocket' && 'WEBSOCKET DAEMON ATTACH'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTerminalMode('metrics')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    terminalMode === 'metrics'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  Metrics
                </button>
                <button
                  onClick={() => setTerminalMode('ssh')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    terminalMode === 'ssh'
                      ? 'bg-green-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  SSH
                </button>
                <button
                  onClick={() => setTerminalMode('websocket')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    terminalMode === 'websocket'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  WebSocket
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl('Chat'))}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={toggleVoiceInput}
              className={`p-3 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-500/30 border-2 border-red-500 animate-pulse' 
                  : 'bg-white/10 border border-white/20 hover:bg-white/20'
              }`}
              title={isListening ? 'Stop Listening' : 'Start Voice Input'}
            >
              <Mic className={`w-5 h-5 ${isListening ? 'text-red-400' : 'text-white'}`} />
            </button>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors disabled:opacity-50"
              title="Refresh Metrics"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Whisper Transcript Display */}
        {transcript && (
          <div className="mb-3 px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded">
            <div className="text-[10px] text-blue-400/60 uppercase tracking-wider mb-1">Raw Transcript (Whisper)</div>
            <div className="text-blue-300 text-sm">"{transcript}"</div>
          </div>
        )}

        {/* Pending Intent (from CAOS) */}
        {pendingIntent && (
          <div className="mb-3 px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded">
            <div className="text-[10px] text-yellow-400/60 uppercase tracking-wider mb-1">Pending Action (Requires Approval)</div>
            <div className="text-yellow-300 text-sm">{pendingIntent}</div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  // Send approval to CAOS
                  fetch(`${CAOS_SERVER}/api/console/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ intent: pendingIntent, approved: true })
                  }).then(() => setPendingIntent(null));
                }}
                className="px-3 py-1 bg-green-500/30 hover:bg-green-500/40 border border-green-500/50 rounded text-green-300 text-xs"
              >
                Approve
              </button>
              <button
                onClick={() => setPendingIntent(null)}
                className="px-3 py-1 bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 rounded text-red-300 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* SSH Console Mode */}
        {terminalMode === 'ssh' && (
          <div className="flex-1 overflow-auto">
            <SSHConsole />
          </div>
        )}

        {/* WebSocket Attach Mode */}
        {terminalMode === 'websocket' && (
          <div className="flex-1 overflow-auto">
            <WebSocketAttach onClose={() => setTerminalMode('metrics')} />
          </div>
        )}

        {/* Main Grid Layout */}
        {terminalMode === 'metrics' && (
        <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden" style={{ gridTemplateRows: 'repeat(8, 1fr)' }}>
          {/* Top Left - Real-Time Query */}
          <Card className="col-span-4 row-span-2 bg-[#0a1628]/90 border-cyan-500/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-cyan-400 tracking-wider">REAL-TIME QUERY</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3rem)]">
              <div className="h-full flex flex-col justify-between">
                <div className="text-sm text-white/80 mb-2">Messages: {metrics.messages.today}/{metrics.messages.limit}</div>
                <div className="relative h-20">
                  <svg className="w-full h-full" viewBox="0 0 200 40">
                    <polyline
                      points="0,30 20,25 40,28 60,20 80,22 100,15 120,18 140,12 160,16 180,10 200,14"
                      fill="none"
                      stroke="rgb(34, 211, 238)"
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Middle - Performance */}
          <Card className="col-span-4 row-span-2 bg-[#0a1628]/90 border-blue-500/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-blue-400 tracking-wider">PERFORMANCE</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Response Time</span>
                  <span className="text-sm font-bold text-white">{metrics.performance.avg_response_time_ms}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Uptime</span>
                  <span className="text-sm font-bold text-green-400">{metrics.performance.uptime_percent}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Right - Errors */}
          <Card className="col-span-4 row-span-2 bg-[#0a1628]/90 border-red-500/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-red-400 tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                SYSTEM ALERTS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-1">{metrics.errors.count_24h}</div>
              <div className="text-xs text-white/50">errors (24h)</div>
              {metrics.errors.count_24h === 0 && (
                <div className="text-xs text-green-400 mt-2">All systems nominal</div>
              )}
            </CardContent>
          </Card>

          {/* Middle Left - Agent Status */}
          <Card className="col-span-3 row-span-4 bg-[#0a1628]/90 border-purple-500/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-purple-400 tracking-wider">AGENT MATRIX</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(metrics.agents).map(([agent, data]) => (
                <div key={agent} className="bg-white/5 border border-white/10 rounded p-2">
                  <div className="text-xs font-bold text-white/80 uppercase mb-1">{agent}</div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/50">Exec: {data.executions}</span>
                    <span className="text-cyan-400">{data.tokens}t</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Center - CAOS Avatar (Storm-like AI) */}
          <div className="col-span-6 row-span-4 flex items-center justify-center">
            <div className="relative">
              {/* Glowing rings */}
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-pulse" style={{ animationDuration: '2s' }}></div>
              
              {/* Main avatar container */}
              <div className="w-64 h-64 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border-2 border-cyan-500/50 overflow-hidden relative">
                {/* Storm-like AI woman image */}
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694a39ebf56fe3b59c5683d8/e47c9b9db_consoleofthefuture.png"
                  alt="CAOS AI Avatar"
                  className="w-full h-full object-cover opacity-90"
                  style={{ 
                    objectPosition: 'center 20%',
                    transform: 'scale(2.5)',
                    transformOrigin: 'center 35%'
                  }}
                />
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-purple-900/40"></div>
                
                {/* Status overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1 tracking-widest">C·A·O·S</div>
                    <div className="text-xs text-cyan-400 tracking-wider font-medium">
                      {isListening ? 'LISTENING...' : isSpeaking ? 'SPEAKING...' : 'READY'}
                    </div>
                    {(isListening || isSpeaking) && (
                      <div className="mt-2 flex justify-center gap-1">
                        <div className="w-1 h-3 bg-cyan-400 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-5 bg-cyan-400 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                        <div className="w-1 h-4 bg-cyan-400 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-1 h-6 bg-cyan-400 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-1 h-3 bg-cyan-400 animate-pulse" style={{ animationDelay: '400ms' }}></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Energy particles when active */}
                {(isListening || isSpeaking) && (
                  <>
                    <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                    <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                    <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '400ms' }}></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Middle Right - Token Usage */}
          <Card className="col-span-3 row-span-4 bg-[#0a1628]/90 border-yellow-500/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-yellow-400 tracking-wider flex items-center gap-2">
                <Zap className="w-3 h-3" />
                TOKEN USAGE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {metrics.tokens.this_month.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/50 mb-2">
                    of {metrics.tokens.limit.toLocaleString()}
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(tokenUsagePercent, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Today</span>
                    <span className="text-white">{metrics.tokens.today.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-white/50">Session</span>
                    <span className="text-white">{metrics.tokens.this_session.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Left - Cost Tracking */}
          <Card className="col-span-4 row-span-2 bg-[#0a1628]/90 border-green-500/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-green-400 tracking-wider flex items-center gap-2">
                <DollarSign className="w-3 h-3" />
                COST ANALYSIS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-white/50">Today</div>
                  <div className="text-lg font-bold text-white">${metrics.costs.today.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Month</div>
                  <div className="text-lg font-bold text-white">${metrics.costs.this_month.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/50">Total</div>
                  <div className="text-lg font-bold text-white">${metrics.costs.total.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Middle - Memory System */}
          <Card className="col-span-4 row-span-2 bg-[#0a1628]/90 border-purple-500/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-purple-400 tracking-wider flex items-center gap-2">
                <Database className="w-3 h-3" />
                MEMORY SYSTEM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-white">{metrics.memory.recall_requests}</div>
                  <div className="text-[10px] text-white/50">Recalls</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{metrics.memory.cross_session_recalls}</div>
                  <div className="text-[10px] text-white/50">Cross-Session</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{metrics.memory.memory_enabled_sessions}</div>
                  <div className="text-[10px] text-white/50">Active</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Right - Session Info */}
          <Card className="col-span-4 row-span-2 bg-[#0a1628]/90 border-cyan-500/30 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-cyan-400 tracking-wider flex items-center gap-2">
                <Activity className="w-3 h-3" />
                SESSIONS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold text-white">{metrics.sessions.active}</div>
                  <div className="text-xs text-white/50">Active</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{metrics.sessions.total}</div>
                  <div className="text-xs text-white/50">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Row 7 - CAOS-A1 v1.5 Monitoring */}

          {/* Export Health */}
          <Card className={`col-span-3 row-span-2 bg-[#0a1628]/90 backdrop-blur-sm overflow-hidden ${
            metrics.export.lag > metrics.export.lag_threshold ? 'border-red-500/50' : 'border-green-500/30'
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-bold tracking-wider flex items-center gap-2 ${
                metrics.export.lag > metrics.export.lag_threshold ? 'text-red-400' : 'text-green-400'
              }`}>
                <FileText className="w-3 h-3" />
                EXPORT HEALTH
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Export Lag</span>
                  <span className={`text-sm font-bold ${
                    metrics.export.lag > metrics.export.lag_threshold ? 'text-red-400' : 'text-white'
                  }`}>
                    {metrics.export.lag} seq
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Status</span>
                  <span className={`text-xs font-bold uppercase ${
                    metrics.export.health_status === 'healthy' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {metrics.export.health_status}
                  </span>
                </div>
                {metrics.export.lag > metrics.export.lag_threshold && (
                  <div className="text-[10px] text-red-400/80 mt-2">
                    ⚠ Threshold: {metrics.export.lag_threshold}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Resolution */}
          <Card className={`col-span-3 row-span-2 bg-[#0a1628]/90 backdrop-blur-sm overflow-hidden ${
            metrics.pending_resolution.count > metrics.pending_resolution.count_threshold ? 'border-red-500/50' : 'border-yellow-500/30'
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-bold tracking-wider flex items-center gap-2 ${
                metrics.pending_resolution.count > metrics.pending_resolution.count_threshold ? 'text-red-400' : 'text-yellow-400'
              }`}>
                <AlertTriangle className="w-3 h-3" />
                PENDING RESOLUTION
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Count</span>
                  <span className={`text-sm font-bold ${
                    metrics.pending_resolution.count > metrics.pending_resolution.count_threshold ? 'text-red-400' : 'text-white'
                  }`}>
                    {metrics.pending_resolution.count}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Oldest</span>
                  <span className="text-sm font-bold text-white">{metrics.pending_resolution.oldest_age_hours}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">TTL Expired (24h)</span>
                  <span className="text-sm font-bold text-white">{metrics.pending_resolution.ttl_expirations_24h}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WAL Checkpoint Health */}
          <Card className={`col-span-3 row-span-2 bg-[#0a1628]/90 backdrop-blur-sm overflow-hidden ${
            metrics.wal.status === 'healthy' ? 'border-blue-500/30' : 'border-orange-500/50'
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-bold tracking-wider flex items-center gap-2 ${
                metrics.wal.status === 'healthy' ? 'text-blue-400' : 'text-orange-400'
              }`}>
                <HardDrive className="w-3 h-3" />
                WAL CHECKPOINT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Last Checkpoint</span>
                  <span className="text-sm font-bold text-white">{metrics.wal.last_checkpoint_ms}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Write P95</span>
                  <span className="text-sm font-bold text-white">{metrics.wal.write_latency_p95_ms}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">WAL Size</span>
                  <span className="text-sm font-bold text-white">{metrics.wal.wal_size_kb}KB</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Index Rebuild Status */}
          <Card className={`col-span-3 row-span-2 bg-[#0a1628]/90 backdrop-blur-sm overflow-hidden ${
            metrics.rebuild.in_progress ? 'border-cyan-500/50 animate-pulse' : 'border-purple-500/30'
          }`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-xs font-bold tracking-wider flex items-center gap-2 ${
                metrics.rebuild.in_progress ? 'text-cyan-400' : 'text-purple-400'
              }`}>
                <Timer className="w-3 h-3" />
                INDEX REBUILD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Status</span>
                  <span className={`text-xs font-bold uppercase ${
                    metrics.rebuild.in_progress ? 'text-cyan-400' : 'text-white'
                  }`}>
                    {metrics.rebuild.in_progress ? 'IN PROGRESS' : 'IDLE'}
                  </span>
                </div>
                {metrics.rebuild.in_progress && (
                  <div className="space-y-1">
                    <div className="text-xs text-white/60">Progress</div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-cyan-400 h-2 rounded-full transition-all"
                        style={{ width: `${metrics.rebuild.progress_percent}%` }}
                      />
                    </div>
                    <div className="text-xs text-white text-right">{metrics.rebuild.progress_percent}%</div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Parity</span>
                  <span className={`text-xs font-bold uppercase ${
                    metrics.rebuild.parity_status === 'verified' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {metrics.rebuild.parity_status}
                  </span>
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