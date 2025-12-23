import React from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';

export default function ChatBubble({ message, isUser }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex items-end gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-500/30 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
          </div>
        )}
        
        <div
          className={`
            px-4 py-3 rounded-2xl
            ${isUser 
              ? 'bg-blue-600/80 backdrop-blur-sm text-white rounded-br-md' 
              : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-bl-md'
            }
          `}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          {message.timestamp && (
            <p className={`text-xs mt-1.5 ${isUser ? 'text-white/60' : 'text-white/40'}`}>
              {moment(message.timestamp).format('h:mm A')}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}