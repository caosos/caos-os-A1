import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Trash2 } from 'lucide-react';
import moment from 'moment';
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ThreadList({ 
  isOpen, 
  onClose, 
  conversations, 
  currentConversationId, 
  onSelectConversation,
  onDeleteConversation 
}) {
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
                        group p-3 rounded-xl mb-2 cursor-pointer transition-all
                        ${currentConversationId === conv.id 
                          ? 'bg-blue-600/30 border border-blue-500/50' 
                          : 'hover:bg-white/10 border border-transparent'
                        }
                      `}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        onClose();
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-sm truncate">
                            {conv.title}
                          </h3>
                          {conv.last_message_preview && (
                            <p className="text-white/50 text-xs mt-1 truncate">
                              {conv.last_message_preview}
                            </p>
                          )}
                          <p className="text-white/30 text-xs mt-1.5">
                            {moment(conv.last_message_time || conv.created_date).fromNow()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
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