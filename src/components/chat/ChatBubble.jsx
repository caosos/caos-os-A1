import React, { useState } from 'react';
import { motion } from 'framer-motion';
import moment from 'moment';
import { Download, Mail, Copy, RotateCcw, Volume2, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import TextSelectionMenu from './TextSelectionMenu';
import CopyBlock from './CopyBlock';
import LinkPreview from './LinkPreview';

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Function';
  const status = toolCall?.status || 'completed';
  const results = toolCall?.results;
  
  const parsedResults = (() => {
    if (!results) return null;
    try {
      return typeof results === 'string' ? JSON.parse(results) : results;
    } catch {
      return results;
    }
  })();
  
  const isError = results && (
    (typeof results === 'string' && /error|failed/i.test(results)) ||
    (parsedResults?.success === false)
  );
  
  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
    running: { icon: Loader2, color: 'text-slate-500', text: 'Running...', spin: true },
    completed: isError ? 
      { icon: AlertCircle, color: 'text-red-500', text: 'Failed' } : 
      { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
    success: { icon: CheckCircle2, color: 'text-green-600', text: 'Success' },
    failed: { icon: AlertCircle, color: 'text-red-500', text: 'Failed' }
  }[status] || { icon: Zap, color: 'text-slate-500', text: '' };
  
  const Icon = statusConfig.icon;
  const formattedName = name.split('.').reverse().join(' ').toLowerCase();
  
  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          expanded ? "bg-white/5 border-white/30" : "bg-white/[0.02] border-white/10"
        }`}
      >
        <Icon className={`h-3 w-3 ${statusConfig.color} ${statusConfig.spin ? 'animate-spin' : ''}`} />
        <span className="text-white/70">{formattedName}</span>
        {statusConfig.text && (
          <span className={`text-white/50 ${isError ? 'text-red-400' : ''}`}>
            • {statusConfig.text}
          </span>
        )}
        {!statusConfig.spin && (toolCall.arguments_string || results) && (
          <ChevronRight className={`h-3 w-3 text-white/40 transition-transform ml-auto ${
            expanded ? 'rotate-90' : ''
          }`} />
        )}
      </button>
      
      {expanded && !statusConfig.spin && (
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-white/20 space-y-2">
          {toolCall.arguments_string && (
            <div>
              <div className="text-xs text-white/50 mb-1">Parameters:</div>
              <pre className="bg-white/5 rounded-md p-2 text-xs text-white/70 whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                  } catch {
                    return toolCall.arguments_string;
                  }
                })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-xs text-white/50 mb-1">Result:</div>
              <pre className="bg-white/5 rounded-md p-2 text-xs text-white/70 whitespace-pre-wrap max-h-48 overflow-auto">
                {typeof parsedResults === 'object' ? 
                  JSON.stringify(parsedResults, null, 2) : parsedResults}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ChatBubble({ message, isUser, onUpdateMessage, closeMenuTrigger }) {
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const justSelectedRef = React.useRef(false);
  const utteranceRef = React.useRef(null);

  React.useEffect(() => {
    if (closeMenuTrigger > 0) {
      setShowSelectionMenu(false);
    }
  }, [closeMenuTrigger]);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      // Ignore if we just made a selection
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }

      if (showSelectionMenu) {
        // Don't close if clicking within the menu or message bubble
        const menu = document.querySelector('[data-selection-menu]');
        const bubble = e.target.closest('[data-message-bubble]');
        
        if (!menu?.contains(e.target) && !bubble) {
          setShowSelectionMenu(false);
          window.getSelection().removeAllRanges();
        }
      }
    };

    if (showSelectionMenu) {
      // Add delay to prevent immediate closure from the selection event
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
      }, 200);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showSelectionMenu]);

  const handleTextSelection = (e) => {
    // Only show menu on right-click, not on normal selection
    if (e.type === 'contextmenu') {
      e.preventDefault();
      e.stopPropagation();
      
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 0) {
        justSelectedRef.current = true;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setSelectedText(text);
        
        // Position menu - check space and avoid input bar at bottom
        const spaceBelow = window.innerHeight - rect.bottom - 100;
        const menuHeight = 200;
        
        setMenuPosition({
          top: spaceBelow < menuHeight 
            ? Math.max(20, rect.top + window.scrollY - menuHeight - 8)
            : rect.bottom + window.scrollY + 8,
          left: Math.min(rect.left + window.scrollX, window.innerWidth - 300),
        });
        setShowSelectionMenu(true);
        
        // Reset the flag after a bit
        setTimeout(() => {
          justSelectedRef.current = false;
        }, 300);
      }
    }
  };

  const handleReact = async (text, emoji) => {
    const reactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
    reactions.push({ emoji, selected_text: text });
    
    // Get AI acknowledgment from CAOS backend
    try {
      const response = await fetch("http://172.234.25.199:3001/api/message", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          message: `[USER REACTED WITH ${emoji} TO: "${text}"]`,
          session: message.conversation_id,
          context_type: "inline_reaction"
        })
      });

      const data = await response.json();
      const aiResponse = data.reply || data.content || data.message || `Acknowledged ${emoji}`;

      const replies = Array.isArray(message.replies) ? [...message.replies] : [];
      replies.push({ 
        selected_text: text, 
        user_reply: `Reacted with ${emoji}`,
        ai_response: aiResponse,
        timestamp: new Date().toISOString()
      });
      
      onUpdateMessage(message.id, { reactions, replies });
    } catch (error) {
      console.error('Error getting reaction response:', error);
      toast.error('Failed to get response');
    }
  };

  const handleReply = async (text, replyContent) => {
    try {
      // Get AI response from CAOS backend
      const response = await fetch("http://172.234.25.199:3001/api/message", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({
          message: `[USER REPLIED TO: "${text}"]\n\nUser's reply: ${replyContent}`,
          session: message.conversation_id,
          context_type: "inline_reply"
        })
      });

      const data = await response.json();
      const aiResponse = data.reply || data.content || data.message || 'Response received';

      const replies = Array.isArray(message.replies) ? [...message.replies] : [];
      replies.push({ 
        selected_text: text, 
        user_reply: replyContent,
        ai_response: aiResponse,
        timestamp: new Date().toISOString()
      });
      onUpdateMessage(message.id, { replies });
    } catch (error) {
      console.error('Error getting reply response:', error);
      toast.error('Failed to get response');
    }
  };
  const getYouTubeId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const extractUrls = (text) => {
    const urlRegex = /https?:\/\/[^\s)]+/g;
    return text.match(urlRegex) || [];
  };

  const getYouTubeId = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const getVimeoId = (url) => {
    const regExp = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regExp);
    return match ? match[3] : null;
  };

  const isVideoUrl = (url) => {
    return getYouTubeId(url) || getVimeoId(url);
  };

  const formatDateTime = (timestamp) => {
    return moment(timestamp).format('MMM D, YYYY • h:mm A');
  };

  const downloadFile = (content, filename) => {
    const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'text/plain';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const isEmailableContent = (content) => {
    if (!content) return false;
    const lower = content.toLowerCase();
    return (
      content.includes('- [ ]') || 
      content.includes('- [x]') ||
      lower.includes('checklist') ||
      lower.includes('memo:') ||
      lower.includes('subject:') ||
      (content.split('\n').length > 3 && content.includes('-'))
    );
  };

  const handleEmailContent = () => {
    const subject = encodeURIComponent('From CAOS');
    const body = encodeURIComponent(message.content);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success('Opening email client...');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Copied to clipboard');
  };

  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported');
      return;
    }

    if (isSpeaking) {
      // Stop speaking
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      utteranceRef.current = null;
      return;
    }

    // Start speaking
    window.speechSynthesis.cancel(); // Cancel any other speech
    
    // Clean markdown for natural speech
    const cleanText = message.content
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/^[-*+]\s/gm, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/>/g, '')
      .replace(/\|/g, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Apply saved voice preference
    const savedVoiceURI = localStorage.getItem('caos_voice_preference');
    const voices = window.speechSynthesis.getVoices();
    if (savedVoiceURI) {
      const voice = voices.find(v => v.voiceURI === savedVoiceURI);
      if (voice) utterance.voice = voice;
    }
    
    // Apply saved speed
    const savedRate = localStorage.getItem('caos_speech_rate');
    utterance.rate = savedRate ? parseFloat(savedRate) : 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleRegenerate = () => {
    // Trigger regeneration through parent component
    toast.info('Regenerate feature coming soon');
  };

  const extractFilename = (langString) => {
    if (langString && langString.startsWith('filename:')) {
      return langString.replace('filename:', '');
    }
    return null;
  };

  const renderContent = () => {
    let content = message.content;

    // Strip out WROTE: patterns but keep the rest of the content
    if (content && content.includes('WROTE:')) {
      content = content.replace(/WROTE:[a-f0-9-]+/g, '').trim();
    }

    // Extract standalone URLs before other processing
    const urls = extractUrls(content);
    const videoUrls = urls.filter(isVideoUrl);
    const otherUrls = urls.filter(url => !isVideoUrl(url));
    const cleanContent = urls.reduce((text, url) => text.replace(url, ''), content).trim();

    const youtubeMatches = content.match(/\[YOUTUBE:(.*?)\]/g);
    
    // Check for copy blocks: ```copy or ```copyblock
    const copyBlockRegex = /```(?:copy|copyblock)(?:\s+title:([^\n]+))?\n([\s\S]*?)```/g;
    const copyBlocks = [];
    let copyMatch;
    
    while ((copyMatch = copyBlockRegex.exec(message.content)) !== null) {
      const title = copyMatch[1]?.trim();
      const blockContent = copyMatch[2];
      copyBlocks.push({ title, content: blockContent });
      // Remove from main content
      content = content.replace(copyMatch[0], '');
    }
    
    // Check for file content in code blocks
    const codeBlockRegex = /```(filename:[^\n]+)\n([\s\S]*?)```/g;
    const fileBlocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const filename = extractFilename(match[1]);
      const fileContent = match[2];
      if (filename) {
        fileBlocks.push({ filename, content: fileContent });
      }
    }
    
    // Get attached files
    const attachedFiles = message.file_urls || [];
    
    if (youtubeMatches && !isUser) {
      return (
        <div className="space-y-3">
          {youtubeMatches.map((match, index) => {
            const url = match.replace('[YOUTUBE:', '').replace(']', '');
            const videoId = getYouTubeId(url);
            content = content.replace(match, '');
            
            if (videoId) {
              return (
                <div key={index} className="w-full mx-auto rounded-lg overflow-hidden" style={{ maxWidth: '600px' }}>
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                    <iframe
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      src={`https://www.youtube.com/embed/${videoId}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-lg"
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
          {content.trim() && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content.trim()}</p>
          )}
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {/* Embedded Videos */}
        {videoUrls.length > 0 && (
          <div className="space-y-2">
            {videoUrls.map((url, idx) => {
              const youtubeId = getYouTubeId(url);
              const vimeoId = getVimeoId(url);

              if (youtubeId) {
                return (
                  <div key={idx} className="w-full rounded-lg overflow-hidden">
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        src={`https://www.youtube.com/embed/${youtubeId}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                );
              }

              if (vimeoId) {
                return (
                  <div key={idx} className="w-full rounded-lg overflow-hidden">
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        src={`https://player.vimeo.com/video/${vimeoId}`}
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* Link Previews (non-video) */}
        {otherUrls.length > 0 && (
          <div className="space-y-2">
            {otherUrls.map((url, idx) => (
              <LinkPreview key={idx} url={url} />
            ))}
          </div>
        )}

        {/* Recall Results */}
        {message.recall_results && message.recall_results.length > 0 && (
          <div className="space-y-2 mb-3">
            <div className="text-xs text-blue-400 font-medium flex items-center gap-2">
              <span>🧠</span> Recalled Memories ({message.recall_results.length})
            </div>
            {message.recall_results.map((recall, idx) => {
              const preview = recall.payload?.content || recall.payload?.text || '';
              const previewText = preview.length > 80 ? preview.slice(0, 80) + '...' : preview;
              const timestamp = recall.ts_ms ? new Date(recall.ts_ms).toLocaleString() : '';
              
              return (
                <div key={idx} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-400 font-mono">session:{recall.session_id || 'default'}</span>
                    {timestamp && (
                      <>
                        <span className="text-white/30">•</span>
                        <span className="text-white/50">{timestamp}</span>
                      </>
                    )}
                  </div>
                  {previewText && (
                    <p className="text-sm text-white/90 leading-relaxed">{previewText}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {cleanContent && cleanContent.trim() && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{cleanContent.trim()}</p>}
        
        {/* Copy Blocks */}
        {copyBlocks.map((block, index) => (
          <CopyBlock
            key={index}
            content={block.content}
            title={block.title}
          />
        ))}
        
        {/* Display attached files */}
        {attachedFiles.length > 0 && (
          <div className="space-y-2">
            {attachedFiles.map((fileUrl, index) => {
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
              const fileName = fileUrl.split('/').pop();
              
              return isImage ? (
                <div key={index} className="rounded-lg overflow-hidden border border-white/20">
                  <img src={fileUrl} alt="Attached" className="max-w-full h-auto" />
                </div>
              ) : (
                <a
                  key={index}
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white/80 flex-1">{fileName}</span>
                </a>
              );
            })}
          </div>
        )}
        
        {/* Display generated files */}
        {message.generated_files && message.generated_files.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="text-xs text-green-400 font-medium flex items-center gap-2">
              <span>📁</span> Generated Files
            </div>
            {message.generated_files.map((file, index) => {
              const isImage = file.type === 'image' || /image/.test(file.type);

              return isImage && file.url ? (
                <div key={index} className="rounded-lg overflow-hidden border border-green-400/30">
                  <img src={file.url} alt={file.name} className="max-w-full h-auto" />
                </div>
              ) : (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (file.url) {
                      const a = document.createElement('a');
                      a.href = file.url;
                      a.download = file.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      toast.success(`Downloaded ${file.name}`);
                    } else if (file.content) {
                      downloadFile(file.content, file.name);
                    }
                  }}
                  className="w-full flex items-center gap-2 bg-green-500/10 border border-green-400/30 rounded-lg px-3 py-2 hover:bg-green-500/20 transition-colors text-left cursor-pointer"
                >
                  <Download className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-white/90 flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-green-400 whitespace-nowrap">Download</span>
                </button>
              );
            })}
          </div>
        )}
        
        {fileBlocks.map((file, index) => (
          <div key={index} className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg px-3 py-2">
            <span className="text-sm text-white/80 flex-1">{file.filename}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => downloadFile(file.content, file.filename)}
              className="h-8 px-3 text-blue-400 hover:text-blue-300 hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 w-full max-w-4xl mx-auto px-4`}
      >
        <div className={`flex items-end gap-2 w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-500/30 backdrop-blur-sm border border-white/20 flex items-center justify-center flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
          </div>
        )}
        
        <div
            data-message-bubble
            className={`
              relative group
              px-4 py-3 rounded-2xl select-text break-words overflow-wrap-anywhere
              ${isUser 
                ? 'bg-blue-600/80 backdrop-blur-sm text-white rounded-br-md' 
                : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-bl-md'
              }
            `}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            onContextMenu={handleTextSelection}
          >

          {!isUser && (
            <p className="text-xs font-medium text-blue-300 mb-2">CAOS</p>
          )}
          {renderContent()}
          {(message.timestamp || (!isUser && message.response_time_ms)) && (
            <div className={`flex items-center justify-between mt-1.5 ${isUser ? '' : 'gap-3'}`}>
              <div className="flex items-center gap-2">
                {message.timestamp && (
                  <p className={`text-xs ${isUser ? 'text-white/60' : 'text-white/40'}`}>
                    {formatDateTime(message.timestamp)}
                  </p>
                )}
                {!isUser && message.response_time_ms && (
                  <span className="text-xs text-green-400/70 flex items-center gap-1">
                    {message.timestamp && <span>•</span>}
                    ⏱️ {(message.response_time_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {!isUser && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Regenerate"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
                  </button>
                  <button
                    onClick={handleReadAloud}
                    className={`p-1 hover:bg-white/10 rounded transition-colors ${isSpeaking ? 'bg-blue-500/20' : ''}`}
                    title={isSpeaking ? "Stop reading" : "Read aloud"}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-blue-400' : 'text-white/60 hover:text-white/90'}`} />
                  </button>
                  <button
                    onClick={handleEmailContent}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Email this"
                  >
                    <Mail className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
                    </button>
                    </div>
                    )}
                    </div>
                    )}

                    {/* Tool Calls */}
                    {message.tool_calls?.length > 0 && (
                    <div className="space-y-1 mt-2">
                    {message.tool_calls.map((toolCall, idx) => (
                    <FunctionDisplay key={idx} toolCall={toolCall} />
                    ))}
                    </div>
                    )}

                    {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 border border-white/20 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                  title={reaction.selected_text}
                >
                  <span>{reaction.emoji}</span>
                </div>
              ))}
              </div>
              )}

              {/* Replies */}
              {message.replies && message.replies.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.replies.map((reply, idx) => (
                    <div
                      key={idx}
                      className="bg-white/5 border-l-2 border-blue-400 rounded px-2 py-1.5 text-xs space-y-1.5"
                    >
                      <p className="text-white/50 italic text-[11px]">"{reply.selected_text}"</p>
                      <div className="bg-blue-600/20 rounded px-2 py-1">
                        <p className="text-white/90">{reply.user_reply}</p>
                      </div>
                      {reply.ai_response && (
                        <div className="bg-white/10 rounded px-2 py-1">
                          <p className="text-blue-300 font-medium text-[10px] mb-0.5">CAOS</p>
                          <p className="text-white/90">{reply.ai_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </div>
              </div>
              </motion.div>

              {showSelectionMenu && (
                <div data-selection-menu onClick={(e) => e.stopPropagation()}>
                <TextSelectionMenu
              position={menuPosition}
              selectedText={selectedText}
              onReact={handleReact}
              onReply={handleReply}
              onClose={() => {
              setShowSelectionMenu(false);
              window.getSelection().removeAllRanges();
              }}
              />
              </div>
              )}
              </>
              );
              }