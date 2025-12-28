import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Volume2, Copy } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🤔', '👀', '🔥', '😊', '🎯'];

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

  // Stop speech when menu closes
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
        // Clear the visual selection to prevent reading menu text
        window.getSelection().removeAllRanges();
        
        // Read only the captured selectedText
        const utterance = new SpeechSynthesisUtterance(selectedText);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedText).then(() => {
      toast.success('Copied to clipboard');
      onClose();
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{
          top: 0,
          left: 0,
          right: window.innerWidth - 300,
          bottom: window.innerHeight - 100
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 1000,
        }}
        className="bg-[#1a2744]/95 backdrop-blur-xl border-2 border-white/30 rounded-xl shadow-2xl p-2 min-w-[280px] cursor-move select-none"
      >
        <div className="flex items-center justify-between mb-2 px-2 cursor-move">
          <span className="text-white/70 text-xs pointer-events-none">React or reply</span>
          <button
            onClick={() => {
              if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
              onClose();
            }}
            className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
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
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={handleReadAloud}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg transition-colors text-white text-sm justify-center"
              >
                <Volume2 className="w-4 h-4" />
                {isSpeaking ? 'Stop' : 'Read'}
              </button>
              <button
                onClick={() => setShowReplyInput(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 rounded-lg transition-colors text-white text-sm justify-center"
              >
                <MessageSquare className="w-4 h-4" />
                Reply
              </button>
              <button
                onClick={handleCopy}
                className="col-span-2 flex items-center gap-2 px-3 py-2 bg-green-600/30 hover:bg-green-600/50 rounded-lg transition-colors text-white text-sm justify-center"
              >
                <Copy className="w-4 h-4" />
                Copy
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