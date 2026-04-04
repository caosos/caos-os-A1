import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Settings, AlertCircle, X, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import FunctionDisplay from './bubble/FunctionDisplay';
import MarkdownMessage from './bubble/MarkdownMessage';
import Attachments from './bubble/Attachments';
import GeneratedFiles from './bubble/GeneratedFiles';
import Reactions from './bubble/Reactions';
import Replies from './bubble/Replies';
import ReceiptPanel from './bubble/ReceiptPanel';
import MessageContent from './bubble/MessageContent';
import MessageHeader from './bubble/MessageHeader';
import MessageMetadataDisplay from './bubble/MessageMetadataDisplay';
import CopyButton from './bubble/CopyButton';
import EmailButton from './bubble/EmailButton';
import MessageMetaRow from './bubble/MessageMetaRow';
import MessageMetadataContent from './bubble/MessageMetadataContent';
import { useTextSelectionMenu } from './bubble/useTextSelectionMenu';
import { useInlineReactions } from './bubble/useInlineReactions';
import { formatDateTime, downloadFile, formatTime } from './bubble/messageUtils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import TextSelectionMenu from './TextSelectionMenu';
import VoiceSettings from './VoiceSettings';
import LatencyIndicator from './LatencyIndicator';
import WCWStatusBadge from './WCWStatusBadge';
import DegradationNotice from './DegradationNotice';
import EvidencePanel from './bubble/EvidencePanel';
import { chunkTextForTTS, generateChunkAudio } from './ttsChunker';

// Global audio manager — only one audio plays at a time (PR2-A)
let globalAudioInstance = null;
let globalAudioCleanup = null;

// Audio cache - store generated audio per message
const audioCache = new Map();

