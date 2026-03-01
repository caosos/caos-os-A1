import React, { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, Send, Plus, X, FileText, Image as ImageIcon, Camera, Monitor, Pause, Check, Play, SkipBack, SkipForward } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export default function ChatInput({ onSend, isLoading, lastAssistantMessage, onTypingStart, multiAgentMode, conversationId, messageValue = '', onMessageChange }) {
  const [message, setMessage] = useState(messageValue);
  const [attachedFiles, setAttachedFiles] = useState([]);
  
  useEffect(() => {
    setMessage(messageValue);
  }, [messageValue]);
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
  const fileInputRef = useRef(null);
  const voiceMenuRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const googleUtteranceRef = useRef(null);
  const voiceButtonRef = useRef(null);

  // Stop speech synthesis on unmount
  useEffect(() => {
    const handleUnload = () => {
      window.speechSynthesis.cancel();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.speechSynthesis.cancel();
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

  const getCleanText = (text) => text
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

  const stopGoogleVoice = () => {
    window.speechSynthesis.cancel();
    googleUtteranceRef.current = null;
    setIsPlayingGoogle(false);
    setIsPausedGoogle(false);
    setGoogleSpeechProgress(0);
  };

  const toggleGoogleVoicePlay = () => {
    if (!lastAssistantMessage) return;

    // If already speaking, pause/resume
    if (isPlayingGoogle) {
      if (isPausedGoogle) {
        window.speechSynthesis.resume();
        setIsPausedGoogle(false);
      } else {
        window.speechSynthesis.pause();
        setIsPausedGoogle(true);
      }
      return;
    }

    // Start new speech
    const cleanText = getCleanText(lastAssistantMessage);
    const voices = window.speechSynthesis.getVoices();
    const voicePref = localStorage.getItem('caos_google_voice') || 'Google US English';
    const voiceMap = {
      'Google US English': 'en-US',
      'Google UK English': 'en-GB',
      'Google US Spanish': 'es-ES',
      'Google French': 'fr-FR',
      'Google German': 'de-DE',
    };
    const langCode = voiceMap[voicePref] || 'en-US';
    const selectedVoice = voices.find(v => v.lang.startsWith(langCode));

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const speed = parseFloat(localStorage.getItem('caos_google_speech_rate') || '1.0');
    utterance.rate = Math.max(0.1, Math.min(speed, 2.0));
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => {
      googleUtteranceRef.current = utterance;
      setIsPlayingGoogle(true);
      setIsPausedGoogle(false);
    };
    utterance.onend = () => {
      stopGoogleVoice();
    };
    utterance.onerror = () => {
      stopGoogleVoice();
      toast.error('Google Voice read-aloud failed');
    };
    utterance.onboundary = () => {
      // Estimate progress (Web Speech API doesn't provide exact progress)
      setGoogleSpeechProgress(prev => Math.min(prev + 2, 90));
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceButtonContextMenu = (e) => {
    e.preventDefault();
    setShowVoiceMenu(!showVoiceMenu);
  };

  // ██████████████████████████████████████████████████████████████████
  // ██  FORT KNOX LOCK — DO NOT TOUCH — GOOGLE WEB SPEECH TTS       ██
  // ██  LOCKED: 2026-03-01 — WORKING AND CONFIRMED                  ██
  // ██  Reads last AI message via browser Web Speech API             ██
  // ██  Voice pref: localStorage caos_google_voice                   ██
  // ██  Speed pref: localStorage caos_google_speech_rate             ██
  // ██  DO NOT MODIFY: toggleGoogleVoicePlay, stopGoogleVoice,       ██
  // ██  voice menu, controls, getCleanText, or voice preference keys ██
  // ██  ANY CHANGE REQUIRES EXPLICIT USER APPROVAL                   ██
  // ██████████████████████████████████████████████████████████████████

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setIsTranscribing(true);
        try {
          // Convert blob to File for proper handling
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
          const { data } = await base44.functions.invoke('transcribeAudio', { audio: audioFile });
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
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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
             disabled={!lastAssistantMessage}
             className={`p-1.5 rounded-full transition-colors flex-shrink-0 disabled:opacity-30 ${isPlayingGoogle ? 'bg-green-100' : 'hover:bg-gray-100'}`}
             title={isPlayingGoogle ? (isPausedGoogle ? 'Resume' : 'Pause') : 'Read AI response (Right-click for voice settings)'}
           >
             <Volume2 className={`w-4 h-4 ${isPlayingGoogle ? 'text-green-600' : 'text-gray-700'}`} />
           </button>

          {showVoiceMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 space-y-1 min-w-[180px] z-50">
              <div className="px-3 py-2 text-xs font-semibold text-gray-700">Voice</div>
              {['Google US English', 'Google UK English', 'Google US Spanish', 'Google French', 'Google German'].map((voice) => (
                <button
                  key={voice}
                  type="button"
                  onClick={() => {
                    localStorage.setItem('caos_google_voice', voice);
                    setShowVoiceMenu(false);
                    toast.success(`Voice changed to ${voice}`);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    (localStorage.getItem('caos_google_voice') || 'Google US English') === voice
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {voice}
                </button>
              ))}
              <div className="border-t border-gray-200 my-1 px-3 py-2">
                <label className="text-xs text-gray-600 block mb-1">
                  Speed: {(parseFloat(localStorage.getItem('caos_google_speech_rate') || '1.0')).toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.25"
                  defaultValue={localStorage.getItem('caos_google_speech_rate') || '1.0'}
                  onChange={(e) => {
                    localStorage.setItem('caos_google_speech_rate', e.target.value);
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
            setMessage(e.target.value);
            onMessageChange?.(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
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
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
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
            onClick={startRecording}
            disabled={isTranscribing}
            className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
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
          <button
            type="button"
            onClick={stopRecording}
            className="p-1.5 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex-shrink-0"
            title="Finish recording"
          >
            <Check className="w-4 h-4 text-white" />
          </button>
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
                  // Rewind by cancelling and replaying from start (Web Speech API limitation)
                  window.speechSynthesis.cancel();
                  setGoogleSpeechProgress(0);
                  setIsPausedGoogle(false);
                  toggleGoogleVoicePlay();
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