import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Volume2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🤔', '👀', '🔥', '✨', '🎯'];

export default function TextSelectionMenu({ 
  position, 
  selectedText, 
  onReact, 
  onReply, 
  onClose 
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(selectedText, replyText);
      setReplyText('');
      setShowReplyInput(false);
      onClose();
    }
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      } else {
        // Clean the text - remove emojis and special characters
        const cleanText = selectedText
          .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
          .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Remove misc symbols
          .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Remove dingbats
          .trim();
        
        if (cleanText) {
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
        }
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 1000,
        }}
        className="bg-[#1a2744]/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-2 min-w-[280px]"
      >
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-white/70 text-xs">React or reply</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-3 h-3 text-white/50" />
          </button>
        </div>

        {!showReplyInput ? (
          <>
            <div className="flex gap-1 mb-2 flex-wrap">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(selectedText, emoji);
                    onClose();
                  }}
                  className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all text-xl"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <button
                onClick={handleReadAloud}
                className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg transition-colors text-white text-sm"
              >
                <Volume2 className="w-4 h-4" />
                {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
              </button>
              <button
                onClick={() => setShowReplyInput(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 rounded-lg transition-colors text-white text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Reply to this
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="bg-white/10 border-white/20 text-white text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleReply();
                if (e.key === 'Escape') setShowReplyInput(false);
              }}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => setShowReplyInput(false)}
                variant="ghost"
                size="sm"
                className="flex-1 text-white/70 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReply}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}