import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Activity, MessageSquare, Zap, DollarSign, AlertTriangle, Database, Clock, Mic, Volume2 } from 'lucide-react';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from '@/api/base44Client';

export default function Console() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
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
    // Send command to CAOS backend
    console.log('Voice command:', command);
    
    // Get AI response
    const response = await fetch(`${CAOS_SERVER}/api/console/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    }).catch(() => {
      return { ok: false };
    });

    if (response.ok) {
      const data = await response.json();
      speakResponse(data.reply || 'Command received');
    } else {
      speakResponse('Console interface ready for commands');
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
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">C-A-O-S D-U-I</h1>
            <p className="text-white/60 text-xs">
              CONTEXTUALLY ADAPTIVE OPERATING SYSTEM
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleVoiceInput}
              className={`p-3 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-500/30 border-2 border-red-500 animate-pulse' 
                  : 'bg-white/10 border border-white/20 hover:bg-white/20'
              }`}
            >
              <Mic className={`w-5 h-5 ${isListening ? 'text-red-400' : 'text-white'}`} />
            </button>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {transcript && (
          <div className="mb-3 px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded text-blue-300 text-sm">
            "{transcript}"
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-3 overflow-hidden">
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

          {/* Center - CAOS Avatar */}
          <div className="col-span-6 row-span-4 flex items-center justify-center">
            <div className="relative">
              <div className="w-64 h-64 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border-2 border-cyan-500/50 flex items-center justify-center animate-pulse">
                <div className="w-56 h-56 rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-blue-400/40 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-white mb-2 tracking-widest">CAOS</div>
                    <div className="text-xs text-cyan-400 tracking-wider">{isListening ? 'LISTENING...' : isSpeaking ? 'SPEAKING...' : 'READY'}</div>
                    {(isListening || isSpeaking) && (
                      <div className="mt-3 flex justify-center gap-1">
                        <div className="w-1 h-4 bg-cyan-400 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-6 bg-cyan-400 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                        <div className="w-1 h-5 bg-cyan-400 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                        <div className="w-1 h-7 bg-cyan-400 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                        <div className="w-1 h-4 bg-cyan-400 animate-pulse" style={{ animationDelay: '400ms' }}></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: '3s' }}></div>
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
      </div>
    </div>
  );
}