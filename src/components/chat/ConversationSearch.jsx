import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ConversationSearch({ messages, onJumpToMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setMatches([]);
      setShowDropdown(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const foundMatches = messages
      .map((msg, idx) => ({ msg, idx }))
      .filter(({ msg }) => msg.content?.toLowerCase().includes(lowerQuery));

    setMatches(foundMatches);
    setShowDropdown(foundMatches.length > 0);
  }, [query, messages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSnippet = (content, query) => {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);
    
    if (index === -1) return content.substring(0, 100);
    
    const start = Math.max(0, index - 30);
    const end = Math.min(content.length, index + query.length + 50);
    const snippet = content.substring(start, end);
    
    return (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : '');
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-yellow-400/30 text-yellow-200">{part}</span>
        : part
    );
  };

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
    <div className="relative" ref={dropdownRef}>
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
          onFocus={() => matches.length > 0 && setShowDropdown(true)}
          placeholder="Search messages..."
          className="bg-transparent text-white text-sm outline-none w-32"
          autoFocus
        />
        {matches.length > 0 && (
          <span className="text-xs text-white/60 flex-shrink-0">
            {matches.length}
          </span>
        )}
        <button
          onClick={() => {
            setIsOpen(false);
            setQuery('');
            setMatches([]);
            setShowDropdown(false);
          }}
          className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5 text-white/70" />
        </button>
      </motion.div>

      <AnimatePresence>
        {showDropdown && matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute right-0 top-full mt-2 w-80 bg-[#0f1f3d]/98 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl overflow-hidden z-50"
          >
            <ScrollArea className="max-h-96">
              <div className="p-2">
                {matches.map(({ msg, idx }, matchIdx) => (
                  <button
                    key={msg.id}
                    onClick={() => {
                      onJumpToMessage(msg.id);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors mb-1 border border-white/5 hover:border-white/20"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white/40">#{matchIdx + 1}</span>
                      <span className={`text-xs font-medium ${
                        msg.role === 'user' ? 'text-blue-400' : 'text-purple-400'
                      }`}>
                        {msg.role === 'user' ? 'You' : 'CAOS'}
                      </span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {highlightMatch(getSnippet(msg.content, query), query)}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}