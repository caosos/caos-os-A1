import React, { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, Send, Plus, X, FileText, Image as ImageIcon, Camera, Monitor, Pause } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import html2canvas from 'html2canvas';

export default function ChatInput({ onSend, isLoading, lastAssistantMessage, onTypingStart, multiAgentMode, conversationId, messageValue = '', onMessageChange }) {
  const [message, setMessage] = useState(messageValue);
  const [attachedFiles, setAttachedFiles] = useState([]);
  
  useEffect(() => {
    setMessage(messageValue);
  }, [messageValue]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCaptureMenu, setShowCaptureMenu] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState(['all']);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [speechRate, setSpeechRate] = useState(() => {
    const saved = localStorage.getItem('caos_speech_rate');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [speechProgress, setSpeechProgress] = useState(0);
  const fileInputRef = useRef(null);
  const utteranceRef = useRef(null);
  const voiceMenuRef = useRef(null);
  const progressInterval = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Load saved voice preference
      const savedVoiceURI = localStorage.getItem('caos_voice_preference');
      if (savedVoiceURI) {
        const voice = voices.find(v => v.voiceURI === savedVoiceURI);
        if (voice) setSelectedVoice(voice);
      } else {
        // Default to a good English voice if available
        const goodVoice = voices.find(v => 
          v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural'))
        ) || voices.find(v => v.lang.startsWith('en'));
        if (goodVoice) setSelectedVoice(goodVoice);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
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
  const recognitionRef = useRef(null);
  const cameraInputRef = useRef(null);
  const lastTranscriptRef = useRef('');
  const isRecordingRef = useRef(false);
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

  const toggleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser');
      return;
    }

    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      // Resume progress tracking
      if (utteranceRef.current && lastAssistantMessage) {
        const messageLength = lastAssistantMessage.length;
        const estimatedDuration = (messageLength / 15) / speechRate;
        const currentProgress = speechProgress;
        const remainingTime = estimatedDuration * ((100 - currentProgress) / 100);
        const startTime = Date.now();
        
        progressInterval.current = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const additionalProgress = (elapsed / remainingTime) * (100 - currentProgress);
          const progress = Math.min(currentProgress + additionalProgress, 99);
          setSpeechProgress(progress);
        }, 100);
      }
    } else {
      if (lastAssistantMessage) {
        // Cancel any existing speech and wait a moment
        window.speechSynthesis.cancel();

        // Clean markdown formatting for natural speech
        const cleanText = lastAssistantMessage
          .replace(/#{1,6}\s/g, '') // Remove markdown headers
          .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.+?)\*/g, '$1') // Remove italic
          .replace(/_(.+?)_/g, '$1') // Remove underscore italic
          .replace(/`(.+?)`/g, '$1') // Remove inline code
          .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
          .replace(/^[-*+]\s/gm, '') // Remove list markers
          .replace(/^\d+\.\s/gm, '') // Remove numbered lists
          .replace(/>/g, '') // Remove blockquotes
          .replace(/\|/g, '') // Remove table pipes
          .replace(/---+/g, '') // Remove horizontal rules
          .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
          .trim();

        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(cleanText);
          
          // Get voices and apply selection
          const voices = window.speechSynthesis.getVoices();
          if (selectedVoice) {
            const voice = voices.find(v => v.voiceURI === selectedVoice.voiceURI);
            if (voice) {
              utterance.voice = voice;
            }
          }
          
          // Apply settings
          utterance.rate = speechRate;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = 'en-US';

          const messageLength = cleanText.length;
          const estimatedDuration = (messageLength / 15) / speechRate;
          
          utterance.onstart = () => {
            console.log('Speech started');
            setSpeechProgress(0);
            const startTime = Date.now();
            progressInterval.current = setInterval(() => {
              const elapsed = (Date.now() - startTime) / 1000;
              const progress = Math.min((elapsed / estimatedDuration) * 100, 99);
              setSpeechProgress(progress);
            }, 100);
          };
          
          utterance.onend = () => {
            console.log('Speech ended');
            setIsSpeaking(false);
            setIsPaused(false);
            setSpeechProgress(100);
            setTimeout(() => setSpeechProgress(0), 500);
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
              progressInterval.current = null;
            }
            utteranceRef.current = null;
          };
          
          utterance.onerror = (e) => {
            console.error('Speech error:', e);
            setIsSpeaking(false);
            setIsPaused(false);
            setSpeechProgress(0);
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
              progressInterval.current = null;
            }
            utteranceRef.current = null;
          };
          
          utteranceRef.current = utterance;
          setIsSpeaking(true);
          setIsPaused(false);
          window.speechSynthesis.speak(utterance);
          console.log('Speaking:', utterance);
        }, 100);
      }
    }
  };

  const stopReadAloud = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeechProgress(0);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    utteranceRef.current = null;
  };

  const toggleVoiceRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isRecording) {
      isRecordingRef.current = false;
      recognitionRef.current?.stop();
      setIsRecording(false);
      lastTranscriptRef.current = '';
    } else {
      // CAOS-A1: Base44 UI Layer handles speech-to-text (Whisper equivalent)
      // Output is UNTRUSTED and will be sent to CAOS for normalization
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      isRecordingRef.current = true;
      lastTranscriptRef.current = '';

      recognition.onresult = (event) => {
        // Build complete transcript from all final results
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
        }
        
        // Only add the NEW part that wasn't in our last transcript
        if (fullTranscript && fullTranscript !== lastTranscriptRef.current) {
          const newPart = fullTranscript.slice(lastTranscriptRef.current.length);
          if (newPart.trim()) {
            // CAOS-A1: Raw transcript added to input (untrusted)
            setMessage(prev => prev + (prev ? ' ' : '') + newPart.trim());
            
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            }
          }
          lastTranscriptRef.current = fullTranscript;
        }
      };
      
      recognition.onerror = (event) => {
        console.error('[Whisper UI] Speech recognition error', event.error);
        if (event.error !== 'aborted' && isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {
                console.error('[Whisper UI] Restart failed:', e);
              }
            }
          }, 5000);
        } else {
          isRecordingRef.current = false;
          setIsRecording(false);
          lastTranscriptRef.current = '';
        }
      };
      
      recognition.onend = () => {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {
                console.error('[Whisper UI] Restart failed:', e);
                isRecordingRef.current = false;
                setIsRecording(false);
                lastTranscriptRef.current = '';
              }
            }
          }, 5000);
        } else {
          setIsRecording(false);
          lastTranscriptRef.current = '';
        }
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((message.trim() || attachedFiles.length > 0) && !isLoading && !uploading) {
      // Stop recording if active
      if (isRecording) {
        isRecordingRef.current = false;
        recognitionRef.current?.stop();
        setIsRecording(false);
        lastTranscriptRef.current = '';
      }

      onSend(message.trim(), attachedFiles.map(f => f.url), multiAgentMode ? selectedAgents : null);
      setMessage('');
      setAttachedFiles([]);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '24px';
      }
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
        <button
          type="button"
          onClick={toggleVoiceRecording}
          className={`p-1.5 rounded-full transition-colors flex-shrink-0 relative ${isRecording ? 'bg-red-100 animate-pulse' : 'hover:bg-gray-100'}`}
        >
          <Mic className={`w-4 h-4 ${isRecording ? 'text-red-500' : 'text-gray-700'}`} />
          {isRecording && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          )}
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            e.target.style.height = 'auto';
            const newHeight = Math.min(e.target.scrollHeight, 168);
            e.target.style.height = newHeight + 'px';
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();

              // Send message directly without form submission
              if ((message.trim() || attachedFiles.length > 0) && !isLoading && !uploading) {
                if (isRecording) {
                  isRecordingRef.current = false;
                  recognitionRef.current?.stop();
                  setIsRecording(false);
                  lastTranscriptRef.current = '';
                }
                onSend(message.trim(), attachedFiles.map(f => f.url), multiAgentMode ? selectedAgents : null);
                
                // Clear message and files immediately
                setTimeout(() => {
                  setMessage('');
                  setAttachedFiles([]);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = '24px';
                  }
                }, 0);
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
          style={{ minHeight: '24px', height: '24px', maxHeight: '168px' }}
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

        <div className="relative hidden sm:block" ref={voiceMenuRef}>
          {isSpeaking ? (
            <>
              <button
                type="button"
                onClick={toggleReadAloud}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 bg-blue-100"
              >
                {isPaused ? (
                  <Volume2 className="w-4 h-4 text-blue-600" />
                ) : (
                  <Pause className="w-4 h-4 text-blue-600" />
                )}
              </button>
              <button
                type="button"
                onClick={stopReadAloud}
                className="p-1.5 rounded-full hover:bg-red-100 transition-colors flex-shrink-0 bg-red-50"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleReadAloud}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowVoiceMenu(!showVoiceMenu);
              }}
              disabled={!lastAssistantMessage}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 disabled:opacity-30"
            >
              <Volume2 className="w-4 h-4 text-gray-700" />
            </button>
          )}

          {showVoiceMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3 min-w-[280px] max-h-[400px] overflow-y-auto z-50">
              <div className="text-xs font-semibold text-gray-500 px-2 py-1 mb-2">Voice Settings</div>
              
              {/* Speed Control */}
              <div className="px-2 py-2 mb-3 border-b border-gray-200">
                <label className="text-xs text-gray-600 mb-1 block">Speed: {speechRate.toFixed(1)}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value);
                    setSpeechRate(rate);
                    localStorage.setItem('caos_speech_rate', rate.toString());
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>

              <div className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">Select Voice</div>
              {availableVoices.filter(v => v.lang.startsWith('en')).map((voice) => (
                <button
                  key={voice.voiceURI}
                  type="button"
                  onClick={() => {
                    setSelectedVoice(voice);
                    localStorage.setItem('caos_voice_preference', voice.voiceURI);
                    setShowVoiceMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors ${
                    selectedVoice?.voiceURI === voice.voiceURI
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate">{voice.name}</span>
                  {selectedVoice?.voiceURI === voice.voiceURI && (
                    <span className="text-blue-600 ml-2">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Progress Bar */}
          {isSpeaking && (
            <div className="absolute bottom-full right-0 mb-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-100"
                    style={{ width: `${speechProgress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">{Math.round(speechProgress)}%</span>
              </div>
            </div>
          )}
        </div>

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
    </form>
  );
}