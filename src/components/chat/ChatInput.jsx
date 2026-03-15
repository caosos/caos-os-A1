import React, { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, Send, Plus, X, FileText, Image as ImageIcon, Camera, Monitor, Pause, Check, Play, SkipBack, SkipForward } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { ttcSpeak, ttsStop, ttsPause, ttsResume, ttsWarmVoices } from './ttsController.jsx';
import { getTTSPrefs, setTTSPrefs } from './ttsPrefs';
import PointerEventsGuard from './PointerEventsGuard';

const _DEV = localStorage.getItem('caos_developer_mode') === 'true';

export default function ChatInput({ onSend, isLoading, lastAssistantMessage, onTypingStart, multiAgentMode, conversationId, messageValue = '', onMessageChange }) {
  if (_DEV) console.count('ChatInput render');
  const [message, setMessage] = useState(messageValue);
  const [attachedFiles, setAttachedFiles] = useState([]);
  
  useEffect(() => {
    if (messageValue !== message) setMessage(messageValue);
  }, [messageValue]); // eslint-disable-line react-hooks/exhaustive-deps
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingGoogle, setIsPlayingGoogle] = useState(false);
  const [isPausedGoogle, setIsPausedGoogle] = useState(false);
  const [googleSpeechProgress, setGoogleSpeechProgress] = useState(0);
  const [showCaptureMenu, setShowCaptureMenu] = useState(false);

  const [selectedAgents, setSelectedAgents] = useState(['all']);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const fileInputRef = useRef(null);
  const voiceMenuRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const voiceButtonRef = useRef(null);
  const audioAnalyserRef = useRef(null);
  const audioLevelRafRef = useRef(null);
  const resizeRafRef = useRef(null);
  const draftRafRef = useRef(null);
  const latestDraftRef = useRef('');

  // Warm controller voice cache on mount and when new AI message arrives.
  useEffect(() => { ttsWarmVoices(); }, []);
  useEffect(() => { if (lastAssistantMessage) ttsWarmVoices(); }, [lastAssistantMessage]);

  // Stop TTS on unmount / page unload
  useEffect(() => {
    const handleUnload = () => ttsStop();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      ttsStop();
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      if (draftRafRef.current) cancelAnimationFrame(draftRafRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (captureMenuRef.current && !captureMenuRef.current.contains(event.target)) {
        setShowCaptureMenu(false);
      }
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(event.target)) {
        setShowVoiceMenu(false);
      }
    };

    if (showCaptureMenu || showVoiceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCaptureMenu, showVoiceMenu]);
  const textareaRef = useRef(null);
  const cameraInputRef = useRef(null);
  const captureMenuRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    const totalFiles = attachedFiles.length + files.length;
    if (totalFiles > 5) {
      alert(`You can only attach up to 5 files. You currently have ${attachedFiles.length} file(s) attached.`);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const uploadedFiles = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        const isImage = file.type.startsWith('image/');
        
        uploadedFiles.push({
          name: file.name,
          url: result.file_url,
          type: file.type,
        });
        
        // Save to UserFile entity - organize by conversation
        const folderPath = conversationId ? `/Conversations/${conversationId}` : '/Uploads';
        await base44.entities.UserFile.create({
          name: file.name,
          url: result.file_url,
          type: isImage ? 'photo' : 'file',
          folder_path: folderPath,
          mime_type: file.type,
          size: file.size
        });
      }
      setAttachedFiles([...attachedFiles, ...uploadedFiles]);
    } catch (error) {
      console.error('Error uploading files:', error);
    }
    setUploading(false);
    e.target.value = '';
  };

  const captureScreen = async () => {
    setShowCaptureMenu(false);
    setUploading(true);
    try {
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight
      });
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
        const result = await base44.integrations.Core.UploadFile({ file });
        
        // Save to UserFile entity - organize by conversation
        const folderPath = conversationId ? `/Conversations/${conversationId}` : '/Screenshots';
        await base44.entities.UserFile.create({
          name: file.name,
          url: result.file_url,
          type: 'photo',
          folder_path: folderPath,
          mime_type: 'image/png',
          size: blob.size
        });
        
        setAttachedFiles([...attachedFiles, {
          name: file.name,
          url: result.file_url,
          type: 'image/png',
        }]);
        setUploading(false);
      });
    } catch (error) {
      console.error('Error capturing screen:', error);
      setUploading(false);
    }
  };

  const captureCamera = () => {
    setShowCaptureMenu(false);
    cameraInputRef.current?.click();
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      // Save to UserFile entity - organize by conversation
      const folderPath = conversationId ? `/Conversations/${conversationId}` : '/Photos';
      await base44.entities.UserFile.create({
        name: file.name,
        url: result.file_url,
        type: 'photo',
        folder_path: folderPath,
        mime_type: file.type,
        size: file.size
      });
      
      setAttachedFiles([...attachedFiles, {
        name: file.name,
        url: result.file_url,
        type: file.type,
      }]);
    } catch (error) {
      console.error('Error uploading camera photo:', error);
    }
    setUploading(false);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const scheduleDraftPropagation = (value) => {
    latestDraftRef.current = value;
    if (draftRafRef.current) return; // already scheduled
    draftRafRef.current = requestAnimationFrame(() => {
      onMessageChange?.(latestDraftRef.current);
      draftRafRef.current = null;
    });
  };

  const scheduleResize = () => {
    if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
    resizeRafRef.current = requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
      }
      resizeRafRef.current = null;
    });
  };

  // ── TTS_UNIFICATION_v1 (2026-03-14) ─────────────────────────────────────────
  // sanitization + engine selection + exclusivity now owned by ttsController.
  // LOCK_SIGNATURE: CAOS_GOOGLE_TTS_LOCK_v1_2026-03-01 (refactored 2026-03-14)
  // ─────────────────────────────────────────────────────────────────────────────
  const stopGoogleVoice = () => {
    ttsStop();
    setIsPlayingGoogle(false);
    setIsPausedGoogle(false);
    setGoogleSpeechProgress(0);
  };

  const toggleGoogleVoicePlay = () => {
    if (!lastAssistantMessage) { toast('No assistant message yet — send a message first'); return; }

    // Pause / resume toggle
    if (isPlayingGoogle) {
      if (isPausedGoogle) {
        ttsResume();
        setIsPausedGoogle(false);
      } else {
        ttsPause();
        setIsPausedGoogle(true);
      }
      return;
    }

    // Optimistic UI — show player immediately, reset on error
    setIsPlayingGoogle(true);
    setIsPausedGoogle(false);

    ttcSpeak(lastAssistantMessage, {
      engine: 'server',
      base44,
      onStart: () => {
        setIsPlayingGoogle(true);
        setIsPausedGoogle(false);
      },
      onEnd: () => {
        setIsPlayingGoogle(false);
        setIsPausedGoogle(false);
        setGoogleSpeechProgress(0);
      },
      onError: (err) => {
        if (err?.message?.includes('interrupted') || err?.message?.includes('canceled')) return;
        setIsPlayingGoogle(false);
        setIsPausedGoogle(false);
        setGoogleSpeechProgress(0);
        toast.error('Voice read-aloud failed — try again');
      },
      onBoundary: () => setGoogleSpeechProgress(prev => Math.min(prev + 2, 90)),
    });
  };

  const handleVoiceButtonContextMenu = (e) => {
    e.preventDefault();
    setShowVoiceMenu(!showVoiceMenu);
  };

  // ─────────────────────────────────────────────────────────────────────
  // PHASE A — STT CHUNKING
  // LOCK_SIGNATURE: CAOS_STT_CHUNKING_v1_2026-03-01
  // Feature flag: set to false to revert to single-upload path instantly.
  // No backend changes. No hybridMessage changes. No memory writes.
  // ─────────────────────────────────────────────────────────────────────
  const STT_CHUNKING_ENABLED = false;
  const CHUNK_INTERVAL_MS = 4000;   // timeslice: 4 seconds per chunk
  const MIN_CHUNK_BYTES = 5000;     // ignore chunks smaller than ~5KB (~2s of audio)
  const CHUNK_FAIL_THRESHOLD = 3;   // fallback after N consecutive failures

  // Chunking state refs (not useState — no re-renders needed for these)
  const chunkIndexRef = useRef(0);
  const transcriptSegmentsRef = useRef({});
  const chunkStreamRef = useRef(null); // separate stream for chunking MediaRecorder
  const consecutiveFailsRef = useRef(0);
  const [chunkProgress, setChunkProgress] = useState({ recorded: 0, processed: 0 });
  const [isChunking, setIsChunking] = useState(false);

  const appendTranscriptSegment = (index, text) => {
    transcriptSegmentsRef.current[index] = text;
    const assembled = Object.keys(transcriptSegmentsRef.current)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => transcriptSegmentsRef.current[k])
      .join(' ')
      .trim();
    setMessage(assembled);
    onMessageChange?.(assembled);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const sendChunk = async (blob, index) => {
    if (blob.size < MIN_CHUNK_BYTES) {
      console.warn(`[STT_CHUNK] Chunk ${index} too small (${blob.size}B), skipping`);
      return;
    }
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const { data } = await base44.functions.invoke('transcribeAudio', arrayBuffer);
      if (data?.success && data?.text?.trim()) {
        consecutiveFailsRef.current = 0;
        appendTranscriptSegment(index, data.text.trim());
        setChunkProgress(p => ({ ...p, processed: p.processed + 1 }));
      } else {
        consecutiveFailsRef.current++;
        console.warn(`[STT_CHUNK] Empty result for chunk ${index}`);
      }
    } catch (err) {
      consecutiveFailsRef.current++;
      console.warn(`[STT_CHUNK] Chunk ${index} failed:`, err.message);
    }

    // Fallback: too many consecutive failures → stop chunking mode
    if (consecutiveFailsRef.current >= CHUNK_FAIL_THRESHOLD) {
      console.warn('[STT_CHUNK] Consecutive fail threshold hit — falling back to single upload');
      toast.warning('Voice chunking degraded — will use single upload on stop.');
      stopChunkingRecording();
    }
  };

  const startChunkingRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunkStreamRef.current = stream;

      // Reset chunking state
      chunkIndexRef.current = 0;
      transcriptSegmentsRef.current = {};
      consecutiveFailsRef.current = 0;
      setChunkProgress({ recorded: 0, processed: 0 });
      setIsChunking(true);
      setIsRecording(true);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          const index = chunkIndexRef.current++;
          setChunkProgress(p => ({ ...p, recorded: p.recorded + 1 }));
          // Send sequentially — no parallel sends
          sendChunk(event.data, index);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setIsChunking(false);
        setIsRecording(false);
        // Final textarea height adjust
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
      };

      mediaRecorder.start(CHUNK_INTERVAL_MS);
    } catch (err) {
      console.error('[STT_CHUNK] Failed to start chunking recorder:', err);
      setIsChunking(false);
      setIsRecording(false);
      // Fallback: try single-upload path
      startRecording();
    }
  };

  const stopChunkingRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // ██████████████████████████████████████████████████████████████████
  // ██  FORT KNOX LOCK — DO NOT TOUCH — GOOGLE WEB SPEECH TTS       ██
  // ██  LOCKED: 2026-03-01 — WORKING AND CONFIRMED                  ██
  // ██  LOCK_SIGNATURE: CAOS_GOOGLE_TTS_LOCK_v1_2026-03-01          ██
  // ██                                                               ██
  // ██  INVARIANT BEHAVIOR (must not change):                        ██
  // ██    - Uses window.speechSynthesis (Web Speech API only)        ██
  // ██    - Voice selected from localStorage caos_google_voice       ██
  // ██    - Speed from localStorage caos_google_speech_rate          ██
  // ██    - Reads lastAssistantMessage passed as prop                 ██
  // ██                                                               ██
  // ██  DEPENDENCY BOUNDARY:                                         ██
  // ██    - No external API calls. No base44.functions.invoke().     ██
  // ██    - Pure browser Web Speech API. No network dependency.      ██
  // ██                                                               ██
  // ██  BREAKING CHANGE = any of:                                    ██
  // ██    - Replacing speechSynthesis with fetch/invoke              ██
  // ██    - Changing localStorage key names                          ██
  // ██    - Removing pause/resume/stop controls                      ██
  // ██    - Changing voice selection logic in toggleGoogleVoicePlay  ██
  // ██                                                               ██
  // ██  UNLOCK PROTOCOL:                                             ██
  // ██    1. Explicit user intent stated in chat                     ██
  // ██    2. Acceptance criteria defined before any edit             ██
  // ██    3. Rollback plan: revert to this locked version            ██
  // ██    4. TSB entry written BEFORE deploying change               ██
  // ██                                                               ██
  // ██  DO NOT MODIFY: toggleGoogleVoicePlay, stopGoogleVoice,       ██
  // ██  voice menu, controls, getCleanText, or voice preference keys ██
  // ██████████████████████████████████████████████████████████████████
  // CAOS_GOOGLE_TTS_LOCK_v1_2026-03-01 (grep anchor — do not remove)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Live audio level meter
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioAnalyserRef.current = analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, avg * 2));
          audioLevelRafRef.current = requestAnimationFrame(updateLevel);
        };
        audioLevelRafRef.current = requestAnimationFrame(updateLevel);
      } catch (_) { /* analyser optional */ }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop audio level animation
        if (audioLevelRafRef.current) cancelAnimationFrame(audioLevelRafRef.current);
        setAudioLevel(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setIsTranscribing(true);
        try {
          // ⚠️ LOCK: base44.functions.invoke() ALWAYS sends application/json.
          // FormData and ArrayBuffer are silently serialized to {}.
          // The ONLY correct way to send binary via SDK is base64-in-JSON.
          // DO NOT change this to FormData or ArrayBuffer — it will break silently.
          // TSB-019 | LOCK_SIGNATURE: CAOS_STT_BASE64_TRANSPORT_v1_2026-03-03
          const arrayBuffer = await audioBlob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const audio_base64 = btoa(binary);
          const { data } = await base44.functions.invoke('transcribeAudio', { audio_base64 });
          if (data.success && data.text) {
            const updatedMessage = message + (message ? ' ' : '') + data.text;
            setMessage(updatedMessage);
            onMessageChange?.(updatedMessage);

            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
            }
          }
        } catch (error) {
          console.error('Transcription error:', error);
          alert(`Transcription failed: ${error.message}`);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Microphone error:', error);
      alert('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (audioLevelRafRef.current) cancelAnimationFrame(audioLevelRafRef.current);
    setAudioLevel(0);
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      STT_CHUNKING_ENABLED ? stopChunkingRecording() : stopRecording();
    } else {
      STT_CHUNKING_ENABLED ? startChunkingRecording() : startRecording();
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    if (isTranscribing) return;
    
    if ((message.trim() || attachedFiles.length > 0) && !isLoading && !uploading) {
      if (isRecording) {
        stopRecording();
        return;
      }

      const messageToSend = message.trim();
      const filesToSend = attachedFiles.map(f => f.url);
      
      setMessage('');
      setAttachedFiles([]);
      // Cancel any pending draft rAF and clear parent immediately
      if (draftRafRef.current) { cancelAnimationFrame(draftRafRef.current); draftRafRef.current = null; }
      latestDraftRef.current = '';
      onMessageChange?.('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '24px';
      }
      
      onSend(messageToSend, filesToSend, multiAgentMode ? selectedAgents : null);
    }
  };

  const [customAgents, setCustomAgents] = useState(() => {
    const saved = localStorage.getItem('caos_custom_agents');
    return saved ? JSON.parse(saved) : [];
  });

  const agents = [
    { id: 'all', name: 'All', color: 'bg-white/20' },
    { id: 'architect', name: 'Architect', color: 'bg-blue-500/20' },
    { id: 'security', name: 'Security', color: 'bg-red-500/20' },
    { id: 'engineer', name: 'Engineer', color: 'bg-green-500/20' },
    { id: 'qa', name: 'QA', color: 'bg-yellow-500/20' },
    { id: 'docs', name: 'Docs', color: 'bg-purple-500/20' },
    ...customAgents
  ];

  const handleAddAgent = () => {
    const name = prompt('Enter agent name:');
    if (name && name.trim()) {
      const newAgent = {
        id: name.toLowerCase().replace(/\s+/g, '_'),
        name: name.trim(),
        color: 'bg-cyan-500/20',
        isCustom: true
      };
      const updated = [...customAgents, newAgent];
      setCustomAgents(updated);
      localStorage.setItem('caos_custom_agents', JSON.stringify(updated));
    }
  };

  const handleDeleteAgent = (agentId) => {
    const updated = customAgents.filter(a => a.id !== agentId);
    setCustomAgents(updated);
    localStorage.setItem('caos_custom_agents', JSON.stringify(updated));
    setSelectedAgents(selectedAgents.filter(id => id !== agentId));
  };

  const toggleAgent = (agentId) => {
    if (agentId === 'all') {
      setSelectedAgents(['all']);
    } else {
      let newSelection = selectedAgents.filter(id => id !== 'all');
      if (newSelection.includes(agentId)) {
        newSelection = newSelection.filter(id => id !== agentId);
      } else {
        newSelection.push(agentId);
      }
      setSelectedAgents(newSelection.length === 0 ? ['all'] : newSelection);
    }
  };

  const handleAgentRightClick = (e, agentId) => {
    e.preventDefault();
    if (agentId === 'all') return;
    
    const agent = agents.find(a => a.id === agentId);
    
    if (agent?.isCustom) {
      // Custom agents: show delete option
      if (confirm(`Delete agent "${agent.name}"?`)) {
        handleDeleteAgent(agentId);
      }
    } else {
      // Built-in agents: show role edit
      const newRole = prompt('Enter role for this agent:');
      if (newRole && newRole.trim()) {
        const roles = JSON.parse(localStorage.getItem('caos_agent_roles') || '{}');
        roles[agentId] = newRole.trim();
        localStorage.setItem('caos_agent_roles', JSON.stringify(roles));
        alert(`Role updated for ${agentId}: ${newRole.trim()}`);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto px-4 py-2">
      <PointerEventsGuard targetRef={voiceButtonRef} label="TTS speaker button" />
      {/* Attached Files Display */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 px-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-blue-400" />
              ) : (
                <FileText className="w-4 h-4 text-blue-400" />
              )}
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-0.5 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/70" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Agent Chips - Above Input Bar */}
      {multiAgentMode && (
        <div className="mb-2 flex justify-center">
          <div className="flex flex-row flex-wrap gap-2 justify-center">
            {agents.map(agent => (
              <button
                key={agent.id}
                type="button"
                onClick={() => toggleAgent(agent.id)}
                onContextMenu={(e) => handleAgentRightClick(e, agent.id)}
                className={`px-3 py-1.5 rounded text-xs text-white/80 transition-all whitespace-nowrap ${
                  selectedAgents.includes(agent.id) || (selectedAgents.includes('all') && agent.id === 'all')
                    ? agent.color + ' border border-white/30'
                    : 'bg-white/5 border border-white/10 opacity-50'
                }`}
              >
                {agent.name}
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddAgent}
              className="px-3 py-1.5 rounded text-xs text-white/80 bg-white/5 border border-white/20 hover:bg-white/10 transition-all whitespace-nowrap"
            >
              + Add
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-3xl px-2 py-1.5 w-full shadow-lg">
        <div className="relative" ref={voiceMenuRef}>
          <button
             ref={voiceButtonRef}
             type="button"
             onClick={toggleGoogleVoicePlay}
             onContextMenu={handleVoiceButtonContextMenu}
             className={`chat-icon-btn p-1.5 rounded-full transition-colors flex-shrink-0 ${isPlayingGoogle ? 'bg-green-100' : 'hover:bg-gray-100'}`}
             title={isPlayingGoogle ? (isPausedGoogle ? 'Resume' : 'Pause') : 'Read AI response (Right-click for voice settings)'}
           >
             <Volume2 className={`w-4 h-4 ${isPlayingGoogle ? 'text-green-600' : 'text-gray-700'}`} />
           </button>

          {showVoiceMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 space-y-1 min-w-[180px] z-50">
              <div className="px-3 py-2 text-xs font-semibold text-gray-700">Voice</div>
              {[
                { label: 'Google US English', lang: 'en-US' },
                { label: 'Google UK English', lang: 'en-GB' },
                { label: 'Google US Spanish', lang: 'es-ES' },
                { label: 'Google French',     lang: 'fr-FR' },
                { label: 'Google German',     lang: 'de-DE' },
              ].map(({ label, lang }) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => {
                    setTTSPrefs({ wsLang: lang });
                    setShowVoiceMenu(false);
                    toast.success(`Voice changed to ${label}`);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    getTTSPrefs().wsLang === lang
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
              <div className="border-t border-gray-200 my-1 px-3 py-2">
                <label className="text-xs text-gray-600 block mb-1">
                  Speed: {getTTSPrefs().rate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.25"
                  defaultValue={getTTSPrefs().rate}
                  onChange={(e) => {
                    setTTSPrefs({ rate: parseFloat(e.target.value) });
                  }}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={message}
          maxLength={1000000}
          onChange={(e) => {
            if (_DEV) console.time('ChatInput onChange');
            setMessage(e.target.value);
            scheduleDraftPropagation(e.target.value);
            scheduleResize();
            if (_DEV) console.timeEnd('ChatInput onChange');
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();

              if (isTranscribing) return false;

              if ((message.trim() || attachedFiles.length > 0) && !isLoading && !uploading) {
                if (isRecording) {
                  stopRecording();
                  return false;
                }

                const messageToSend = message.trim();
                const filesToSend = attachedFiles.map(f => f.url);

                setMessage('');
                setAttachedFiles([]);
                // Cancel any pending draft rAF and clear parent immediately
                if (draftRafRef.current) { cancelAnimationFrame(draftRafRef.current); draftRafRef.current = null; }
                latestDraftRef.current = '';
                onMessageChange?.('');
                if (textareaRef.current) {
                  textareaRef.current.style.height = '24px';
                }

                onSend(messageToSend, filesToSend, multiAgentMode ? selectedAgents : null);
              }
              return false;
            }
          }}
          onPaste={(e) => {
            // CAOS-A1 Turn Handling: Multi-line paste = ONE turn (default)
            // No automatic turn segmentation
          }}
          onFocus={() => onTypingStart?.()}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 text-sm px-2 resize-none overflow-y-auto"
          style={{ minHeight: '24px', height: '24px', maxHeight: '200px' }}
          disabled={isLoading}
        />
        
        <div className="relative" ref={captureMenuRef}>
          <button
            type="button"
            onClick={() => setShowCaptureMenu(!showCaptureMenu)}
            className="chat-icon-btn p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            disabled={uploading}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4 text-gray-700" />
            )}
          </button>

          {showCaptureMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 space-y-1 min-w-[160px] z-50">
              <button
                type="button"
                onClick={() => {
                  setShowCaptureMenu(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                disabled={attachedFiles.length >= 5}
              >
                <FileText className="w-4 h-4" />
                Upload Files {attachedFiles.length >= 5 ? '(Max 5)' : `(${5 - attachedFiles.length} left)`}
              </button>
              <button
                type="button"
                onClick={captureScreen}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <Monitor className="w-4 h-4" />
                Capture Screen
              </button>
              <button
                type="button"
                onClick={captureCamera}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>
            </div>
          )}
        </div>

        {!isRecording ? (
          <button
            type="button"
            onClick={toggleVoiceRecording}
            disabled={isTranscribing}
            className={`chat-icon-btn p-1.5 rounded-full transition-colors flex-shrink-0 ${
              isTranscribing ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}
            title={isTranscribing ? 'Transcribing...' : 'Start recording'}
          >
            {isTranscribing ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mic className="w-4 h-4 text-gray-700" />
            )}
          </button>
        ) : (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Live audio level bars */}
            <div className="flex items-end gap-0.5 h-5">
              {[0.4, 0.7, 1.0, 0.7, 0.4].map((scale, i) => (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(4, audioLevel * scale)}%`, maxHeight: '20px', minHeight: '4px' }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className="p-1.5 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
              title="Finish recording"
            >
              <Check className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          max="5"
          onChange={handleFileSelect}
          className="hidden"
        />

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCameraCapture}
          className="hidden"
        />

        <button
          type="submit"
          disabled={(!message.trim() && attachedFiles.length === 0) || isLoading || uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 sm:px-4 py-1.5 h-auto text-sm font-medium disabled:opacity-50 flex-shrink-0 shadow-sm"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Send'
          )}
        </button>
      </div>

      {/* STT Chunking Progress Bar — visible during chunked recording */}
      {isChunking && (
        <div className="mt-1.5 mx-1 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              Recording — transcribing in chunks
            </span>
            <span className="text-xs text-gray-400">
              {chunkProgress.processed}/{chunkProgress.recorded} chunks
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{
                width: chunkProgress.recorded > 0
                  ? `${Math.round((chunkProgress.processed / chunkProgress.recorded) * 100)}%`
                  : '0%'
              }}
            />
          </div>
        </div>
      )}

      {/* Inline Google Voice Player Bar */}
      {isPlayingGoogle && (
        <div className="mt-1.5 mx-1 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-md">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${googleSpeechProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  stopGoogleVoice();
                  setTimeout(() => toggleGoogleVoicePlay(), 80);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Restart"
              >
                <SkipBack className="w-4 h-4 text-blue-600" />
              </button>
              <button
                type="button"
                onClick={toggleGoogleVoicePlay}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title={isPausedGoogle ? 'Resume' : 'Pause'}
              >
                {isPausedGoogle ? (
                  <Play className="w-4 h-4 text-blue-600" />
                ) : (
                  <Pause className="w-4 h-4 text-blue-600" />
                )}
              </button>
              <button
                type="button"
                onClick={stopGoogleVoice}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Stop"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}