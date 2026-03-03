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

        // Restore last convo if available
        const lastId = localStorage.getItem('caos_last_conversation');
        if (lastId && (userConvos || []).some(c => c.id === lastId)) {
          setCurrentConversationId(lastId);
        } else if ((userConvos || []).length > 0) {
          setCurrentConversationId(userConvos[0].id);
        } else {
          setCurrentConversationId(null);
        }
      } catch (e) {
        console.error('Failed to load conversations:', e);
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
    if (!currentConversationId || isGuestMode) return;
    if (messages[currentConversationId]) return;

    let mounted = true;

    Promise.all([
      base44.entities.Message.filter(
        { conversation_id: currentConversationId },
        'timestamp',
        500
      ),
      base44.entities.DiagnosticReceipt.filter(
        { session_id: currentConversationId },
        '-created_date',
        1
      ).catch(() => [])
    ])
      .then(([msgs, receipts]) => {
        if (!mounted) return;

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
  }, [currentConversationId, isGuestMode, messages, setMessages, setWcwState]);

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
    handleNewThread,
    handleDeleteConversation,
    handleRenameConversation,
    handleSessionResume,
  };
}