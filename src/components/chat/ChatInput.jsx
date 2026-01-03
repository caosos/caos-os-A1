import React, { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, Send, Plus, X, FileText, Image as ImageIcon, Camera, Monitor } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import html2canvas from 'html2canvas';

export default function ChatInput({ onSend, isLoading, lastAssistantMessage, onTypingStart, multiAgentMode }) {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCaptureMenu, setShowCaptureMenu] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState(['all']);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (captureMenuRef.current && !captureMenuRef.current.contains(event.target)) {
        setShowCaptureMenu(false);
      }
    };

    if (showCaptureMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCaptureMenu]);
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
        uploadedFiles.push({
          name: file.name,
          url: result.file_url,
          type: file.type,
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

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      if (lastAssistantMessage) {
        const utterance = new SpeechSynthesisUtterance(lastAssistantMessage);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
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
        console.error('Speech recognition error', event.error);
        if (event.error !== 'aborted' && isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {
                console.error('Restart failed:', e);
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
                console.error('Restart failed:', e);
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
    const action = confirm('Right-click menu:\n\n[OK] = Edit Role\n[Cancel] = Delete Agent' + (agent?.isCustom ? '' : ' (built-in agents cannot be deleted)'));
    
    if (action) {
      // Edit role
      const newRole = prompt('Enter role for this agent:');
      if (newRole && newRole.trim()) {
        const roles = JSON.parse(localStorage.getItem('caos_agent_roles') || '{}');
        roles[agentId] = newRole.trim();
        localStorage.setItem('caos_agent_roles', JSON.stringify(roles));
        alert(`Role updated for ${agentId}: ${newRole.trim()}`);
      }
    } else if (agent?.isCustom) {
      // Delete custom agent
      if (confirm(`Delete agent "${agent.name}"?`)) {
        handleDeleteAgent(agentId);
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
            const newHeight = Math.min(e.target.scrollHeight, 120);
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
                setMessage('');
                setAttachedFiles([]);
                if (textareaRef.current) {
                  textareaRef.current.style.height = '24px';
                }
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
          style={{ minHeight: '24px', height: '24px', maxHeight: '120px' }}
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
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2 space-y-1 min-w-[160px]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
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

        <button
          type="button"
          onClick={toggleReadAloud}
          disabled={!lastAssistantMessage}
          className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 ${isSpeaking ? 'bg-blue-100' : ''} disabled:opacity-30`}
        >
          <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-blue-600 animate-pulse' : 'text-gray-700'}`} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          max="5"
          accept="image/*,application/pdf,.doc,.docx,.txt,.js,.jsx,.ts,.tsx,.py,.json,.csv,.xml,.html,.css"
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
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-1.5 h-auto text-sm font-medium disabled:opacity-50 flex-shrink-0 shadow-sm"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Send'
          )}
        </button>
          </div>
        </div>
      </div>
        </div>
      </div>
    </form>
  );
}