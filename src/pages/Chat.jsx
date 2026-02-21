import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import StarfieldBackground from '@/components/chat/StarfieldBackground';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatInput from '@/components/chat/ChatInput';
import ThreadList from '@/components/chat/ThreadList';
import WelcomeGreeting from '@/components/chat/WelcomeGreeting';
import ProfilePanel from '@/components/chat/ProfilePanel';
import ContinuityToken from '@/components/chat/ContinuityToken';
import ConversationSearch from '@/components/chat/ConversationSearch';
import QuickActionBar from '@/components/chat/QuickActionBar';
import CodeTerminal from '@/components/terminal/CodeTerminal';
import GameView from '@/components/game/GameView';
import TokenMeter from '@/components/chat/TokenMeter';
import LaneSelector from '@/components/chat/LaneSelector';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({});
  const [showThreads, setShowThreads] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [fileView, setFileView] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [closeMenuTrigger, setCloseMenuTrigger] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [multiAgentMode, setMultiAgentMode] = useState(localStorage.getItem('caos_multi_agent_mode') === 'true');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [availableTokens, setAvailableTokens] = useState(0);
  const [currentLane, setCurrentLane] = useState(() => localStorage.getItem('caos_current_lane') || 'general');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const messageRefs = useRef({});
  const navigate = useNavigate();
  const [messageInputValue, setMessageInputValue] = useState('');

  // Helper to set message in input
  const setMessage = (text) => {
    setMessageInputValue(text);
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder="Type a message..."]');
      if (textarea) {
        textarea.focus();
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 168) + 'px';
      }
    }, 0);
  };
  
  const isDeveloperMode = localStorage.getItem('caos_developer_mode') === 'true';
  const isGameMode = localStorage.getItem('caos_game_mode') === 'true';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    // Fix mobile viewport scaling
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    
    const handleShowToken = () => setShowToken(true);
    window.addEventListener('show-continuity-token', handleShowToken);
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('show-continuity-token', handleShowToken);
    };
  }, []);

  // Load user and their data
  useEffect(() => {
    let mounted = true;
    
    const loadUserData = async () => {
      try {
        // Check if guest mode
        const guestUser = localStorage.getItem('caos_guest_user');
        if (guestUser) {
          if (!mounted) return;
          const currentUser = JSON.parse(guestUser);
          setUser(currentUser);

          // Load guest conversations from localStorage
          const guestConvos = JSON.parse(localStorage.getItem('caos_guest_conversations') || '[]');
          setConversations(guestConvos);

          const guestMessages = JSON.parse(localStorage.getItem('caos_guest_messages') || '{}');
          setMessages(guestMessages);

          setDataLoaded(true);
          return;
        }

        // For authenticated users - check if logged in
        const currentUser = await base44.auth.me();
        if (!mounted) return;
        
        setUser(currentUser);

        // Load conversations for this user
        const userConvos = await base44.entities.Conversation.filter(
          { created_by: currentUser.email },
          '-last_message_time',
          100
        );
        if (!mounted) return;
        setConversations(userConvos);

        // Load messages for all conversations
        const messagesMap = {};
        for (const conv of userConvos) {
          const convMessages = await base44.entities.Message.filter(
            { conversation_id: conv.id },
            'timestamp',
            1000
          );
          messagesMap[conv.id] = convMessages;
        }
        if (!mounted) return;
        setMessages(messagesMap);

        // Load game tokens
        if (currentUser?.email) {
          const tokens = await base44.entities.GameToken.filter({
            user_email: currentUser.email,
            approved: true,
            spent: false
          });
          const total = tokens.reduce((sum, token) => sum + (token.tokens_earned || 0), 0);
          if (!mounted) return;
          setAvailableTokens(total);
        }

        setDataLoaded(true);
      } catch (error) {
        console.error('Error loading user data:', error);
        if (!mounted) return;
        
        // Not authenticated - become guest instead of redirecting
        const guestUser = {
          full_name: 'Guest User',
          email: `guest_${Date.now()}@caos.local`,
          isGuest: true
        };
        localStorage.setItem('caos_guest_user', JSON.stringify(guestUser));
        localStorage.removeItem('base44_access_token');
        setUser(guestUser);
        setDataLoaded(true);
      }
    };

    loadUserData();
    
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const isGuestMode = !!localStorage.getItem('caos_guest_user');
  const currentMessages = currentConversationId ? (messages[currentConversationId] || []) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  // Track scroll position to show/hide scroll button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && currentMessages.length > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentMessages.length]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollByAmount = (amount) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollBy({ top: amount, behavior: 'smooth' });
    }
  };

  const handleJumpToMessage = (messageId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      // Scroll with smooth behavior
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight with flash effect
      element.style.transition = 'background-color 0.3s ease';
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';

      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 2000);
    } else {
      console.log('Message element not found:', messageId);
    }
  };

  const handleNewThread = async () => {
    if (!user) return;

    try {
      if (isGuestMode) {
        // Guest mode: create conversation locally
        const newConversation = {
          id: 'guest_' + Date.now(),
          title: 'New Conversation',
          last_message_time: new Date().toISOString(),
          created_by: user.email
        };
        const updatedConvos = [newConversation, ...conversations];
        setConversations(updatedConvos);
        localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
        setCurrentConversationId(newConversation.id);
        setMessages({ ...messages, [newConversation.id]: [] });
      } else {
        // Authenticated: save to database
        const newConversation = await base44.entities.Conversation.create({
          title: 'New Conversation',
          last_message_time: new Date().toISOString(),
          created_by: user.email
        });
        setConversations([newConversation, ...conversations]);
        setCurrentConversationId(newConversation.id);
        localStorage.setItem('caos_last_conversation', newConversation.id);
        setMessages({ ...messages, [newConversation.id]: [] });
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new thread');
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      if (isGuestMode) {
        // Guest mode: delete locally
        const updatedConvos = conversations.filter(c => c.id !== id);
        setConversations(updatedConvos);
        localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
        
        const newMessages = { ...messages };
        delete newMessages[id];
        setMessages(newMessages);
        localStorage.setItem('caos_guest_messages', JSON.stringify(newMessages));
        
        if (currentConversationId === id) {
          setCurrentConversationId(null);
        }
      } else {
        // Authenticated: delete from database
        await base44.entities.Conversation.delete(id);
        const convMessages = messages[id] || [];
        for (const msg of convMessages) {
          await base44.entities.Message.delete(msg.id);
        }
        setConversations(conversations.filter(c => c.id !== id));
        const newMessages = { ...messages };
        delete newMessages[id];
        setMessages(newMessages);
        if (currentConversationId === id) {
          setCurrentConversationId(null);
          localStorage.removeItem('caos_last_conversation');
        }
      }
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete thread');
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    const updatedConvos = conversations.map(c => 
      c.id === id ? { ...c, title: newTitle } : c
    );
    setConversations(updatedConvos);

    try {
      if (isGuestMode) {
        localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
      } else {
        await base44.entities.Conversation.update(id, { title: newTitle });
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename thread');
    }
  };



  const handleUpdateMessage = async (messageId, updates) => {
    if (!currentConversationId) return;
    
    const convMessages = messages[currentConversationId] || [];
    const updatedMessages = convMessages.map(msg =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    );
    const newMessages = { ...messages, [currentConversationId]: updatedMessages };
    setMessages(newMessages);

    try {
      if (isGuestMode) {
        localStorage.setItem('caos_guest_messages', JSON.stringify(newMessages));
      } else {
        await base44.entities.Message.update(messageId, updates);
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleSessionResume = async (sessionId) => {
    try {
      const conversation = conversations.find(c => c.id === sessionId);
      const conversationMessages = messages[sessionId] || [];
      
      // Format message history for backend
      const messageHistory = conversationMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        file_urls: msg.file_urls || []
      }));

      const { data } = await base44.functions.invoke('caosMessage', {
        input: "__SESSION_RESUME__",
        session_id: sessionId,
        limit: 20
      });

      // Verify session alignment per CAOS-A1 contract
      if (data.session && data.session !== sessionId) {
        console.error('SESSION DESYNC on resume:', { expected: sessionId, received: data.session });
        toast.error('Session mismatch detected during resume.');
      }
    } catch (error) {
      console.error('Session resume handshake failed:', error);
    }
  };

  const handleSendMessage = async (content, fileUrls = [], selectedAgents = null) => {
    if (!user || !content?.trim() && fileUrls?.length === 0) return;
    
    setIsLoading(true);
    const startTime = Date.now();
    let conversationId = null;
    let errorLogId = null;
    
    // Store message in localStorage as backup before sending
    const backupMessage = {
      content,
      fileUrls,
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId
    };
    localStorage.setItem('caos_last_message_backup', JSON.stringify(backupMessage));
    
    // Timeout handler - extended for large messages
    const timeoutId = setTimeout(async () => {
      setIsLoading(false);
      
      // Log timeout error
      try {
        if (!isGuestMode) {
          const errorLog = await base44.entities.ErrorLog.create({
            user_email: user.email,
            conversation_id: currentConversationId || 'none',
            error_type: 'timeout',
            error_message: 'Message send timed out after 5 minutes',
            lost_message_content: content,
            lost_message_files: fileUrls,
            request_payload: { content, fileUrls, selectedAgents }
          });
          errorLogId = errorLog.id;
        }
      } catch (logError) {
        console.error('Failed to log timeout error:', logError);
      }
      
      toast.error('Request timed out. Message saved in error log.', {
        action: {
          label: 'Retry',
          onClick: () => handleSendMessage(content, fileUrls, selectedAgents)
        },
        duration: 10000
      });
    }, 300000); // 300 second (5 min) timeout for large messages

    try {
      conversationId = currentConversationId;
      
      if (!conversationId) {
        const title = content ? content.substring(0, 50) : 'File attachment';
        
        if (isGuestMode) {
          conversationId = 'guest_' + Date.now();
          const newConvo = {
            id: conversationId,
            title,
            last_message_time: new Date().toISOString(),
            created_by: user.email
          };
          
          setConversations(prev => [newConvo, ...prev]);
          setCurrentConversationId(conversationId);
          setMessages(prev => ({ ...prev, [conversationId]: [] }));
          
          const updatedConvos = [newConvo, ...conversations];
          localStorage.setItem('caos_guest_conversations', JSON.stringify(updatedConvos));
        } else {
          const newConvo = await base44.entities.Conversation.create({
            title,
            last_message_time: new Date().toISOString()
          });
          conversationId = newConvo.id;
          
          setConversations(prev => [newConvo, ...prev]);
          setCurrentConversationId(conversationId);
          setMessages(prev => ({ ...prev, [conversationId]: [] }));
          localStorage.setItem('caos_last_conversation', conversationId);
        }
      }

      let fileContents = '';
      const fileSummary = { text: 0, image: 0, document: 0, other: 0 };
      
      if (fileUrls?.length > 0) {
        for (let i = 0; i < fileUrls.length; i++) {
          const fileUrl = fileUrls[i];
          try {
            const fileName = fileUrl.split('/').pop();
            const extension = fileName.split('.').pop()?.toLowerCase();

            const textExtensions = ['txt', 'md', 'json', 'csv', 'log', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'html', 'css', 'xml', 'yaml', 'yml'];
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
            const documentExtensions = ['pdf', 'doc', 'docx'];

            if (textExtensions.includes(extension)) {
              const response = await fetch(fileUrl);
              const fileContent = await response.text();
              fileContents += `\n\n=== TEXT FILE: ${fileName} ===\n${fileContent}\n=== END TEXT FILE ===\n`;
              fileSummary.text++;
            } else if (imageExtensions.includes(extension)) {
              fileContents += `\n\n[IMAGE ${i + 1}: "${fileName}" - USE VISION TO ANALYZE AND DESCRIBE IN DETAIL]\n`;
              fileSummary.image++;
            } else if (documentExtensions.includes(extension)) {
              fileContents += `\n\n[DOCUMENT ${i + 1}: "${fileName}" - EXTRACT TEXT, SUMMARIZE KEY POINTS]\n`;
              fileSummary.document++;
            } else {
              fileContents += `\n\n[BINARY FILE ${i + 1}: "${fileName}" (${extension}) - PROVIDE METADATA]\n`;
              fileSummary.other++;
            }
          } catch (error) {
            console.error('Error reading file:', error);
            fileContents += `\n\n[ERROR: Could not read "${fileUrl.split('/').pop()}"]\n`;
          }
        }

        if (fileUrls.length > 1) {
          const fileTypesList = [];
          if (fileSummary.text > 0) fileTypesList.push(`${fileSummary.text} text file${fileSummary.text > 1 ? 's' : ''}`);
          if (fileSummary.image > 0) fileTypesList.push(`${fileSummary.image} image${fileSummary.image > 1 ? 's' : ''}`);
          if (fileSummary.document > 0) fileTypesList.push(`${fileSummary.document} document${fileSummary.document > 1 ? 's' : ''}`);
          if (fileSummary.other > 0) fileTypesList.push(`${fileSummary.other} other file${fileSummary.other > 1 ? 's' : ''}`);

          fileContents = `\n\n[MULTI-FILE REQUEST: ${fileUrls.length} files provided - ${fileTypesList.join(', ')}]\n[INSTRUCTION: Analyze each file according to its type, then synthesize findings into a cohesive response]\n` + fileContents;
        }
      }

      const messageText = content || '📎 File(s)';
      const fullMessage = content ? `${content}${fileContents}` : fileContents || 'User sent file(s)';
      
      const tempId = 'temp_' + Date.now();
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), {
          id: tempId,
          conversation_id: conversationId,
          role: 'user',
          content: messageText,
          file_urls: fileUrls,
          timestamp: new Date().toISOString()
        }]
      }));

      const contextSeed = localStorage.getItem(`caos_seed_${conversationId}`);
      const currentLane = localStorage.getItem(`caos_current_lane`) || 'general';
      
      console.log('Sending message to backend...', { conversationId, messageLength: fullMessage.length });
      
      const response = await base44.functions.invoke('hybridMessage', {
        session_id: conversationId,
        input: fullMessage,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        rotation_seed: contextSeed,
        current_lane: currentLane
      });

      console.log('Backend response received:', { status: response?.status, hasData: !!response?.data });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Check for errors in response
      if (!response || response.status !== 200) {
        console.error('Backend error response:', response);
        throw new Error(response?.data?.error || 'Backend returned error status');
      }

      const { data } = response;
      if (!data) {
        console.error('No data in response:', response);
        throw new Error('No response data from server');
      }
      
      const reply = data.reply || data.response || data.text || '';
      if (!reply) {
        console.error('Empty reply from backend:', data);
        throw new Error('Empty response from server');
      }

      console.log('Message processed successfully, reply length:', reply.length);
      
      // Handle auto-rotation if needed
      if (data.rotation_needed && data.context_seed) {
        toast.info(`Approaching token limit (${Math.round(data.current_tokens / 1000)}K). Starting fresh thread with context carryover...`);
        
        // Create new conversation with seed
        const newTitle = `${conversations.find(c => c.id === conversationId)?.title || 'Conversation'} (continued)`;
        
        if (isGuestMode) {
          const newConvoId = 'guest_' + Date.now();
          const newConvo = {
            id: newConvoId,
            title: newTitle,
            last_message_time: new Date().toISOString(),
            created_by: user.email
          };
          
          setConversations(prev => [newConvo, ...prev]);
          setCurrentConversationId(newConvoId);
          setMessages(prev => ({ ...prev, [newConvoId]: [] }));
          
          localStorage.setItem(`caos_seed_${newConvoId}`, data.context_seed);
          localStorage.setItem('caos_guest_conversations', JSON.stringify([newConvo, ...conversations]));
        } else {
          const newConvo = await base44.entities.Conversation.create({
            title: newTitle,
            last_message_time: new Date().toISOString()
          });
          
          setConversations(prev => [newConvo, ...prev]);
          setCurrentConversationId(newConvo.id);
          setMessages(prev => ({ ...prev, [newConvo.id]: [] }));
          localStorage.setItem(`caos_seed_${newConvo.id}`, data.context_seed);
          localStorage.setItem('caos_last_conversation', newConvo.id);
        }
        
        return; // Don't save messages to old thread
      }

      if (isGuestMode) {
        const userMsg = {
          id: 'msg_' + Date.now(),
          conversation_id: conversationId,
          role: 'user',
          content: messageText,
          file_urls: fileUrls,
          timestamp: new Date().toISOString()
        };
        const aiMsg = {
          id: 'msg_' + Date.now() + '_ai',
          conversation_id: conversationId,
          role: 'assistant',
          content: reply,
          generated_files: data.generatedFiles || [],
          tool_calls: data.tool_calls || [],
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => {
          const updated = {
            ...prev,
            [conversationId]: [...(prev[conversationId] || []).filter(m => m.id !== tempId), userMsg, aiMsg]
          };
          localStorage.setItem('caos_guest_messages', JSON.stringify(updated));
          return updated;
        });
      } else {
        const tempConvoId = conversationId; // Capture for closure
        const userMsg = await base44.entities.Message.create({
          conversation_id: conversationId,
          role: 'user',
          content: messageText,
          file_urls: fileUrls,
          timestamp: new Date().toISOString()
        });
        const aiMsg = await base44.entities.Message.create({
          conversation_id: conversationId,
          role: 'assistant',
          content: reply,
          token_count: data.usage_tokens || 0,
          generated_files: data.generatedFiles || [],
          tool_calls: data.tool_calls || [],
          response_time_ms: responseTime,
          timestamp: new Date().toISOString()
        });

        setMessages(prev => ({
          ...prev,
          [tempConvoId]: [...(prev[tempConvoId] || []).filter(m => m.id !== tempId), userMsg, aiMsg]
        }));
      }

      setConversations(prev => {
        const updated = [
          { ...prev.find(c => c.id === conversationId), last_message_preview: reply.substring(0, 100), last_message_time: new Date().toISOString() },
          ...prev.filter(c => c.id !== conversationId)
        ];
        if (isGuestMode) localStorage.setItem('caos_guest_conversations', JSON.stringify(updated));
        return updated;
      });

      if (!isGuestMode) {
        await base44.entities.Conversation.update(conversationId, {
          last_message_preview: reply.substring(0, 100),
          last_message_time: new Date().toISOString()
        });
      }

      // Clear backup on success
      localStorage.removeItem('caos_last_message_backup');
      console.log('Message saved successfully');
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Send error:', error);
      console.error('Full error details:', { 
        message: error.message, 
        stack: error.stack,
        conversationId,
        contentLength: content?.length,
        fileCount: fileUrls?.length
      });
      
      // Log error to database
      try {
        if (!isGuestMode) {
          const errorType = error.message?.includes('timeout') ? 'timeout' :
                           error.message?.includes('network') ? 'network_error' :
                           error.message?.includes('500') ? 'server_error' : 'unknown';
          
          const errorLog = await base44.entities.ErrorLog.create({
            user_email: user.email,
            conversation_id: conversationId || currentConversationId || 'none',
            error_type: errorType,
            error_message: error.message || 'Unknown error',
            stack_trace: error.stack || '',
            lost_message_content: content,
            lost_message_files: fileUrls,
            request_payload: { content, fileUrls, selectedAgents, timestamp: new Date().toISOString() }
          });
          errorLogId = errorLog.id;
          
          console.log('Error logged with ID:', errorLogId);
        }
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
      
      // Show detailed error to user
      const errorMessage = error.message || 'Failed to send message';
      toast.error(`Message failed: ${errorMessage}. Your message was saved.`, {
        action: {
          label: 'Retry',
          onClick: async () => {
            console.log('Retrying message send...');
            // Update retry count in error log
            if (errorLogId && !isGuestMode) {
              try {
                const log = await base44.entities.ErrorLog.get(errorLogId);
                await base44.entities.ErrorLog.update(errorLogId, {
                  retry_count: (log.retry_count || 0) + 1
                });
              } catch (e) {
                console.error('Failed to update retry count:', e);
              }
            }
            handleSendMessage(content, fileUrls, selectedAgents);
          }
        },
        duration: 10000
      });

      // KEEP the temp message visible so user sees what happened
      // Mark it as failed instead of removing it
      const finalConvoId = conversationId || currentConversationId;
      if (finalConvoId) {
        setMessages(prev => {
          const convoMessages = prev[finalConvoId] || [];
          const updatedMessages = convoMessages.map(m => 
            m.id && m.id.startsWith('temp_') ? { ...m, failed: true, error: errorMessage } : m
          );
          return {
            ...prev,
            [finalConvoId]: updatedMessages
          };
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!dataLoaded) {
    return (
      <div className="fixed inset-0 bg-[#0a1628] flex items-center justify-center">
        <StarfieldBackground />
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }



  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col" style={{ height: '100vh', height: '100dvh' }}>
      <div className="fixed inset-0 z-0">
        <StarfieldBackground />
      </div>

      <div className="relative z-30 bg-[#0a1628] flex-shrink-0">
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <ChatHeader 
                user={user}
                onNewThread={handleNewThread}
                onShowThreads={() => setShowThreads(true)}
                onShowProfile={() => setShowProfile(true)}
                onShowFiles={(view) => {
                  setFileView(view);
                  setShowProfile(true);
                }}
                currentConversation={conversations.find(c => c.id === currentConversationId)}
                sessionFilesCount={generatedFiles.length}
              />
              {currentConversationId && currentMessages.length > 0 && (
                <ConversationSearch
                  messages={currentMessages}
                  onJumpToMessage={handleJumpToMessage}
                />
              )}
            </div>
            {currentConversationId && currentMessages.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-40">
                  <TokenMeter messages={currentMessages} />
                </div>
              </div>
            )}
          </div>

        </div>

      <div className={`relative flex-1 z-20 overflow-hidden ${(isDeveloperMode || isGameMode) ? 'flex' : 'flex flex-col'}`} style={{ minHeight: 0 }}>
        {(isDeveloperMode || isGameMode) ? (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Chat Section */}
            <ResizablePanel defaultSize={50} minSize={30} className="relative flex flex-col" style={{ minHeight: 0 }}>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-60">
            <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4">
              {currentMessages.length === 0 && !isLoading && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <WelcomeGreeting />
                </div>
              )}

              {currentMessages.map((message) => (
                <div
                  key={message.id}
                  ref={(el) => messageRefs.current[message.id] = el}
                  style={{ transition: 'background-color 0.3s' }}
                >
                  <ChatBubble 
                    message={message} 
                    isUser={message.role === 'user'}
                    onUpdateMessage={handleUpdateMessage}
                    closeMenuTrigger={closeMenuTrigger}
                  />
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-500/30 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Scroll Buttons */}
          <AnimatePresence>
            {showScrollButton && (
              <>
                <motion.button
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => scrollByAmount(-300)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const interval = setInterval(() => scrollByAmount(-150), 100);
                    const handleUp = () => {
                      clearInterval(interval);
                      document.removeEventListener('mouseup', handleUp);
                    };
                    document.addEventListener('mouseup', handleUp);
                  }}
                  className="absolute top-28 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full p-3 transition-colors cursor-pointer"
                  title="Scroll up (hold to scroll more)"
                >
                  <ArrowDown className="w-6 h-6 text-white rotate-180" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-28 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full p-3 transition-colors cursor-pointer"
                  title="Scroll to bottom"
                >
                  <ArrowDown className="w-6 h-6 text-white" />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0a1628] via-[#0a1628] to-transparent pt-3 pb-20 pointer-events-none">
            <div className="pointer-events-auto">
              <ChatInput 
                onSend={handleSendMessage} 
                isLoading={isLoading}
                lastAssistantMessage={currentMessages?.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
                onTypingStart={() => setCloseMenuTrigger(prev => prev + 1)}
                multiAgentMode={multiAgentMode}
                conversationId={currentConversationId}
                messageValue={messageInputValue}
                onMessageChange={setMessageInputValue}
              />
            </div>


          </div>
            </ResizablePanel>

            <ResizableHandle className="w-1 bg-white/10 hover:bg-white/20 transition-colors" />

            {/* Right Side Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              {isGameMode && !isDeveloperMode && (
                <GameView availableTokens={availableTokens} />
              )}
              
              {isDeveloperMode && (
                <div className="h-full flex flex-col">
                  {multiAgentMode && (
                    <div className="h-1/3 border-b border-white/10 bg-[#0a1628]/50 backdrop-blur-sm overflow-y-auto">
                      <div className="text-center pt-2 pb-1">
                        <div className="inline-block text-white/60 text-xs font-medium px-4 py-1 bg-white/5 border border-white/10 rounded-full">
                          📋 Blackboard
                        </div>
                      </div>
                      <div className="p-4 pt-2">
                        <div className="space-y-3 text-sm">
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                            <div className="text-blue-300 font-medium text-xs mb-1">ARCHITECT</div>
                            <div className="text-white/70 text-xs">No entries yet</div>
                          </div>
                          <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                            <div className="text-red-300 font-medium text-xs mb-1">SECURITY</div>
                            <div className="text-white/70 text-xs">No entries yet</div>
                          </div>
                          <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                            <div className="text-green-300 font-medium text-xs mb-1">ENGINEER</div>
                            <div className="text-white/70 text-xs">No entries yet</div>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                            <div className="text-yellow-300 font-medium text-xs mb-1">QA</div>
                            <div className="text-white/70 text-xs">No entries yet</div>
                          </div>
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2">
                            <div className="text-purple-300 font-medium text-xs mb-1">DOCS</div>
                            <div className="text-white/70 text-xs">No entries yet</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={multiAgentMode ? "h-2/3" : "h-full"}>
                    <CodeTerminal onClose={() => {
                      localStorage.setItem('caos_developer_mode', 'false');
                      window.location.reload();
                    }} />
                  </div>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          /* Non-resizable chat when game/dev mode is off */
          <div className={`relative flex flex-col ${multiAgentMode ? 'h-3/4 w-full' : 'h-full w-full'}`} style={{ minHeight: 0 }}>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-60">
              <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4">
                {currentMessages.length === 0 && !isLoading && (
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <WelcomeGreeting />
                  </div>
                )}

                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    ref={(el) => messageRefs.current[message.id] = el}
                    style={{ transition: 'background-color 0.3s' }}
                  >
                    <ChatBubble 
                      message={message} 
                      isUser={message.role === 'user'}
                      onUpdateMessage={handleUpdateMessage}
                      closeMenuTrigger={closeMenuTrigger}
                      userInitials={user?.email ? user.email.substring(0, 2).toUpperCase() : "ME"}
                    />
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400/30 to-purple-500/30 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <AnimatePresence>
              {showScrollButton && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-28 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full p-2 transition-colors"
                >
                  <ArrowDown className="w-5 h-5 text-white" />
                </motion.button>
              )}
            </AnimatePresence>

            <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0a1628] via-[#0a1628] to-transparent pt-3 pb-20 pointer-events-none">
              <div className="pointer-events-auto">
                <ChatInput 
                  onSend={handleSendMessage} 
                  isLoading={isLoading}
                  lastAssistantMessage={currentMessages?.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
                  onTypingStart={() => setCloseMenuTrigger(prev => prev + 1)}
                  multiAgentMode={multiAgentMode}
                  messageValue={messageInputValue}
                  onMessageChange={setMessageInputValue}
                />
              </div>


            </div>
          </div>
        )}

        {/* Blackboard Below Input - Only in multi-agent mode WITHOUT developer mode */}
        {multiAgentMode && !isDeveloperMode && (
          <div className="h-1/4 w-full border-t border-white/10 bg-[#0a1628]/50 backdrop-blur-sm overflow-y-auto mt-2">
            <div className="flex items-center justify-between pt-2 pb-1 px-4">
              <div className="flex-1 text-center">
                <div className="inline-block text-white/60 text-xs font-medium px-4 py-1 bg-white/5 border border-white/10 rounded-full">
                  📋 Blackboard
                </div>
              </div>
              <button
                onClick={() => {
                  setMultiAgentMode(false);
                  localStorage.setItem('caos_multi_agent_mode', 'false');
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>
            <div className="p-4 pt-2">
              <div className="space-y-3 text-sm">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                  <div className="text-blue-300 font-medium text-xs mb-1">ARCHITECT</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                  <div className="text-red-300 font-medium text-xs mb-1">SECURITY</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                  <div className="text-green-300 font-medium text-xs mb-1">ENGINEER</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                  <div className="text-yellow-300 font-medium text-xs mb-1">QA</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2">
                  <div className="text-purple-300 font-medium text-xs mb-1">DOCS</div>
                  <div className="text-white/70 text-xs">No entries yet</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ThreadList
        isOpen={showThreads}
        onClose={() => setShowThreads(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        messages={messages}
        onSelectConversation={(id) => {
          setCurrentConversationId(id);
          localStorage.setItem('caos_last_conversation', id);
          handleSessionResume(id);
        }}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
      />

      <ProfilePanel
        isOpen={showProfile}
        onClose={() => {
          setShowProfile(false);
          setFileView(null);
        }}
        user={user}
        multiAgentMode={multiAgentMode}
        onMultiAgentModeChange={(enabled) => {
          setMultiAgentMode(enabled);
          localStorage.setItem('caos_multi_agent_mode', enabled);
        }}
        initialView={fileView}
      />

      <Dialog open={showToken} onOpenChange={setShowToken}>
        <DialogContent className="bg-[#0f1f3d]/95 backdrop-blur-xl border-white/10 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Session Token</DialogTitle>
          </DialogHeader>
          <ContinuityToken
            sessionId={currentConversationId}
            userId={user?.email}
            conversationMeta={{
              title: conversations.find(c => c.id === currentConversationId)?.title,
              message_count: currentMessages.length,
              last_message_time: conversations.find(c => c.id === currentConversationId)?.last_message_time
            }}
            messages={currentMessages}
          />
        </DialogContent>
      </Dialog>
      </div>
      );
      }