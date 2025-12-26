import React, { useState, useRef } from 'react';
import { Mic, Volume2, Send, Plus, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';

export default function ChatInput({ onSend, isLoading, lastAssistantMessage }) {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

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
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = false; // Turn off interim results to prevent duplicates
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        // Get the latest result
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript + ' ';
          setMessage(prev => prev + transcript);
          // Adjust textarea height
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
          }
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((message.trim() || attachedFiles.length > 0) && !isLoading && !uploading) {
      // Stop recording if active
      if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
      }
      
      onSend(message.trim(), attachedFiles.map(f => f.url));
      setMessage('');
      setAttachedFiles([]);
      // Reset textarea height
      const textarea = e.target.querySelector('textarea');
      if (textarea) {
        textarea.style.height = '24px';
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
      
      <div className="flex items-center gap-1.5 bg-[#1a2744] border border-white/20 rounded-3xl px-2 py-1.5 w-full">
        <button
          type="button"
          onClick={toggleVoiceRecording}
          className={`p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0 ${isRecording ? 'bg-red-500/20' : ''}`}
        >
          <Mic className={`w-4 h-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-white/70'}`} />
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/50 text-sm px-2 resize-none overflow-hidden"
          style={{ minHeight: '24px', height: '24px' }}
          disabled={isLoading}
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          disabled={uploading}
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
          ) : (
            <Plus className="w-4 h-4 text-white/70" />
          )}
        </button>

        <button
          type="button"
          onClick={toggleReadAloud}
          disabled={!lastAssistantMessage}
          className={`p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0 ${isSpeaking ? 'bg-blue-500/20' : ''} disabled:opacity-30`}
        >
          <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-blue-500 animate-pulse' : 'text-white/70'}`} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          type="submit"
          disabled={(!message.trim() && attachedFiles.length === 0) || isLoading || uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 py-1.5 h-auto text-sm font-medium disabled:opacity-50 flex-shrink-0"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Send'
          )}
        </Button>
      </div>
    </form>
  );
}