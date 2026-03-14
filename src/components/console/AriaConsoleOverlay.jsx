import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, MicOff, Volume2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ttcSpeak, ttsStop } from '@/components/chat/ttsController';

export default function AriaConsoleOverlay({ metrics: initialMetrics, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'aria', text: 'ARIA online. Dashboard loaded. Ask me anything about the system — errors, costs, performance, users.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState(initialMetrics);
  const recognitionRef = useRef(null);
  const bottomRef = useRef(null);

  // Refresh metrics every 15s so ARIA always has fresh data
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await base44.functions.invoke('getDashboardMetrics', {});
        if (res.data && !res.data.error) setLiveMetrics(res.data);
      } catch (_) {}
    };
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);

    try {
      const res = await base44.functions.invoke('consoleChat', { message: msg, metrics: liveMetrics });
      const reply = res.data?.reply || 'No response.';
      setMessages(prev => [...prev, { role: 'aria', text: reply }]);
      ttsStop();
      ttcSpeak(reply, { engine: 'webspeech' });
    } catch (e) {
      setMessages(prev => [...prev, { role: 'aria', text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      send(t);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl mx-4 bg-[#0a1628] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
           style={{ maxHeight: '70vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-cyan-400 text-sm font-bold tracking-wider">ARIA — CONSOLE MODE</span>
            {metrics && (
              <span className="text-white/30 text-xs">
                {metrics.users?.total_active ?? 0} active · ${metrics.tokens?.estimated_cost_today?.toFixed(3) ?? '0.000'} today
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600/30 text-white border border-blue-500/30'
                  : 'bg-cyan-500/10 text-cyan-100 border border-cyan-500/20'
              }`}>
                {m.role === 'aria' && (
                  <div className="text-[10px] text-cyan-400/60 uppercase tracking-wider mb-1">ARIA</div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-cyan-500/20 p-3 flex gap-2 bg-black/20">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask ARIA about the dashboard..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={toggleVoice}
            className={`p-2 rounded-lg border transition-all ${
              isListening
                ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse'
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-cyan-600/30 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}