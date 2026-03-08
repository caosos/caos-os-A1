import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function useConversations({
  user,
  isGuestMode,
  messages,
  setMessages,
  setWcwState
}) {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [bootCompleted, setBootCompleted] = useState(false);

  const prevConversationIdRef = useRef(null);

  // Bootstrap guest data from localStorage
  useEffect(() => {
    if (!isGuestMode || !user) return;

    const guestConvos = JSON.parse(
      localStorage.getItem('caos_guest_conversations') || '[]'
    );
    const guestMsgs = JSON.parse(
      localStorage.getItem('caos_guest_messages') || '{}'
    );

    setConversations(guestConvos);
    setMessages(prev => ({ ...prev, ...guestMsgs }));
    setBootCompleted(true);
  }, [isGuestMode, user, setMessages]);

  // Bootstrap authenticated conversations
  useEffect(() => {
    if (!user || isGuestMode) return;

    let mounted = true;

    (async () => {
      try {
        const userConvos = await base44.entities.Conversation.filter(
          { created_by: user.email },
          '-last_message_time',
          200
        );
        if (!mounted) return;
        setConversations(userConvos || []);

        // Deterministic boot: only restore if user explicitly saved a last conversation
        const lastId = localStorage.getItem('caos_last_conversation');
        if (lastId && (userConvos || []).some(c => c.id === lastId)) {
          setCurrentConversationId(lastId);
        } else {
          setCurrentConversationId(null);
        }
      } catch (e) {
        console.error('Failed to load conversations:', e);
      } finally {
        if (mounted) setBootCompleted(true);
      }
    })();

    return () => { mounted = false; };
  }, [user, isGuestMode]);

  // Reset WCW on thread switch
  useEffect(() => {
    if (prevConversationIdRef.current !== currentConversationId) {
      prevConversationIdRef.current = currentConversationId;
      setWcwState({ used: null, budget: null });
    }
  }, [currentConversationId, setWcwState]);

  // Lazy load messages + receipt restore
  useEffect(() => {
    if (!bootCompleted) return;
    if (!currentConversationId || isGuestMode) return;
    if (messages[currentConversationId]) return;

    let mounted = true;

    Promise.all([
      base44.entities.Message.filter(
        { conversation_id: currentConversationId },
        '-timestamp',
        500
      ).then(msgs => (msgs ? msgs.reverse() : [])),
      base44.entities.DiagnosticReceipt.filter(
        { session_id: currentConversationId },
        '-created_date',
        1
      ).catch(() => [])
    ])
      .then(([msgs, receipts]) => {
        if (!mounted) return;

        console.log('--- Message Hydration Log ---');
        console.log('Conversation ID:', currentConversationId);
        console.log('Messages Returned (chronological):', msgs?.length || 0);
        if (msgs?.length > 0) {
          console.log('First Timestamp:', msgs[0].timestamp);
          console.log('Last Timestamp:', msgs[msgs.length - 1].timestamp);
        }
        console.log('-----------------------------');

        setMessages(prev => ({
          ...prev,
          [currentConversationId]: msgs || []
        }));

        const lastReceipt = receipts?.[0];
        if (lastReceipt?.wcw_budget && lastReceipt?.wcw_used !== undefined) {
          setWcwState({
            used: lastReceipt.wcw_used,
            budget: lastReceipt.wcw_budget
          });
        }
      })
      .catch(console.error);

    return () => { mounted = false; };
  }, [bootCompleted, currentConversationId, isGuestMode, setMessages, setWcwState]);

  // Create new thread
  const handleNewThread = async () => {
    if (!user) return;

    try {
      if (isGuestMode) {
        const newConversation = {
          id: 'guest_' + Date.now(),
          title: 'New Conversation',
          last_message_time: new Date().toISOString(),
          created_by: user.email
        };

        setConversations(prev => {
          const updated = [newConversation, ...prev];
          localStorage.setItem('caos_guest_conversations', JSON.stringify(updated));
          return updated;
        });
        setCurrentConversationId(newConversation.id);
        setMessages(prev => ({ ...prev, [newConversation.id]: [] }));
      } else {
        const newConversation = await base44.entities.Conversation.create({
          title: 'New Conversation',
          last_message_time: new Date().toISOString(),
          created_by: user.email
        });

        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        setMessages(prev => ({ ...prev, [newConversation.id]: [] }));
        localStorage.setItem('caos_last_conversation', newConversation.id);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create new thread');
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      if (isGuestMode) {
        setConversations(prev => {
          const updated = prev.filter(c => c.id !== id);
          localStorage.setItem('caos_guest_conversations', JSON.stringify(updated));
          return updated;
        });

        setMessages(prev => {
          const updated = { ...prev };
          delete updated[id];
          localStorage.setItem('caos_guest_messages', JSON.stringify(updated));
          return updated;
        });
      } else {
        await base44.entities.Conversation.delete(id);
        const convMessages = messages[id] || [];
        for (const msg of convMessages) {
          await base44.entities.Message.delete(msg.id);
        }
        setConversations(prev => prev.filter(c => c.id !== id));
        setMessages(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        if (currentConversationId === id) {
          localStorage.removeItem('caos_last_conversation');
        }
      }

      if (currentConversationId === id) {
        setCurrentConversationId(null);
      }

      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete thread');
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    setConversations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, title: newTitle } : c);
      if (isGuestMode) {
        localStorage.setItem('caos_guest_conversations', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      if (!isGuestMode) {
        await base44.entities.Conversation.update(id, { title: newTitle });
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename thread');
    }
  };

  const handleSessionResume = async (sessionId) => {
    try {
      const { data } = await base44.functions.invoke('hybridMessage', {
        input: "__SESSION_RESUME__",
        session_id: sessionId,
        limit: 20
      });

      if (data.session && data.session !== sessionId) {
        console.error('SESSION DESYNC on resume:', { expected: sessionId, received: data.session });
        toast.error('Session mismatch detected during resume.');
      }
    } catch (error) {
      console.error('Session resume handshake failed:', error);
    }
  };

  return {
    conversations,
    setConversations,
    currentConversationId,
    setCurrentConversationId,
    bootCompleted,
    handleNewThread,
    handleDeleteConversation,
    handleRenameConversation,
    handleSessionResume,
  };
}