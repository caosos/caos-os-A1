import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

const DEFAULT_RENDER_LIMIT = 40;
const LOAD_OLDER_CHUNK_SIZE = 40;
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
import BottomNavBar from '@/components/mobile/BottomNavBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useAuthBootstrap } from '@/components/hooks/useAuthBootstrap';
import { useConversations } from '@/components/hooks/useConversations';
import RedScreenOfDeath from '@/components/chat/RedScreenOfDeath';
import { classifyError } from '@/components/lib/errorClassifier';
import useSessionTracker from '@/components/hooks/useSessionTracker';

export default function Chat() {
  const isDeveloperMode = localStorage.getItem('caos_developer_mode') === 'true';
  if (isDeveloperMode) console.count('Chat render');
  const { user, isGuestMode, dataLoaded } = useAuthBootstrap();
  useSessionTracker();

  const [messages, setMessages] = useState({});
  const [wcwState, setWcwState] = useState({ used: null, budget: null });

  const {
    conversations,
    setConversations,
    currentConversationId,
    setCurrentConversationId,
    handleNewThread,
    handleDeleteConversation,
    handleRenameConversation,
    handleSessionResume,
  } = useConversations({ user, isGuestMode, messages, setMessages, setWcwState });

  const [showThreads, setShowThreads] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [fileView, setFileView] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
  const isAtBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [renderLimit, setRenderLimit] = useState(DEFAULT_RENDER_LIMIT);
  const prevScrollHeightRef = useRef(null);
  const pendingJumpIdRef = useRef(null);
  const [messageInputValue, setMessageInputValue] = useState('');
  const [inputHeight, setInputHeight] = useState(0);
  const [rsodError, setRsodError] = useState(null);
  const [sessionProvider, setSessionProvider] = useState(() => localStorage.getItem('caos_session_provider') || 'openai');

  const handleProviderToggle = () => {
    const next = sessionProvider === 'openai' ? 'gemini' : 'openai';
    setSessionProvider(next);
    localStorage.setItem('caos_session_provider', next);
  };
  const lastSendRef = React.useRef(null);

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

  // Listen for repo "Load next chunk" button — namespaced, validated, throttled
  useEffect(() => {
    let lastFired = 0;
    const handler = (e) => {
      const { path, offset } = e.detail || {};
      // Validate payload shape — reject anything malformed
      if (typeof path !== 'string' || path.length === 0 || typeof offset !== 'number') return;
      // Throttle: max 2 fires/sec (also blocks double-clicks)
      const now = Date.now();
      if (now - lastFired < 500) return;
      lastFired = now;
      handleSendMessage(`open ${path} --offset ${offset}`, []);
    };
    window.addEventListener('caos:repoNextChunk', handler);
    return () => window.removeEventListener('caos:repoNextChunk', handler);
  }, [currentConversationId, user]);
  
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

  // Game token loading (non-critical, auth mode only)
  useEffect(() => {
    if (!user?.email || isGuestMode) return;
    let mounted = true;

    (async () => {
      try {
        const tokens = await base44.entities.GameToken.filter({
          user_email: user.email,
          approved: true,
          spent: false
        });
        const total = (tokens || []).reduce((sum, t) => sum + (t.tokens_earned || 0), 0);
        if (mounted) setAvailableTokens(total);
      } catch (e) {
        // non-critical
      }
    })();

    return () => { mounted = false; };
  }, [user, isGuestMode]);

  const currentMessages = currentConversationId ? (messages[currentConversationId] || []) : [];
  const visibleMessages = currentMessages.slice(Math.max(0, currentMessages.length - renderLimit));
  const hasOlderToShow = currentMessages.length > renderLimit;

  // Reset renderLimit when switching conversations
  useEffect(() => {
    setRenderLimit(DEFAULT_RENDER_LIMIT);
  }, [currentConversationId]);

  // Scroll position preservation after "Load older" (scrollHeight delta method)
  useLayoutEffect(() => {
    if (prevScrollHeightRef.current != null && chatContainerRef.current) {
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      const delta = newScrollHeight - prevScrollHeightRef.current;
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollTop + delta;
      prevScrollHeightRef.current = null;
    }
  }, [visibleMessages.length]);

  // Handle pending jump-to-message after renderLimit expansion
  useEffect(() => {
    if (pendingJumpIdRef.current) {
      const id = pendingJumpIdRef.current;
      const element = messageRefs.current[id];
      if (element) {
        pendingJumpIdRef.current = null;
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.transition = 'background-color 0.3s ease';
        element.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
        setTimeout(() => { element.style.backgroundColor = ''; }, 2000);
      }
    }
  }, [visibleMessages.length]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowJumpToLatest(true);
    }
  }, [currentMessages.length]);

  // Track scroll position to show/hide scroll button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 80;
      isAtBottomRef.current = isNearBottom;
      if (isNearBottom) setShowJumpToLatest(false);
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

  const BOOTLOADER_PAYLOAD = `CAOS_BOOTLOADER_INJECT_v1
─────────────────────────────────────────
This message re-establishes verified system state for this session.
Discard any prior tool registry state you may have inferred.

VERIFIED CAPABILITY STATE (authoritative — from hybridMessage KV):
  model_name          = gpt-5.2
  token_limit         = 200000
  web_search_enabled  = true   ← WEB IS ENABLED
  image_parse_enabled = true   ← VISION IS ENABLED
  python_enabled      = true   ← PYTHON IS ENABLED
  file_read_enabled   = true
  tts_enabled         = true
  memory_enabled      = true
  policy_gating       = ACTIVE

INSTRUCTION: Acknowledge this bootloader, confirm your current capability state, and proceed normally.
─────────────────────────────────────────`;

  const handleBootloaderInject = async () => {
    if (!currentConversationId || isLoading) return;
    setIsLoading(true);
    try {
      const { data } = await base44.functions.invoke('hybridMessage', {
        input: BOOTLOADER_PAYLOAD,
        session_id: currentConversationId,
        file_urls: []
      });
      if (data?.reply) {
        handleBootloaderMessage({
          userContent: BOOTLOADER_PAYLOAD,
          assistantReply: data.reply,
          executionReceipt: data.execution_receipt || null,
          responseTimeMs: data.response_time_ms || 0,
        });
        toast.success('Bootloader injected — Aria has updated capability state.');
      }
    } catch (e) {
      toast.error('Bootloader injection failed: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBootloaderMessage = ({ userContent, assistantReply, executionReceipt, responseTimeMs }) => {
    if (!currentConversationId) return;
    const now = new Date().toISOString();
    const userMsg = {
      id: 'boot_user_' + Date.now(),
      conversation_id: currentConversationId,
      role: 'user',
      content: userContent,
      timestamp: now,
    };
    const aiMsg = {
      id: 'boot_ai_' + Date.now(),
      conversation_id: currentConversationId,
      role: 'assistant',
      content: assistantReply,
      response_time_ms: responseTimeMs,
      execution_receipt: executionReceipt,
      timestamp: now,
    };
    setMessages(prev => ({
      ...prev,
      [currentConversationId]: [...(prev[currentConversationId] || []), userMsg, aiMsg]
    }));
  };

  const handleJumpToMessage = (messageId) => {
    const element = messageRefs.current[messageId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.transition = 'background-color 0.3s ease';
      element.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
      setTimeout(() => { element.style.backgroundColor = ''; }, 2000);
    } else {
      // Message not currently rendered — expand renderLimit to show all, then jump
      pendingJumpIdRef.current = messageId;
      setRenderLimit(currentMessages.length);
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

  // ── STREAMING TOGGLE — flip to false for instant rollback ───────────────────
  // LOCK_SIGNATURE: CAOS_STREAMING_TOGGLE_v2_2026-03-31
  const ENABLE_STREAMING = false; // base44.functions.invoke() doesn't support true SSE streaming
  const DEBUG_STREAM = localStorage.getItem('caos_debug_stream') === 'true';

  const handleStreamingMessage = async (content, fileUrls, conversationId, onDelta, onFinal, onError) => {
    // V2: Use fetch() directly to streamHybridMessageV2 SSE endpoint for true streaming
    try {
      // Get auth token + app ID from a quick SDK probe
      let authToken = '';
      let streamUrl = null;
      try {
        const probe = await base44.functions.invoke('streamProbe', {});
        authToken = probe?.config?.headers?.Authorization || '';
        const probeUrl = probe?.config?.url || '';
        const appIdMatch = probeUrl.match(/\/apps\/([^/]+)\//);
        if (appIdMatch) {
          streamUrl = `https://api.base44.com/api/apps/${appIdMatch[1]}/functions/streamHybridMessageV2`;
        }
      } catch (e) {
        if (DEBUG_STREAM) console.warn('⚠️ [PROBE_FAILED]', e.message);
      }

      if (!streamUrl) throw new Error('Could not resolve stream endpoint');

      const res = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': authToken }),
        },
        body: JSON.stringify({
          input: content,
          conversation_id: conversationId,
          file_urls: fileUrls,
          preferred_provider: sessionProvider,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let deltaCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Split on \n\n for SSE frames
        const frames = buf.split('\n\n');
        buf = frames.pop() || '';

        for (const frame of frames) {
          if (!frame.trim()) continue;
          let eventType = null;
          let dataLine = null;
          for (const line of frame.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7).trim();
            else if (line.startsWith('data: ')) dataLine = line.slice(6).trim();
          }
          if (!dataLine) continue;
          let parsed;
          try { parsed = JSON.parse(dataLine); } catch { continue; }

          if (eventType === 'delta') {
            deltaCount++;
            if (DEBUG_STREAM) console.log(`🌊 [DELTA ${deltaCount}]`, parsed.text?.substring(0, 40));
            onDelta(parsed);
          } else if (eventType === 'final') {
            if (DEBUG_STREAM) console.log(`🏁 [FINAL]`, { total_deltas: deltaCount });
            onFinal(parsed);
          } else if (eventType === 'error') {
            if (DEBUG_STREAM) console.warn('🔥 [ERROR]', parsed);
            onError(parsed);
          }
        }
      }
    } catch (err) {
      if (DEBUG_STREAM) console.warn('⚠️ [STREAM_FAILED]', err.message);
      throw err;
    }
  };

  const handleSendMessage = async (content, fileUrls = [], selectedAgents = null) => {
    if (!user || !content?.trim() && fileUrls?.length === 0) return;
    lastSendRef.current = { content, fileUrls, selectedAgents };

    console.log('📤 SEND MESSAGE - Starting:', {
      content: content?.substring(0, 100),
      fileCount: fileUrls?.length,
      conversationId: currentConversationId,
      timestamp: new Date().toISOString()
    });

    setIsLoading(true);
    const startTime = Date.now();
    let conversationId = null;
    let errorLogId = null;
    let tempId = null;
    
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
      
      tempId = 'temp_' + Date.now();
      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), {
          id: tempId,
          conversation_id: conversationId,
          role: 'user',
          content: messageText,
          file_urls: fileUrls,
          timestamp: new Date().toISOString(),
          user_initials: user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : user?.email?.substring(0, 2).toUpperCase()
        }]
      }));

      const contextSeed = localStorage.getItem(`caos_seed_${conversationId}`);
      const currentLane = localStorage.getItem(`caos_current_lane`) || 'general';
      
      console.log('📡 BACKEND CALL - Sending to hybridMessage:', { 
        conversationId, 
        messageLength: fullMessage.length,
        contextSeed: !!contextSeed,
        currentLane
      });

      // ── STREAMING PATH (opt-in, reversible) ─────────────────────────────────
      let response = null;
      if (ENABLE_STREAMING && !isGuestMode) {
        let streamFailed = false;
        let streamingAiMsgId = 'stream_ai_' + Date.now();
        // Insert empty assistant bubble immediately
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), {
            id: streamingAiMsgId, conversation_id: conversationId, role: 'assistant',
            content: '', streaming: true, timestamp: new Date().toISOString()
          }]
        }));
        try {
          await handleStreamingMessage(
            fullMessage, fileUrls, conversationId,
            // onDelta
            ({ text }) => {
              setMessages(prev => {
                const msgs = prev[conversationId] || [];
                return { ...prev, [conversationId]: msgs.map(m => m.id === streamingAiMsgId ? { ...m, content: m.content + text } : m) };
              });
              if (isAtBottomRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            },
            // onFinal
            (finalData) => {
              setMessages(prev => {
                const msgs = prev[conversationId] || [];
                return { ...prev, [conversationId]: msgs.map(m => m.id === streamingAiMsgId ? { ...m, streaming: false, response_time_ms: finalData.response_time_ms } : m) };
              });
              if (finalData.token_usage?.prompt_tokens) setWcwState({ used: finalData.token_usage.prompt_tokens, budget: 200000 });
              setConversations(prev => {
                const aiMsg = (messages[conversationId] || []).find(m => m.id === streamingAiMsgId);
                const preview = aiMsg?.content?.substring(0, 100) || '';
                return [{ ...prev.find(c => c.id === conversationId), last_message_preview: preview, last_message_time: new Date().toISOString() }, ...prev.filter(c => c.id !== conversationId)];
              });
              base44.entities.Conversation.update(conversationId, { last_message_preview: '', last_message_time: new Date().toISOString() }).catch(() => {});
              localStorage.removeItem('caos_last_message_backup');
              clearTimeout(timeoutId);
              setIsLoading(false);
            },
            // onError
            ({ error_code, stage }) => {
              streamFailed = true;
              console.warn('⚠️ [STREAM_EVENT_ERROR]', { error_code, stage });
            }
          );
        } catch (streamErr) {
          streamFailed = true;
          console.warn('⚠️ [STREAM_FETCH_FAILED] Falling back to hybridMessage:', streamErr.message);
        }

        if (streamFailed) {
          // Remove the partial streaming bubble and fall through to hybridMessage
          setMessages(prev => ({ ...prev, [conversationId]: (prev[conversationId] || []).filter(m => m.id !== streamingAiMsgId) }));
        } else {
          // Streaming succeeded — skip the hybridMessage invoke below
          return;
        }
      }
      // ── NON-STREAMING PATH (fallback / ENABLE_STREAMING=false / guest mode) ──
      const inferenceStart = Date.now();
      response = await base44.functions.invoke('hybridMessage', {
        input: fullMessage,
        session_id: conversationId,
        file_urls: fileUrls,
        preferred_provider: sessionProvider
      });

      console.log('📥 BACKEND RESPONSE - Received:', { 
        status: response?.status, 
        hasData: !!response?.data,
        replyLength: response?.data?.reply?.length,
        replyPreview: response?.data?.reply?.substring(0, 150)
      });

      clearTimeout(timeoutId);
      // Use backend-reported response_time_ms if available (most accurate), else measure from inferenceStart
      const responseTime = response?.data?.response_time_ms || response?.data?.data?.response_time_ms || (Date.now() - inferenceStart);

      // RSoD/ODEL: Classify response errors — blocking vs inline
      if (!response || response.status !== 200) {
        const classified = classifyError(null, response);
        console.error('❌ [ODEL_ERROR]', { error_code: classified.error_code, stage: classified.stage, error_id: classified.error_id });

        if (classified.blocking) {
          setMessages(prev => ({ ...prev, [conversationId]: (prev[conversationId] || []).filter(m => m.id !== tempId) }));
          setRsodError(classified);
        } else {
          // Non-blocking: render inline failed assistant message
          setMessages(prev => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] || []).filter(m => m.id !== tempId), {
              id: 'err_' + Date.now(), conversation_id: conversationId, role: 'assistant',
              content: classified.public_message, failed: true,
              error_id: classified.error_id, error_code: classified.error_code,
              stage: classified.stage, timestamp: new Date().toISOString()
            }]
          }));
          toast.error(`Error: ${classified.error_code}`, { duration: 8000 });
        }
        return;
      }

      const { data } = response;
      if (!data) {
        console.error('❌ NO DATA - Response missing data field:', response);
        throw new Error('No response data from server');
      }

      // Auto-save files/photos/links from messages to UserFile storage
      const saveToUserFiles = async (url, type, name, mimeType) => {
        if (isGuestMode) return;
        try {
          const exists = await base44.entities.UserFile.filter({ created_by: user.email, url, type }, '-created_date', 1);
          if (exists.length === 0) {
            await base44.entities.UserFile.create({ name: name || url.split('/').pop() || url, url, type, folder_path: '/', mime_type: mimeType || '' });
          }
        } catch (e) {
          console.warn('Could not auto-save to UserFile:', e.message);
        }
      };

      // SANITIZER: Only save explicitly shared resources, never prose-embedded links.
      // Triggers: (1) user-attached fileUrls, (2) AI-generated file attachments (generated_files),
      // (3) URLs that are clearly a direct resource link on their own line (markdown link or bare URL line).
      const extractAndSaveExplicitResources = async (text) => {
        if (isGuestMode || !text) return;
        // Only match markdown links [text](url) or bare URLs that appear alone on a line
        // — NOT URLs embedded mid-sentence in prose.
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const bareLineUrlRegex = /^(https?:\/\/[^\s]+)$/gm;

        const toSave = [];
        let m;
        while ((m = markdownLinkRegex.exec(text)) !== null) {
          toSave.push({ url: m[2].replace(/[.,;:!?]+$/, ''), label: m[1] });
        }
        while ((m = bareLineUrlRegex.exec(text)) !== null) {
          toSave.push({ url: m[1].replace(/[.,;:!?]+$/, ''), label: null });
        }

        for (const { url, label } of toSave) {
          const pathPart = url.split('?')[0];
          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(pathPart);
          const isFile = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|txt|csv|mp3|mp4|mov|avi)$/i.test(pathPart);
          if (isImage) {
            const fileName = label || pathPart.split('/').pop() || 'image';
            await saveToUserFiles(url, 'photo', fileName, 'image/jpeg');
          } else if (isFile) {
            const fileName = label || pathPart.split('/').pop() || 'file';
            await saveToUserFiles(url, 'file', fileName, '');
          } else {
            const name = label || (() => { try { return new URL(url).hostname.replace('www.', ''); } catch { return url; } })();
            await saveToUserFiles(url, 'link', name);
          }
        }
      };

      // SESSION_RESUME_NOOP: backend acknowledged silently — nothing to display
      if (data.mode === 'SESSION_RESUME_NOOP') {
        clearTimeout(timeoutId);
        setIsLoading(false);
        return;
      }

      // AUDIT LOG 5: Frontend receives response
      console.log('🔍 [AUDIT_5_FRONTEND_RECEIVES]', JSON.stringify({
        response_keys: Object.keys(data),
        has_reply: !!data.reply,
        has_mode: !!data.mode,
        has_execution_receipt: !!data.execution_receipt,
        execution_receipt_keys: data.execution_receipt ? Object.keys(data.execution_receipt) : [],
        execution_receipt_full: data.execution_receipt,
        reply_preview: data.reply?.substring(0, 100)
      }, null, 2));

      let reply = data.data?.reply || data.reply || data.response || data.text || '';
      if (!reply) {
        console.error('❌ EMPTY REPLY - Backend returned no content:', data);
        throw new Error('Empty response from server');
      }



      // ── REPO COMMAND PASSTHROUGH (single-command interceptor) ───────────────
      // Fires ONLY when the entire assistant reply is exactly one bare repo command.
      // No synthesis, no second AI hop — handleRepoCommand in hybridMessage does all the work.
      // Guardrails: open/ls only, no path traversal, max path length, no consecutive intercepts.
      const _repoTrimmed = reply.trim();
      const bareRepoMatch = _repoTrimmed.match(/^(open|ls)\s+(\S+.{0,200})$/i);
      const _lastInterceptKey = 'caos_last_repo_intercept';
      const _lastIntercept = sessionStorage.getItem(_lastInterceptKey);
      const _interceptAllowed = _lastIntercept !== _repoTrimmed; // no consecutive duplicate intercepts
      if (bareRepoMatch && _interceptAllowed) {
        const _path = bareRepoMatch[2].trim();
        const _pathSafe = !_path.includes('..') && !_path.includes('~') && !_path.match(/^https?:/);
        if (_pathSafe) {
          console.log('🤖 [REPO_PASSTHROUGH] Intercepting:', _repoTrimmed);
          sessionStorage.setItem(_lastInterceptKey, _repoTrimmed);
          try {
            const cmdResponse = await base44.functions.invoke('hybridMessage', {
              input: _repoTrimmed,
              session_id: conversationId,
              file_urls: [],
              preferred_provider: sessionProvider
            });
            const cmdData = cmdResponse?.data || {};
            const cmdReply = cmdData.reply || cmdData.data?.reply || '';
            if (cmdReply) {
              reply = cmdReply;
              // Carry structured repo_tool envelope so the "Next chunk" button renders
              if (cmdData.repo_tool) data.repo_tool = cmdData.repo_tool;
            }
          } catch (e) {
            console.error('🔥 [REPO_PASSTHROUGH_FAILED]', e.message);
          }
        }
      } else if (bareRepoMatch && !_interceptAllowed) {
        console.warn('⚠️ [REPO_PASSTHROUGH_THROTTLED] Duplicate intercept blocked:', _repoTrimmed);
      }

      // Auto-save files/photos from user's attached files
      if (!isGuestMode && fileUrls) {
        for (const fileUrl of fileUrls) {
          const fileName = fileUrl.split('/').pop();
          if (fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
            await saveToUserFiles(fileUrl, 'photo', fileName, 'image/jpeg');
          } else {
            await saveToUserFiles(fileUrl, 'file', fileName, '');
          }
        }
      }
      // Extract and save explicitly shared resources from the AI reply (sanitized — no prose links)
      await extractAndSaveExplicitResources(reply);

      // Update WCW meter with real data from backend
      if (data.wcw_budget && data.wcw_used !== undefined) {
        setWcwState({ used: data.wcw_used, budget: data.wcw_budget });
      }

      // Check for duplicate responses
      const lastAiMessage = currentMessages.filter(m => m.role === 'assistant').slice(-1)[0];
      if (lastAiMessage && lastAiMessage.content === reply) {
        console.warn('⚠️ DUPLICATE RESPONSE DETECTED!', {
          previousMessageId: lastAiMessage.id,
          previousTimestamp: lastAiMessage.timestamp,
          currentReply: reply.substring(0, 100),
          userMessage: content.substring(0, 100)
        });
      }

      console.log('✅ MESSAGE SUCCESS - Reply validated:', {
        replyLength: reply.length,
        responseTime: Date.now() - startTime,
        isDuplicate: lastAiMessage?.content === reply
      });
      
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
          timestamp: new Date().toISOString(),
          user_initials: user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : user?.email?.substring(0, 2).toUpperCase()
        };
        const aiMsg = {
          id: 'msg_' + Date.now() + '_ai',
          conversation_id: conversationId,
          role: 'assistant',
          content: reply,
          generated_files: data.generatedFiles || [],
          tool_calls: data.tool_calls || [],
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          execution_receipt: data.legacy_execution_receipt || null,
          repo_tool: data.repo_tool || null
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
        // Backend (hybridMessage) already saves both messages to DB.
        // Promote the temp user message in-place, append only the AI reply.
        // This prevents duplicates when the conversation is re-loaded from DB.
        const aiMsg = {
          id: 'local_ai_' + Date.now(),
          conversation_id: conversationId,
          role: 'assistant',
          content: reply,
          token_count: data.usage_tokens || 0,
          generated_files: data.generatedFiles || [],
          tool_calls: data.tool_calls || [],
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          execution_receipt: data.legacy_execution_receipt || null,
          // repo_tool: pull from top-level OR from data — hybridMessage returns at top level
          repo_tool: data.repo_tool || response?.data?.repo_tool || null,
          inference_provider: data.provider || sessionProvider || 'openai'
        };
        setMessages(prev => {
          const existing = prev[conversationId] || [];
          // Promote temp → confirmed user message (keep same position, update id)
          const promoted = existing.map(m =>
            m.id === tempId
              ? { ...m, id: 'confirmed_user_' + Date.now(), failed: false }
              : m
          );
          return {
            ...prev,
            [conversationId]: [...promoted, aiMsg]
          };
        });
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
        // Fire-and-forget — hybridMessage already updates Conversation server-side.
        // A platform 500 here is non-critical and must not surface to the user.
        base44.entities.Conversation.update(conversationId, {
          last_message_preview: reply.substring(0, 100),
          last_message_time: new Date().toISOString()
        }).catch((e) => console.warn('[CONV_UPDATE_NONFATAL]', e?.message));
      }

      // Clear backup on success
      localStorage.removeItem('caos_last_message_backup');
      console.log('Message saved successfully');
    } catch (error) {
      clearTimeout(timeoutId);
      const classified = classifyError(error, null);
      console.error('❌ SEND ERROR - Message failed:', { error_code: classified.error_code, stage: classified.stage, message: error.message });

      if (classified.blocking) {
        setMessages(prev => ({ ...prev, [conversationId || currentConversationId]: (prev[conversationId || currentConversationId] || []).filter(m => !m.id?.startsWith('temp_')) }));
        setRsodError(classified);
        setIsLoading(false);
        return;
      }
      
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



  const isMobile = window.innerWidth < 768;

  return (
    <div className="fixed inset-0 bg-[#0a1628] flex flex-col" style={{ height: '100vh', height: '100dvh' }}>
      {rsodError && (
        <RedScreenOfDeath
          error={rsodError}
          sessionId={currentConversationId}
          onRetry={() => {
            setRsodError(null);
            if (lastSendRef.current) {
              const { content, fileUrls, selectedAgents } = lastSendRef.current;
              handleSendMessage(content, fileUrls, selectedAgents);
            }
          }}
          onDismiss={() => setRsodError(null)}
        />
      )}
      <div className="fixed inset-0 z-0">
        <StarfieldBackground />
      </div>

      {/* Pull-to-refresh handler for mobile */}
      {isMobile && (
        <div
          onTouchStart={(e) => {
            const startY = e.touches[0].clientY;
            const handleTouchMove = (e) => {
              const currentY = e.touches[0].clientY;
              if (currentY > startY + 100 && chatContainerRef.current?.scrollTop === 0) {
                setTimeout(() => window.location.reload(), 500);
              }
            };
            window.addEventListener('touchmove', handleTouchMove);
            return () => window.removeEventListener('touchmove', handleTouchMove);
          }}
        />
      )}

      <div className="relative z-30 bg-[#0a1628] flex-shrink-0" style={{ isolation: 'auto' }}>
          <div className="flex items-center justify-between gap-2 px-2 sm:px-4 py-1 sm:py-2">
            <div className="flex-1 min-w-0 flex items-center gap-1 sm:gap-2">
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
                onBootloader={currentConversationId && currentMessages.length > 0 ? handleBootloaderInject : undefined}
                bootloaderDisabled={isLoading}
                provider={sessionProvider}
                onProviderToggle={handleProviderToggle}
              />
              {currentConversationId && currentMessages.length > 0 && (
                <div className="z-10 flex items-center gap-2">
                  <ConversationSearch
                    messages={currentMessages}
                    onJumpToMessage={handleJumpToMessage}
                  />
                </div>
              )}
            </div>
            {currentConversationId && currentMessages.length > 0 && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-shrink-0">
                  <TokenMeter 
                    messages={currentMessages}
                    wcwUsed={wcwState.used}
                    wcwBudget={wcwState.budget}
                    provider={sessionProvider}
                  />
                </div>
              </div>
            )}
          </div>

        </div>

      <div className={`relative flex-1 z-20 overflow-hidden ${(isDeveloperMode || isGameMode) && !isMobile ? 'flex' : 'flex flex-col'}`} style={{ minHeight: 0 }}>
        {(isDeveloperMode || isGameMode) && !isMobile ? (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Chat Section */}
            <ResizablePanel defaultSize={50} minSize={30} className="relative flex flex-col" style={{ minHeight: 0 }}>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: `${Math.max(inputHeight + 20, 192)}px` }}>
            <div className="w-full max-w-2xl mx-auto px-1 sm:px-4 py-2 sm:py-4">
              {currentMessages.length === 0 && !isLoading && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <WelcomeGreeting />
                </div>
              )}

              {hasOlderToShow && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={() => {
                      prevScrollHeightRef.current = chatContainerRef.current?.scrollHeight ?? null;
                      setRenderLimit(prev => prev + LOAD_OLDER_CHUNK_SIZE);
                    }}
                    className="px-4 py-1.5 text-xs text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                  >
                    Load older messages
                  </button>
                </div>
              )}

              <React.Profiler id="MessageList" onRender={(id, phase, actualDuration) => { if (isDeveloperMode) console.log('[PROFILER]', id, phase, actualDuration.toFixed(1)+'ms'); }}>
              {visibleMessages.map((message, idx) => (
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
                    isNew={idx >= visibleMessages.length - 2}
                  />
                </div>
              ))}
              </React.Profiler>

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
            {showJumpToLatest && !showScrollButton && (
              <motion.button
                key="jump-latest-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => { scrollToBottom(); setShowJumpToLatest(false); }}
                className="absolute bottom-28 right-4 z-50 bg-blue-600/80 hover:bg-blue-500/90 backdrop-blur-sm border border-blue-400/40 rounded-full px-4 py-2 transition-colors cursor-pointer flex items-center gap-2 text-white text-sm font-medium"
                title="Jump to latest"
              >
                <ArrowDown className="w-4 h-4" />
                Latest
              </motion.button>
            )}
          </AnimatePresence>

          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0a1628] via-[#0a1628] to-transparent pt-3 pb-20 pointer-events-auto">
            <div>
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
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden" style={{ paddingBottom: `${Math.max(inputHeight + 20, 192)}px` }}>
              <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4">
              {currentMessages.length === 0 && !isLoading && (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <WelcomeGreeting />
                </div>
              )}

              {hasOlderToShow && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={() => {
                      prevScrollHeightRef.current = chatContainerRef.current?.scrollHeight ?? null;
                      setRenderLimit(prev => prev + LOAD_OLDER_CHUNK_SIZE);
                    }}
                    className="px-4 py-1.5 text-xs text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                  >
                    Load older messages
                  </button>
                </div>
              )}

              <React.Profiler id="MessageList" onRender={(id, phase, actualDuration) => { if (isDeveloperMode) console.log('[PROFILER]', id, phase, actualDuration.toFixed(1)+'ms'); }}>
              {visibleMessages.map((message, idx) => (
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
                    isNew={idx >= visibleMessages.length - 2}
                  />
                </div>
              ))}
              </React.Profiler>

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
                  className="absolute bottom-28 right-4 z-50 bg-white/10 hover:bg-white/20 active:bg-white/30 backdrop-blur-sm border border-white/20 rounded-full p-4 transition-colors touch-manipulation"
                  style={{ minWidth: '52px', minHeight: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <ArrowDown className="w-5 h-5 text-white" />
                </motion.button>
              )}
              {showJumpToLatest && !showScrollButton && (
                <motion.button
                  key="jump-latest-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() => { scrollToBottom(); setShowJumpToLatest(false); }}
                  className="absolute bottom-28 right-4 z-50 bg-blue-600/80 hover:bg-blue-500/90 active:bg-blue-400/90 backdrop-blur-sm border border-blue-400/40 rounded-full px-4 py-3 transition-colors touch-manipulation flex items-center gap-2 text-white text-sm font-medium"
                  style={{ minHeight: '52px' }}
                  title="Jump to latest"
                >
                  <ArrowDown className="w-4 h-4" />
                  Latest
                </motion.button>
              )}
            </AnimatePresence>

            <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0a1628] via-[#0a1628] to-transparent pt-3 pb-20 pointer-events-auto" ref={(el) => {
              if (el) setInputHeight(el.offsetHeight);
            }}>
              <div>
                <ChatInput 
                  onSend={handleSendMessage} 
                  isLoading={isLoading}
                  lastAssistantMessage={currentMessages?.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
                  onTypingStart={() => setCloseMenuTrigger(prev => prev + 1)}
                  multiAgentMode={multiAgentMode}
                  messageValue={messageInputValue}
                  onMessageChange={setMessageInputValue}
                  onHeightChange={setInputHeight}
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

      {/* Bottom Navigation for Mobile */}
      {isMobile && <BottomNavBar currentPage="Chat" user={user} />}

      <ThreadList
        isOpen={showThreads}
        onClose={() => setShowThreads(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        messages={messages}
        onSelectConversation={(id) => {
          setCurrentConversationId(id);
          localStorage.setItem('caos_last_conversation', id);
          sessionStorage.setItem('caos_window_conversation', id);
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
        conversationId={currentConversationId}
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