import React, { useState } from 'react';
import { Mic, Volume2, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function ChatInput({ onSend, isLoading }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3">
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-2">
        <button
          type="button"
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <Mic className="w-5 h-5 text-white/70" />
        </button>
        
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/50 text-sm px-2"
          disabled={isLoading}
        />
        
        <button
          type="button"
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <Volume2 className="w-5 h-5 text-white/70" />
        </button>
        
        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 h-auto text-sm font-medium disabled:opacity-50"
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