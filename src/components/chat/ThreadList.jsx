import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Trash2, Edit2, Check, Search, Copy } from 'lucide-react';
import moment from 'moment';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import TokenMeter from './TokenMeter';
import { toast } from 'sonner';

export default function ThreadList({ 
  isOpen, 
  onClose, 
  conversations, 
  currentConversationId, 
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  messages = {}
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, conv }
  const longPressTimer = useRef(null);
  const contextMenuRef = useRef(null);

  const openContextMenu = useCallback((e, conv) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, conv });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const copyThreadId = useCallback((conv) => {
    const sessionId = conv.session_id;
    const convId = conv.id;
    let toCopy = '';
    if (sessionId && convId && sessionId !== convId) {
      toCopy = `sessionId: ${sessionId}\nconversationId: ${convId}`;
    } else {
      toCopy = sessionId || convId || '';
    }
    navigator.clipboard.writeText(toCopy).then(() => {
      toast.success('Copied Thread ID');
    });
    closeContextMenu();
  }, [closeContextMenu]);

  // Long-press handlers for mobile
  const handleLongPressStart = useCallback((conv) => {
    longPressTimer.current = setTimeout(() => {
      // Simulate a context menu at center-ish position
      setContextMenu({ x: window.innerWidth / 2 - 80, y: window.innerHeight / 2, conv });
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = [];
    const lowerQuery = query.toLowerCase();

    conversations.forEach(conv => {
      const convMessages = messages[conv.id] || [];
      const matchingMessages = convMessages.filter(msg => 
        msg.content?.toLowerCase().includes(lowerQuery)
      );

      if (matchingMessages.length > 0) {
        results.push({
          conversation: conv,
          matches: matchingMessages.map(msg => ({
            content: msg.content,
            role: msg.role,
            timestamp: msg.timestamp
          }))
        });
      }
    });

    setSearchResults(results);
  };
  
  return (
    <>
      {/* Row-scoped context menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div className="fixed inset-0" style={{ zIndex: 10001 }} onClick={closeContextMenu} onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }} />
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 10002 }}
              className="bg-[#1a2f55] border border-white/20 rounded-lg shadow-xl py-1 min-w-[160px]"
            >
              <button
                onClick={() => copyThreadId(contextMenu.conv)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left"
              >
                <Copy className="w-4 h-4 text-blue-400" />
                Copy Thread ID
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-[#0f1f3d]/95 backdrop-blur-xl border-r border-white/10 flex flex-col"
            style={{ zIndex: 9999 }}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold">Previous Threads</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search all messages..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {searchQuery && searchResults.length > 0 ? (
                  <>
                    <div className="text-white/60 text-xs mb-2 px-2">
                      Found in {searchResults.length} thread{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    {searchResults.map((result) => (
                      <div
                        key={result.conversation.id}
                        className="mb-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => {
                          onSelectConversation(result.conversation.id);
                          onClose();
                        }}
                      >
                        <div className="text-white font-medium text-sm mb-2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {result.conversation.title}
                        </div>
                        {result.matches.slice(0, 2).map((match, idx) => (
                          <div key={idx} className="text-white/60 text-xs mb-1" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            <span className="text-white/40">{match.role === 'user' ? 'You' : 'CAOS'}:</span> {match.content}
                          </div>
                        ))}
                        {result.matches.length > 2 && (
                          <div className="text-white/40 text-xs mt-1">
                            +{result.matches.length - 2} more match{result.matches.length - 2 !== 1 ? 'es' : ''}
                          </div>
                        )}
                        <div className="text-white/30 text-xs mt-2">
                          {moment(result.conversation.last_message_time || result.conversation.created_date).fromNow()}
                        </div>
                      </div>
                    ))}
                  </>
                ) : searchQuery && searchResults.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages found</p>
                    <p className="text-xs text-white/30 mt-1">"{searchQuery}"</p>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`
                        p-3 rounded-xl mb-2 transition-all
                        ${currentConversationId === conv.id 
                          ? 'bg-blue-600/30 border border-blue-500/50' 
                          : 'hover:bg-white/10 border border-transparent'
                        }
                      `}
                      onContextMenu={(e) => openContextMenu(e, conv)}
                      onTouchStart={() => handleLongPressStart(conv)}
                      onTouchEnd={handleLongPressEnd}
                      onTouchMove={handleLongPressEnd}
                    >
                      {editingId === conv.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="bg-white/10 border-white/20 text-white text-sm h-8 px-2 flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onRenameConversation(conv.id, editTitle);
                                setEditingId(null);
                              } else if (e.key === 'Escape') {
                                setEditingId(null);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              onRenameConversation(conv.id, editTitle);
                              setEditingId(null);
                            }}
                            className="p-1 rounded hover:bg-white/10 shrink-0"
                          >
                            <Check className="w-4 h-4 text-green-400" />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'start' }}>
                          <div 
                            className="cursor-pointer"
                            onClick={() => {
                              onSelectConversation(conv.id);
                              onClose();
                            }}
                            style={{ minWidth: 0, overflow: 'hidden' }}
                          >
                            <h3 className="text-white font-medium text-sm" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                              {conv.title}
                            </h3>
                            {conv.summary ? (
                              <p className="text-white/60 text-xs mt-1" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {conv.summary}
                              </p>
                            ) : conv.last_message_preview && (
                              <p className="text-white/50 text-xs mt-1" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {conv.last_message_preview}
                              </p>
                            )}
                            {conv.keywords && conv.keywords.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-2">
                                {conv.keywords.slice(0, 3).map((kw, idx) => (
                                  <span key={idx} className="text-xs bg-white/10 text-blue-400 px-2 py-0.5 rounded-full">{kw}</span>
                                ))}
                              </div>
                            )}
                            <p className="text-white/30 text-xs mt-1.5">
                              {moment(conv.last_message_time || conv.created_date).fromNow()}
                            </p>
                            <div className="mt-2 text-xs">
                              <TokenMeter messages={messages[conv.id] || []} />
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTitle(conv.title);
                                setEditingId(conv.id);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center rounded"
                              style={{ width: '28px', height: '28px', flexShrink: 0 }}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete this conversation?')) {
                                  onDeleteConversation(conv.id);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center rounded"
                              style={{ width: '28px', height: '28px', flexShrink: 0 }}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}