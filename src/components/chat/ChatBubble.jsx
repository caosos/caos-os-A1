import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';
import { Download, Mail, Copy, RotateCcw, Volume2, Settings, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock, X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import TextSelectionMenu from './TextSelectionMenu';
import CopyBlock from './CopyBlock';
import LinkPreview from './LinkPreview';
import VoiceSettings from './VoiceSettings';
import ExecutionReceipt from './ExecutionReceipt';
import LatencyIndicator from './LatencyIndicator';
import WCWStatusBadge from './WCWStatusBadge';
import DegradationNotice from './DegradationNotice';

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

// Global audio manager - only one audio plays at a time
let globalAudioInstance = null;
let globalAudioCleanup = null;

// Audio cache - store generated audio per message
const audioCache = new Map();

export default function ChatBubble({ message, isUser, onUpdateMessage, closeMenuTrigger, userInitials = "ME" }) {
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPausedBySpeech, setIsPausedBySpeech] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [speechProgress, setSpeechProgress] = useState(0);
  const [showExecution, setShowExecution] = useState(() => {
    return localStorage.getItem('caos_show_execution') === 'true';
  });
  const justSelectedRef = React.useRef(false);
  const audioRef = React.useRef(null);
  const utteranceRef = React.useRef(null);
  const progressInterval = React.useRef(null);
  const cacheKey = `${message.id}_${localStorage.getItem('caos_voice_preference_message') || 'nova'}_${localStorage.getItem('caos_speech_rate') || '1.0'}`;

  useEffect(() => {
    const handleStorageChange = () => {
      setShowExecution(localStorage.getItem('caos_show_execution') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('caos-execution-toggle', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('caos-execution-toggle', handleStorageChange);
    };
  }, []);

  React.useEffect(() => {
    if (closeMenuTrigger > 0) {
      setShowSelectionMenu(false);
    }
  }, [closeMenuTrigger]);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      // Ignore if we just made a selection
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }

      if (showSelectionMenu) {
        // Don't close if clicking within the menu or message bubble
        const menu = document.querySelector('[data-selection-menu]');
        const bubble = e.target.closest('[data-message-bubble]');
        
        if (!menu?.contains(e.target) && !bubble) {
          setShowSelectionMenu(false);
          window.getSelection().removeAllRanges();
        }
      }
    };

    if (showSelectionMenu) {
      // Add delay to prevent immediate closure from the selection event
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 200);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showSelectionMenu]);

  const handleTextSelection = (e) => {
    // Only show menu on right-click, not on normal selection
    if (e.type === 'contextmenu') {
      e.preventDefault();
      e.stopPropagation();
      
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 0) {
        justSelectedRef.current = true;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(text);
        
        // Position menu - check space and avoid input bar at bottom
        const spaceBelow = window.innerHeight - rect.bottom - 100;
        const menuHeight = 200;
        
        setMenuPosition({
          top: spaceBelow < menuHeight 
            ? Math.max(20, rect.top + window.scrollY - menuHeight - 8)
            : rect.bottom + window.scrollY + 8,
          left: Math.min(rect.left + window.scrollX, window.innerWidth - 300),
        });
        setShowSelectionMenu(true);
        
        // Reset the flag after a bit
        setTimeout(() => {
          justSelectedRef.current = false;
        }, 300);
      }
    }
  };

  const handleReact = async (text, emoji) => {
    const reactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
    reactions.push({ emoji, selected_text: text });
    
    // Get AI acknowledgment from CAOS backend
    try {
      const response = await fetch("http://172.234.25.199:3001/api/message", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          message: `[USER REACTED WITH ${emoji} TO: "${text}"]`,
          session: message.conversation_id,
          context_type: "inline_reaction"
        })
      });

      const data = await response.json();
      const aiResponse = data.reply || data.content || data.message || `Acknowledged ${emoji}`;

      const replies = Array.isArray(message.replies) ? [...message.replies] : [];
      replies.push({ 
        selected_text: text, 
        user_reply: `Reacted with ${emoji}`,
        ai_response: aiResponse,
        timestamp: new Date().toISOString()
      });
      
      onUpdateMessage(message.id, { reactions, replies });
    } catch (error) {
      console.error('Error getting reaction response:', error);
      toast.error('Failed to get response');
    }
  };

  const handleReply = async (text, replyContent) => {
    try {
      // Get AI response from CAOS backend
      const response = await fetch("http://172.234.25.199:3001/api/message", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          message: `[USER REPLIED TO: "${text}"]\n\nUser's reply: ${replyContent}`,
          session: message.conversation_id,
          context_type: "inline_reply"
        })
      });

      const data = await response.json();
      const aiResponse = data.reply || data.content || data.message || 'Response received';

      const replies = Array.isArray(message.replies) ? [...message.replies] : [];
      replies.push({ 
        selected_text: text, 
        user_reply: replyContent,
        ai_response: aiResponse,
        timestamp: new Date().toISOString()
      });
      onUpdateMessage(message.id, { replies });
    } catch (error) {
      console.error('Error getting reply response:', error);
      toast.error('Failed to get response');
    }
  };
  const getYouTubeId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const extractUrls = (text) => {
    if (!text) return [];
    
    // Extract URLs from both bare URLs and markdown links [text](url)
    const urls = [];
    
    // Match markdown links: [text](url)
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = markdownRegex.exec(text)) !== null) {
      urls.push(match[2]); // The URL is in the second capture group
    }
    
    // Match bare URLs
    const urlRegex = /https?:\/\/[^\s)\]]+/g;
    const bareUrls = text.match(urlRegex) || [];
    urls.push(...bareUrls);
    
    // Remove duplicates
    return [...new Set(urls)];
  };

  const getVimeoId = (url) => {
    const regExp = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[3] : null;
  };

  const isVideoUrl = (url) => {
    return getYouTubeId(url) || getVimeoId(url);
  };

  const formatDateTime = (timestamp) => {
    return moment(timestamp).format('MMM D, YYYY • h:mm A');
  };

  const downloadFile = (content, filename) => {
    const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const isEmailableContent = (content) => {
    if (!content) return false;
    const lower = content.toLowerCase();
    return (
      content.includes('- [ ]') || 
      content.includes('- [x]') ||
      lower.includes('checklist') ||
      lower.includes('memo:') ||
      lower.includes('subject:') ||
      (content.split('\n').length > 3 && content.includes('-'))
    );
  };

  const handleEmailContent = () => {
    const subject = encodeURIComponent('From CAOS');
    const body = encodeURIComponent(message.content);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success('Opening email client...');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Copied to clipboard');
  };

  const stopAllAudio = () => {
    if (globalAudioInstance) {
      globalAudioInstance.pause();
      globalAudioInstance.currentTime = 0;
      globalAudioInstance = null;
    }
    if (globalAudioCleanup) {
      globalAudioCleanup();
      globalAudioCleanup = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const handleReadAloud = async () => {
    // If already playing, toggle pause/resume on the audio element
    if (isSpeaking) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
          setIsPausedBySpeech(false);
        } else {
          audioRef.current.pause();
          setIsPausedBySpeech(true);
        }
      }
      return;
    }

    // Check cache
    if (audioCache.has(cacheKey)) {
      const cachedUrl = audioCache.get(cacheKey);
      playAudioUrl(cachedUrl);
      return;
    }

    const cleanText = (message.content || '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[-*+]\s/gm, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/>/g, '')
      .replace(/\|/g, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .substring(0, 4096); // OpenAI TTS limit

    const voice = localStorage.getItem('caos_voice_preference_message') || 'nova';
    const speed = parseFloat(localStorage.getItem('caos_speech_rate') || '1.0');

    setIsGenerating(true);
    setGenerationProgress(0);

    // Animate generation progress
    const genInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + 4, 90));
    }, 150);

    try {
      const response = await base44.functions.invoke('textToSpeech', {
        text: cleanText,
        voice,
        speed
      });

      clearInterval(genInterval);
      setGenerationProgress(100);
      setIsGenerating(false);

      // response.data may be ArrayBuffer, Blob, or typed array
      let audioData = response.data;
      let audioBlob;
      if (audioData instanceof Blob) {
        audioBlob = audioData;
      } else if (audioData instanceof ArrayBuffer || ArrayBuffer.isView(audioData)) {
        audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      } else {
        throw new Error(`Unexpected TTS response format: ${typeof audioData}`);
      }
      const audioUrl = URL.createObjectURL(audioBlob);
      audioCache.set(cacheKey, audioUrl);
      playAudioUrl(audioUrl);
    } catch (err) {
      clearInterval(genInterval);
      setIsGenerating(false);
      setGenerationProgress(0);

      // Log TTS failure to ErrorLog (non-blocking, modular — never affects playback path)
      try {
        await base44.entities.ErrorLog.create({
          user_email: 'client',
          error_type: 'unknown',
          error_message: `TTS_FAILURE: ${err.message}`,
          stage: 'TTS_INVOKE',
          error_code: 'TTS_CALL_FAILED',
          model_used: voice,
          stack_trace: err.stack || '',
          request_payload: { voice, speed, text_length: cleanText.length },
        });
      } catch (_) { /* never block on log failure */ }

      // Graceful fallback: browser speech synthesis
      toast.warning('OpenAI TTS unavailable — falling back to browser voice');
      console.error('[TTS_ERROR]', err.message);
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = speed;
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
        utterance.onend = () => { setIsSpeaking(false); setSpeechProgress(0); };
        utterance.onerror = () => { setIsSpeaking(false); setSpeechProgress(0); };
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } catch (fbErr) {
        setIsSpeaking(false);
        toast.error('Read aloud unavailable');
      }
    }
  };

  const playAudioUrl = (url) => {
    // Stop any other playing audio
    if (globalAudioInstance && globalAudioInstance !== audioRef.current) {
      globalAudioInstance.pause();
      if (globalAudioCleanup) globalAudioCleanup();
    }

    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;
    globalAudioInstance = audio;

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setSpeechProgress((audio.currentTime / audio.duration) * 100);
        setAudioDuration(audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      setIsSpeaking(false);
      setIsPausedBySpeech(false);
      setSpeechProgress(0);
      setAudioDuration(0);
      globalAudioInstance = null;
    });

    audio.addEventListener('error', (e) => {
      setIsSpeaking(false);
      setIsPausedBySpeech(false);
      setSpeechProgress(0);
      setAudioDuration(0);
      console.error('[AUDIO_PLAYBACK_ERROR]', e);
      toast.error('Audio playback failed');
    });

    globalAudioCleanup = () => {
      setIsSpeaking(false);
      setIsPausedBySpeech(false);
      setSpeechProgress(0);
      setAudioDuration(0);
    };

    setIsSpeaking(true);
    setIsPausedBySpeech(false);
    setSpeechProgress(0);

    // Must await play() — it returns a Promise in modern browsers
    audio.play().catch((err) => {
      console.error('[AUDIO_PLAY_REJECTED]', err.message);
      setIsSpeaking(false);
      toast.error(`Playback blocked: ${err.message}`);
    });
  };

  const handleStopReading = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    globalAudioInstance = null;
    setIsSpeaking(false);
    setIsPausedBySpeech(false);
    setSpeechProgress(0);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (audioRef.current === globalAudioInstance) {
        stopAllAudio();
      }
    };
  }, []);



  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  const handleRegenerate = () => {
    // Trigger regeneration through parent component
    toast.info('Regenerate feature coming soon');
  };

  const extractFilename = (langString) => {
    if (langString && langString.startsWith('filename:')) {
      return langString.replace('filename:', '');
    }
    return null;
  };

  const renderContent = () => {
    let content = message.content || '';

    // Strip out WROTE: patterns but keep the rest of the content
    if (content && content.includes('WROTE:')) {
      content = content.replace(/WROTE:[a-f0-9-]+/g, '').trim();
    }

    // Extract ALL URLs before markdown processing
    const urls = extractUrls(content || '');
    const videoUrls = urls.filter(isVideoUrl);

    // Remove video URLs AND their markdown wrappers from content BEFORE markdown processing
    let cleanContent = content;
    videoUrls.forEach(url => {
      // Remove markdown link syntax: [text](url)
      const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const markdownLinkRegex = new RegExp(`\\[([^\\]]+)\\]\\(${escapedUrl}\\)`, 'g');
      cleanContent = cleanContent.replace(markdownLinkRegex, '');
      // Remove bare URL
      cleanContent = cleanContent.replace(url, '');
    });
    cleanContent = cleanContent.trim();

    const youtubeMatches = content ? content.match(/\[YOUTUBE:(.*?)\]/g) : null;
    
    // Check for copy blocks: ```copy or ```copyblock
    const copyBlockRegex = /```(?:copy|copyblock)(?:\s+title:([^\n]+))?\n([\s\S]*?)```/g;
    const copyBlocks = [];
    let copyMatch;
    
    while ((copyMatch = copyBlockRegex.exec(message.content || '')) !== null) {
      const title = copyMatch[1]?.trim();
      const blockContent = copyMatch[2];
      copyBlocks.push({ title, content: blockContent });
      // Remove from main content
      content = content.replace(copyMatch[0], '');
    }
    
    // Check for file content in code blocks
    const codeBlockRegex = /```(filename:[^\n]+)\n([\s\S]*?)```/g;
    const fileBlocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(message.content || '')) !== null) {
      const filename = extractFilename(match[1]);
      const fileContent = match[2];
      if (filename) {
        fileBlocks.push({ filename, content: fileContent });
      }
    }
    
    // Get attached files
    const attachedFiles = message.file_urls || [];
    
    if (youtubeMatches && !isUser) {
      return (
        <div className="space-y-3">
          {youtubeMatches.map((match, index) => {
            const url = match.replace('[YOUTUBE:', '').replace(']', '');
            const videoId = getYouTubeId(url);
            content = content.replace(match, '');
            
            if (videoId) {
              return (
                <div key={index} className="w-full mx-auto rounded-lg overflow-hidden" style={{ maxWidth: '600px' }}>
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      src={`https://www.youtube.com/embed/${videoId}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-lg"
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
          {content.trim() && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content.trim()}</p>
          )}
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {/* Embedded Videos */}
        {videoUrls.length > 0 && (
          <div className="space-y-3">
            {videoUrls.map((url, idx) => {
              const youtubeId = getYouTubeId(url);
              const vimeoId = getVimeoId(url);

              if (youtubeId) {
                return (
                  <div key={idx} className="w-full rounded-xl overflow-hidden border border-white/20 shadow-lg">
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              }

              if (vimeoId) {
                return (
                  <div key={idx} className="w-full rounded-xl overflow-hidden border border-white/20 shadow-lg">
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        src={`https://player.vimeo.com/video/${vimeoId}`}
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}



        {/* Recall Results */}
        {message.recall_results && message.recall_results.length > 0 && (
          <div className="space-y-2 mb-3">
            <div className="text-xs text-blue-400 font-medium flex items-center gap-2">
              <span>🧠</span> Recalled Memories ({message.recall_results.length})
            </div>
            {message.recall_results.map((recall, idx) => {
              const preview = recall.payload?.content || recall.payload?.text || '';
              const previewText = preview.length > 80 ? preview.slice(0, 80) + '...' : preview;
              const timestamp = recall.ts_ms ? new Date(recall.ts_ms).toLocaleString() : '';
              
              return (
                <div key={idx} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-400 font-mono">session:{recall.session_id || 'default'}</span>
                    {timestamp && (
                      <>
                        <span className="text-white/30">•</span>
                        <span className="text-white/50">{timestamp}</span>
                      </>
                    )}
                  </div>
                  {previewText && (
                    <p className="text-sm text-white/90 leading-relaxed">{previewText}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {cleanContent && cleanContent.trim() && (
          <ReactMarkdown 
            className="text-xs sm:text-sm max-w-full overflow-hidden"
            components={{
              p: ({ children }) => <p className="mb-2 sm:mb-3 leading-relaxed text-white/90 break-words">{children}</p>,
              code: ({ inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <div className="relative group/code my-3 max-w-full">
                    <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto max-w-full">
                      <code className={className} {...props}>{children}</code>
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                        toast.success('Code copied');
                      }}
                    >
                      <Copy className="h-3 w-3 text-slate-400" />
                    </Button>
                  </div>
                ) : !inline ? (
                  <div className="relative group/code my-3 max-w-full">
                    <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto max-w-full whitespace-pre-wrap break-words">
                      <code {...props}>{children}</code>
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                      onClick={() => {
                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                        toast.success('Code copied');
                      }}
                    >
                      <Copy className="h-3 w-3 text-slate-400" />
                    </Button>
                  </div>
                ) : (
                  <code className="px-2 py-1 rounded bg-white/10 text-white text-xs font-mono">
                    {children}
                  </code>
                );
              },
              a: ({ children, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{children}</a>
              ),
              ul: ({ children }) => <ul className="mb-3 ml-6 space-y-1.5">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 ml-6 space-y-1.5">{children}</ol>,
              li: ({ children }) => <li className="list-disc text-white/90">{children}</li>,
              h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-3 text-white">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-white">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1.5 text-white">{children}</h3>,
              strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
              em: ({ children }) => <em className="italic text-white/80">{children}</em>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-white/30 pl-4 my-3 text-white/70 italic">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-4 border-white/20" />,
            }}
          >
            {cleanContent.trim()}
          </ReactMarkdown>
        )}
        
        {/* Copy Blocks */}
        {copyBlocks.map((block, index) => (
          <CopyBlock
            key={index}
            content={block.content}
            title={block.title}
          />
        ))}
        
        {/* Display attached files */}
        {attachedFiles.length > 0 && (
          <div className="space-y-2">
            {attachedFiles.map((fileUrl, index) => {
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
              const fileName = fileUrl.split('/').pop();
              
              return isImage ? (
                <div key={index} className="rounded-lg overflow-hidden border border-white/20">
                  <img src={fileUrl} alt="Attached" className="max-w-full h-auto" />
                </div>
              ) : (
                <a
                  key={index}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white/80 flex-1">{fileName}</span>
                </a>
              );
            })}
          </div>
        )}
        
        {/* Display generated files */}
        {message.generated_files && message.generated_files.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="text-xs text-green-400 font-medium flex items-center gap-2">
              <span>📁</span> Generated Files
            </div>
            {message.generated_files.map((file, index) => {
              const isImage = file.type === 'image' || /image/.test(file.type);

              return isImage && file.url ? (
                <div key={index} className="rounded-lg overflow-hidden border border-green-400/30">
                  <img src={file.url} alt={file.name} className="max-w-full h-auto" />
                </div>
              ) : (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (file.url) {
                      const a = document.createElement('a');
                      a.href = file.url;
                      a.download = file.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      toast.success(`Downloaded ${file.name}`);
                    } else if (file.content) {
                      downloadFile(file.content, file.name);
                    }
                  }}
                  className="w-full flex items-center gap-2 bg-green-500/10 border border-green-400/30 rounded-lg px-3 py-2 hover:bg-green-500/20 transition-colors text-left cursor-pointer"
                >
                  <Download className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-white/90 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-green-400 whitespace-nowrap">Download</span>
                </button>
              );
            })}
          </div>
        )}
        
        {fileBlocks.map((file, index) => (
          <div key={index} className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg px-3 py-2">
            <span className="text-sm text-white/80 flex-1">{file.filename}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => downloadFile(file.content, file.filename)}
              className="h-8 px-3 text-blue-400 hover:text-blue-300 hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 w-full max-w-4xl mx-auto px-2 sm:px-4`}
      >
        <div className={`flex items-start gap-1 sm:gap-2 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-500/30 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-400 animate-pulse" />
          </div>
        )}

        <div className="flex-1 max-w-3xl min-w-0">
        <div
            data-message-bubble
            className={`
              relative group
              px-2 py-2 sm:px-4 sm:py-3 rounded-2xl select-text break-words overflow-wrap-anywhere text-sm sm:text-base
              ${message.failed 
                ? 'bg-red-600/80 backdrop-blur-sm text-white rounded-br-md border-2 border-red-400' 
                : isUser 
                  ? 'bg-blue-600/80 backdrop-blur-sm text-white rounded-br-md' 
                  : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-bl-md'
              }
            `}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}
            onContextMenu={handleTextSelection}
          >

          <p className="text-xs font-medium mb-2">
            {isUser ? (
              <span className="text-green-300">{userInitials}</span>
            ) : (
              <span className="text-blue-300">CAOS</span>
            )}
          </p>
          {message.failed && (
            <div className="mb-2 flex items-center gap-2 text-red-200 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to send: {message.error}</span>
            </div>
          )}
          {/* Degradation Notice */}
          {!isUser && message.degradation && (
            <div className="mb-3">
              <DegradationNotice degradation={message.degradation} />
            </div>
          )}

          {renderContent()}
          {(message.timestamp || (!isUser && message.response_time_ms)) && (
            <div className={`flex items-center justify-between mt-1.5 ${isUser ? '' : 'gap-3'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                {message.timestamp && (
                  <p className={`text-xs ${isUser ? 'text-white/60' : 'text-white/40'}`}>
                    {formatDateTime(message.timestamp)}
                  </p>
                )}
                {!isUser && message.response_time_ms && (
                  <span className="text-xs text-green-400/70 flex items-center gap-1">
                    {message.timestamp && <span>•</span>}
                    ⏱️ {(message.response_time_ms / 1000).toFixed(1)}s
                  </span>
                )}
                {/* Latency Indicator */}
                {!isUser && message.latency && (
                  <LatencyIndicator latency={message.latency} compact={true} />
                )}
                {/* WCW Status Badge */}
                {!isUser && message.wcw_status && (
                  <WCWStatusBadge wcwStatus={message.wcw_status} compact={true} />
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                  title="Copy"
                >
                  <Copy className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
                </button>
                <button
                  onClick={handleReadAloud}
                  disabled={isGenerating}
                  className={`p-1 hover:bg-white/10 rounded transition-colors ${(isSpeaking || isGenerating) ? 'bg-blue-500/20' : ''} disabled:opacity-50`}
                  title={isGenerating ? "Generating speech..." : isSpeaking ? "Pause/Resume" : "Read aloud"}
                >
                  {isGenerating ? (
                    <div className="relative w-3.5 h-3.5">
                      <div className="absolute inset-0 border-2 border-white/20 rounded-full" />
                      <div className="absolute inset-0 border-2 border-blue-400 rounded-full border-t-transparent animate-spin" />
                    </div>
                  ) : (
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-blue-400' : 'text-white/60 hover:text-white/90'}`} />
                  )}
                </button>
                {isSpeaking && (
                  <button
                    onClick={handleStopReading}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Stop"
                  >
                    <X className="w-3.5 h-3.5 text-red-400 hover:text-red-300" />
                  </button>
                )}
                {!isUser && (
                  <>
                    <button
                      onClick={() => setShowVoiceSettings(true)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Voice settings"
                    >
                      <Settings className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
                    </button>
                    <button
                      onClick={handleEmailContent}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Email this"
                    >
                      <Mail className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
                    </button>
                  </>
                )}
              </div>
                    </div>
                    )}
                    




                    {/* Tool Calls */}
                    {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 mt-2">
                    {message.tool_calls.map((toolCall, idx) => (
                    <FunctionDisplay key={idx} toolCall={toolCall} />
                    ))}
                    </div>
                    )}

                    {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 border border-white/20 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                  title={reaction.selected_text}
                >
                  <span>{reaction.emoji}</span>
                </div>
              ))}
              </div>
              )}

              {/* Replies */}
              {message.replies && message.replies.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.replies.map((reply, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 border-l-2 border-blue-400 rounded px-2 py-1.5 text-xs space-y-1.5"
                    >
                      <p className="text-white/50 italic text-[11px]">"{reply.selected_text}"</p>
                      <div className="bg-blue-600/20 rounded px-2 py-1">
                        <p className="text-white/90">{reply.user_reply}</p>
                      </div>
                      {reply.ai_response && (
                        <div className="bg-white/10 rounded px-2 py-1">
                          <p className="text-blue-300 font-medium text-[10px] mb-0.5">CAOS</p>
                          <p className="text-white/90">{reply.ai_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Audio Player Bar */}
              {isSpeaking && (
                <div className="mt-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 space-y-2">
                  {/* Progress bar — clickable to seek */}
                  <div
                    className="h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      if (!audioRef.current || !audioRef.current.duration) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      audioRef.current.currentTime = ratio * audioRef.current.duration;
                    }}
                  >
                    <div
                      className="h-full bg-blue-400 transition-all duration-200"
                      style={{ width: `${speechProgress}%` }}
                    />
                  </div>
                  {/* Controls row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {/* Rewind 10s */}
                      <button
                        onClick={() => {
                          if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                        }}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="Back 10s"
                      >
                        <SkipBack className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      {/* Play / Pause */}
                      <button
                        onClick={() => {
                          if (!audioRef.current) return;
                          if (audioRef.current.paused) {
                            audioRef.current.play().catch(() => {});
                            setIsPausedBySpeech(false);
                          } else {
                            audioRef.current.pause();
                            setIsPausedBySpeech(true);
                          }
                        }}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title={isPausedBySpeech ? "Play" : "Pause"}
                      >
                        {isPausedBySpeech
                          ? <Play className="w-3.5 h-3.5 text-blue-400" />
                          : <Pause className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                      {/* Forward 10s */}
                      <button
                        onClick={() => {
                          if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 10);
                        }}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="Forward 10s"
                      >
                        <SkipForward className="w-3.5 h-3.5 text-white/60" />
                      </button>
                      {/* Stop */}
                      <button
                        onClick={handleStopReading}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                        title="Stop"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                    {/* Time display */}
                    <span className="text-[10px] text-white/40 tabular-nums">
                      {formatTime(audioRef.current?.currentTime || 0)}
                      {audioDuration > 0 && ` / ${formatTime(audioDuration)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Execution Receipt - ALWAYS show when execution_receipt exists AND toggle is ON */}
              {!isUser && message.execution_receipt && showExecution && (
                <ExecutionReceipt receipt={message.execution_receipt} />
              )}
              
              {/* DEBUG: Log if receipt exists but not shown */}
              {!isUser && message.execution_receipt && !showExecution && (
                <div className="hidden">
                  {console.log('🔍 [RECEIPT_SUPPRESSED]', {
                    message_id: message.id,
                    has_receipt: !!message.execution_receipt,
                    showExecution,
                    receipt_keys: Object.keys(message.execution_receipt)
                  })}
                </div>
              )}
              </div>
              </div>
              </div>
              </motion.div>

              {showSelectionMenu && (
                <div data-selection-menu onClick={(e) => e.stopPropagation()}>
                <TextSelectionMenu
              position={menuPosition}
              selectedText={selectedText}
              onReact={handleReact}
              onReply={handleReply}
              onClose={() => {
              setShowSelectionMenu(false);
              window.getSelection().removeAllRanges();
              }}
              />
              </div>
              )}

              <VoiceSettings 
                isOpen={showVoiceSettings}
                onClose={() => setShowVoiceSettings(false)}
              />
              </>
              );
              }