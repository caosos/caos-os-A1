import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Trash2, Edit2, Check } from 'lucide-react';
import moment from 'moment';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export default function ThreadList({ 
  isOpen, 
  onClose, 
  conversations, 
  currentConversationId, 
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-[#0f1f3d]/95 backdrop-blur-xl border-r border-white/10 z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-white font-semibold">Previous Threads</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-white/50">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`
                        group p-3 rounded-xl mb-2 transition-all relative
                        ${currentConversationId === conv.id 
                          ? 'bg-blue-600/30 border border-blue-500/50' 
                          : 'hover:bg-white/10 border border-transparent'
                        }
                      `}
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          if (editingId !== conv.id) {
                            onSelectConversation(conv.id);
                            onClose();
                          }
                        }}
                      >
                        {editingId === conv.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="bg-white/10 border-white/20 text-white text-sm h-8 px-2"
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
                              className="p-1 rounded hover:bg-white/10"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </button>
                          </div>
                        ) : (
                          <h3 className="text-white font-medium text-sm truncate">
                            {conv.title}
                          </h3>
                        )}
                        {conv.last_message_preview && editingId !== conv.id && (
                          <p className="text-white/50 text-xs mt-1 truncate">
                            {conv.last_message_preview}
                          </p>
                        )}
                        <p className="text-white/30 text-xs mt-1.5 mb-2">
                          {moment(conv.last_message_time || conv.created_date).fromNow()}
                        </p>
                      </div>
                      
                      {/* Action buttons at bottom */}
                      {editingId !== conv.id && (
                        <div className="flex gap-1.5 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTitle(conv.title);
                              setEditingId(conv.id);
                            }}
                            className="flex-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 transition-all text-white text-[10px] flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Delete this conversation?')) {
                                onDeleteConversation(conv.id);
                              }
                            }}
                            className="flex-1 px-2 py-1 rounded bg-red-600 hover:bg-red-700 transition-all text-white text-[10px] flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
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
  );
}