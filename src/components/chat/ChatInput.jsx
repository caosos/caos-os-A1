import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { toggleGoogleReadAloud } from './ChatInputReadAloud';

export default function ChatInput({ 
  onSend, 
  isLoading, 
  lastAssistantMessage, 
  onTypingStart,
  messageValue = '',
  onMessageChange = () => {}
}) {
  const [files, setFiles] = useState([]);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 168) + 'px';
    }
  }, [messageValue]);

  const handleSend = async () => {
    if (!messageValue.trim() && files.length === 0) return;

    const fileUrls = files.map(f => f.url);
    
    onTypingStart?.();
    onSend(messageValue, fileUrls);
    onMessageChange('');
    setFiles([]);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    const uploadedFiles = [];
    for (const file of selectedFiles) {
      try {
        const { data } = await (async () => {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/files/upload', { method: 'POST', body: formData });
          return response.json();
        })();
        
        uploadedFiles.push({ name: file.name, url: data.url });
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setFiles([...files, ...uploadedFiles]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full px-2 sm:px-4">
      {files.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, idx) => (
            <div key={idx} className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white/80 flex items-center gap-2">
              📎 {file.name}
              <button
                onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                className="ml-1 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={messageValue}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/40 resize-none max-h-[168px]"
          rows={1}
          disabled={isLoading}
        />

        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="text-white/70 hover:text-white hover:bg-white/10"
            title="Attach file"
          >
            <Plus className="w-5 h-5" />
          </Button>

          {lastAssistantMessage && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleGoogleReadAloud(lastAssistantMessage, isReadingAloud, setIsReadingAloud)}
              disabled={isLoading}
              className="text-white/70 hover:text-white hover:bg-white/10"
              title="Read last message with Google Voice"
            >
              <Volume2 className={`w-5 h-5 ${isReadingAloud ? 'animate-pulse' : ''}`} />
            </Button>
          )}

          <Button
            size="icon"
            onClick={handleSend}
            disabled={isLoading || (!messageValue.trim() && files.length === 0)}
            className="bg-white/20 hover:bg-white/30 text-white"
            title="Send message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="*"
      />
    </div>
  );
}