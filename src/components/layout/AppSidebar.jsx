import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Wand2, Wrench, Cpu, FolderOpen, List, User, Plus, Search, X, ChevronLeft } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'chat',     label: 'Chat',     icon: MessageSquare },
  { id: 'create',   label: 'Create',   icon: Wand2 },
  { id: 'tools',    label: 'Tools',    icon: Wrench },
  { id: 'models',   label: 'Models',   icon: Cpu },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'threads',  label: 'Threads',  icon: List },
];

export default function AppSidebar({
  isOpen,
  onClose,
  activeNav = 'chat',
  onNavSelect,
  onNewThread,
  onShowThreads,
  onShowProfile,
  conversations = [],
  currentConversationId,
  onSelectConversation,
  user,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations.slice(0, 12);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />

          {/* Sidebar panel */}
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-[#0b1a30]/97 backdrop-blur-xl border-r border-white/10 flex flex-col z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div>
                <h1 className="text-white font-bold text-base leading-tight">CAOS</h1>
                <p className="text-white/40 text-[10px]">Cognitive Adaptive OS</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* New Chat button */}
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
              <button
                onClick={() => { onNewThread?.(); onClose(); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Chat
              </button>
            </div>

            {/* Primary Nav */}
            <nav className="px-2 pb-2 flex-shrink-0">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    if (id === 'threads') { onShowThreads?.(); onClose(); return; }
                    onNavSelect?.(id);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                    activeNav === id
                      ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                      : 'text-white/70 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="mx-3 border-t border-white/10" />

            {/* Search */}
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search chats…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-white/25"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3 h-3 text-white/40" />
                  </button>
                )}
              </div>
            </div>

            {/* Recent Threads */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
              <p className="text-white/30 text-[10px] font-medium uppercase tracking-wider px-2 pb-1">Recent</p>
              {filteredConversations.length === 0 ? (
                <p className="text-white/30 text-xs px-2 py-2">No threads yet</p>
              ) : (
                filteredConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => { onSelectConversation?.(conv.id); onClose(); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors mb-0.5 truncate ${
                      currentConversationId === conv.id
                        ? 'bg-blue-600/25 text-blue-200 border border-blue-500/25'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    {conv.title || 'Untitled'}
                  </button>
                ))
              )}
            </div>

            {/* Profile entry at bottom */}
            <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
              <button
                onClick={() => { onShowProfile?.(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-white text-xs font-medium truncate">{user?.full_name || 'Profile'}</p>
                  <p className="text-white/40 text-[10px] truncate">{user?.email || ''}</p>
                </div>
                <User className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}