export default function ChatBubble({ message, isUser, onUpdateMessage, closeMenuTrigger, userInitials = "ME", isNew = false }) {
  // ── DEV INSTRUMENTATION — COMMIT 1 ─────────────────────────────────────────
  // Gate: localStorage caos_developer_mode === 'true'
  // Rules: no raw text, no base64, no render-path logging, bounded scalars only
  const DEV = localStorage.getItem('caos_developer_mode') === 'true';
  if (DEV) console.count(`ChatBubble render ${message.id?.slice(0,8)}`);
  // ─────────────────────────────────────────────────────────────────────────────
  const { showSelectionMenu, menuPosition, selectedText, handleTextSelection, closeMenu } = useTextSelectionMenu(closeMenuTrigger);
  const { handleReact, handleReply } = useInlineReactions(message, onUpdateMessage);
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
  const audioRef = React.useRef(null);
  const utteranceRef = React.useRef(null);
  const progressInterval = React.useRef(null);
  const ttsProvider = localStorage.getItem('caos_tts_provider') || 'openai';
  const cacheKey = `${message.id}_${localStorage.getItem('caos_voice_preference_message') || 'nova'}_${localStorage.getItem('caos_speech_rate') || '1.0'}_${ttsProvider}_v3`;
  const ttsLog = DEV ? (event, payload) => {
      console.log(`[TTS_LIFECYCLE] ${event}`, { msg: message.id?.substring(0, 8), ...payload });
  } : () => {};
  // ─────────────────────────────────────────────────────────────────────────────

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
    ttsLog('stopAllAudio_called', { has_global: !!globalAudioInstance });
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
    // If audio is already loaded, toggle pause/resume
    if (audioRef.current && audioRef.current.src) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch((err) => {
          console.error('[AUDIO_RESUME_REJECTED]', err.message);
        });
        setIsSpeaking(true);
        setIsPausedBySpeech(false);
      } else {
        audioRef.current.pause();
        setIsPausedBySpeech(true);
        setIsSpeaking(true);
      }
      return;
    }

    // Check cache — can play immediately, still need gesture unlock
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey);
      if (Array.isArray(cached)) {
        playSequentialAudio(cached);
      } else {
        playAudioUrl(cached);
      }
      return;
    }

    // Gesture-unlock: create a throwaway Audio element synchronously inside the gesture
    // to satisfy browser autoplay policy. This element is NEVER used for real playback.
    // A fresh Audio() is created inside playSequentialAudio when generation completes.
    const unlockAudio = new Audio();
    unlockAudio.volume = 0;
    unlockAudio.play().catch(() => {}); // expected to fail silently — gesture unlock only

    // Register global state immediately so a second click before generation completes
    // can deterministically stop this path.
    globalAudioCleanup = () => {
      setIsGenerating(false);
      setGenerationProgress(0);
      setIsSpeaking(false);
      setIsPausedBySpeech(false);
      setSpeechProgress(0);
      setAudioDuration(0);
    };
    globalAudioInstance = unlockAudio;

    const stripEmojis = (s) => (s || '')
      .replace(/\p{Extended_Pictographic}(\uFE0F|\uFE0E)?(\u200D\p{Extended_Pictographic}(\uFE0F|\uFE0E)?)*/gu, '')
      .replace(/[\uFE0E\uFE0F\u200D]/g, '');

    const cleanText = stripEmojis(message.content || '')
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
      .substring(0, 4096);

    const voice = ttsProvider === 'gemini' 
      ? (localStorage.getItem('caos_voice_preference_gemini') || 'Aoede')
      : (localStorage.getItem('caos_voice_preference_message') || 'nova');
    const speed = parseFloat(localStorage.getItem('caos_speech_rate') || '1.0');

    const input_chars = cleanText.length;
    const input_hash = cleanText.split('').reduce((h, c) => (((h << 5) + h) ^ c.charCodeAt(0)) >>> 0, 5381).toString(16);
    ttsLog('tts_generate_start', { input_chars, input_hash, voice, speed, provider: ttsProvider });

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const chunks = chunkTextForTTS(cleanText, 500);
      const totalChunks = chunks.length;
      
      // Queue all chunks for sequential playback
      const audioUrls = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const tts_t0 = Date.now();
        
        // Update progress bar
        setGenerationProgress(Math.floor((i / totalChunks) * 100));
        
        try {
          const audioUrl = await generateChunkAudio(chunk, ttsProvider, voice, speed, DEV);
          audioUrls.push(audioUrl);
          
          const gen_time_ms = Date.now() - tts_t0;
          ttsLog('tts_chunk_generated', {
            chunk_index: i + 1,
            total_chunks: totalChunks,
            chunk_chars: chunk.length,
            gen_time_ms,
          });
        } catch (chunkErr) {
          console.error(`[TTS_CHUNK_ERROR] Chunk ${i + 1}/${totalChunks}:`, chunkErr.message);
          throw chunkErr;
        }
      }
      
      setGenerationProgress(100);
      setIsGenerating(false);
      
      // Cache the full sequence and start playback.
      // Pass NO existingAudio — playSequentialAudio creates a fresh element.
      audioCache.set(cacheKey, audioUrls);
      playSequentialAudio(audioUrls);
      
    } catch (err) {
      setIsGenerating(false);
      setGenerationProgress(0);
      audioRef.current = null;
      globalAudioInstance = null;
      console.error('[TTS_ERROR]', err.message);
      toast.error(`Read aloud failed: ${err.message}`);
    }
  };

  const playSequentialAudio = (audioUrls) => {
    // Stop any other playing audio (including the gesture-unlock throwaway element)
    if (globalAudioInstance) {
      globalAudioInstance.pause();
      globalAudioInstance.src = '';
    }
    if (globalAudioCleanup) {
      globalAudioCleanup();
      globalAudioCleanup = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Always create a FRESH Audio element for real playback.
    // The gesture-unlock element created in handleReadAloud is discarded.
    let currentChunkIndex = 0;
    const audio = new Audio();
    audio.volume = 1.0;
    audioRef.current = audio;
    globalAudioInstance = audio;

    globalAudioCleanup = () => {
      setIsSpeaking(false);
      setIsPausedBySpeech(false);
      setSpeechProgress(0);
      setAudioDuration(0);
    };

    const loadNextChunk = () => {
      if (currentChunkIndex >= audioUrls.length) {
        setIsSpeaking(false);
        setIsPausedBySpeech(false);
        setSpeechProgress(0);
        setAudioDuration(0);
        globalAudioInstance = null;
        globalAudioCleanup = null;
        ttsLog('sequential_audio_ended', { total_chunks: audioUrls.length });
        return;
      }

      const url = audioUrls[currentChunkIndex];
      currentChunkIndex++;
      audio.src = url;

      // Register a PER-CHUNK { once: true } 'ended' listener.
      // This is deterministic: fires exactly once per chunk, then self-removes.
      // No lingering listener can spuriously advance the chunk index.
      audio.addEventListener('ended', loadNextChunk, { once: true });

      audio.play().then(() => {
        ttsLog('chunk_playing', { chunk_index: currentChunkIndex, total: audioUrls.length });
      }).catch((err) => {
        audio.removeEventListener('ended', loadNextChunk);
        console.error('[AUDIO_PLAY_REJECTED]', err.message);
        setIsSpeaking(false);
        toast.error(`Playback blocked: ${err.message}`);
      });
    };

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
      ttsLog('chunk_loadedmetadata', { duration_sec: parseFloat(audio.duration?.toFixed(2)) });
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setSpeechProgress((audio.currentTime / audio.duration) * 100);
        setAudioDuration(audio.duration);
      }
    });

    audio.addEventListener('pause', () => {
      if (!audio.ended) {
        ttsLog('chunk_pause', { t: Number(audio.currentTime?.toFixed(2)) });
      }
    });

    audio.addEventListener('error', (e) => {
      audio.removeEventListener('ended', loadNextChunk);
      setIsSpeaking(false);
      setIsPausedBySpeech(false);
      setSpeechProgress(0);
      setAudioDuration(0);
      globalAudioInstance = null;
      globalAudioCleanup = null;
      console.error('[AUDIO_ERROR]', e.type, audio.error?.code);
      ttsLog('chunk_error', { code: audio.error?.code });
      toast.error('Audio playback failed');
    });

    setIsSpeaking(true);
    setIsPausedBySpeech(false);
    setSpeechProgress(0);

    loadNextChunk();
  };

  const playAudioUrl = (url, existingAudio = null) => {
    // Single-URL playback for backwards compatibility
    playSequentialAudio([url], existingAudio);
  };

  const handleStopReading = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // Keep audioRef so re-clicking play doesn't re-fetch — it'll resume from start
    }
    if (globalAudioInstance === audioRef.current) {
      globalAudioInstance = null;
    }
    setIsSpeaking(false);
    setIsPausedBySpeech(false);
    setSpeechProgress(0);
    setAudioDuration(0);
  };

  // Cleanup on unmount + stop on tab close
  React.useEffect(() => {
    const handleUnload = () => {
      window.speechSynthesis?.cancel();
      if (globalAudioInstance) {
        globalAudioInstance.pause();
        globalAudioInstance.src = '';
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (audioRef.current === globalAudioInstance) {
        stopAllAudio();
      }
    };
  }, []);







  return (
    <>
      <motion.div
        initial={isNew ? { opacity: 0, y: 10 } : false}
        animate={isNew ? { opacity: 1, y: 0 } : undefined}
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

          <MessageHeader isUser={isUser} userInitials={userInitials} messageId={message.id} inferenceProvider={message.inference_provider} />
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

          <MessageContent message={message} isUser={isUser} downloadFile={downloadFile} />
          <MessageMetaRow
            isUser={isUser}
            timestamp={message.timestamp}
            response_time_ms={message.response_time_ms}
            latency={message.latency}
            wcw_status={message.wcw_status}
            formatDateTime={formatDateTime}
            rightSlot={
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton onCopy={handleCopy} />
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

                {!isUser && (
                  <>
                    <button
                      onClick={() => setShowVoiceSettings(true)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Voice settings"
                    >
                      <Settings className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
                    </button>
                    <EmailButton onEmail={handleEmailContent} />
                  </>
                )}
              </div>
            }
          />
                    




                    <MessageMetadataContent 
                      toolCalls={message.tool_calls} 
                      reactions={message.reactions} 
                      replies={message.replies} 
                    />

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

              <ReceiptPanel isUser={isUser} message={message} showExecution={showExecution} />
              {!isUser && <EvidencePanel message={message} />}
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
              onClose={closeMenu}
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