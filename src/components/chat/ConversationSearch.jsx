import React, { useState, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConversationSearch({ messages, onJumpToMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const foundMatches = messages
      .map((msg, idx) => ({ msg, idx }))
      .filter(({ msg }) => msg.content?.toLowerCase().includes(lowerQuery));

    setMatches(foundMatches);
    setCurrentMatchIndex(0);
  }, [query, messages]);

  const handleNext = () => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    onJumpToMessage(matches[nextIndex].msg.id);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIndex);
    onJumpToMessage(matches[prevIndex].msg.id);
  };

  useEffect(() => {
    if (matches.length > 0 && query) {
      onJumpToMessage(matches[currentMatchIndex].msg.id);
    }
  }, [currentMatchIndex, matches, query]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
        title="Search in conversation"
      >
        <Search className="w-4 h-4 text-white/70" />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center gap-2 bg-[#0f1f3d]/95 backdrop-blur-xl border border-white/20 rounded-lg px-3 py-1.5"
      >
        <Search className="w-4 h-4 text-white/50 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="bg-transparent text-white text-sm outline-none w-32"
          autoFocus
        />
        {matches.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-white/60">
              {currentMatchIndex + 1}/{matches.length}
            </span>
            <button
              onClick={handlePrev}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Previous"
            >
              <ChevronUp className="w-3.5 h-3.5 text-white/70" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Next"
            >
              <ChevronDown className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        )}
        <button
          onClick={() => {
            setIsOpen(false);
            setQuery('');
            setMatches([]);
          }}
          className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}