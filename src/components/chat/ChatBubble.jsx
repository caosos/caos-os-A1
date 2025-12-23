import React from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';

export default function ChatBubble({ message, isUser }) {
  const getYouTubeId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const renderContent = () => {
    let content = message.content;
    const youtubeMatches = content.match(/\[YOUTUBE:(.*?)\]/g);
    
    if (youtubeMatches && !isUser) {
      return (
        <div className="space-y-3">
          {youtubeMatches.map((match, index) => {
            const url = match.replace('[YOUTUBE:', '').replace(']', '');
            const videoId = getYouTubeId(url);
            content = content.replace(match, '');
            
            if (videoId) {
              return (
                <div key={index} className="rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="200"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                </div>
              );
            }
            return null;
          })}
          {content.trim() && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{content.trim()}</p>
          )}
        </div>
      );
    }
    
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>;
  };

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
          {renderContent()}
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