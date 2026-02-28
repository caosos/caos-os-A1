import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown, MessageSquare, Clock } from 'lucide-react';
import moment from 'moment';

export default function SessionSelector({ selectedSessionId, onSelectSession }) {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const convos = await base44.asServiceRole.entities.Conversation.list('-last_message_time', 50);
                setConversations(convos || []);
                // Auto-select most recent if none selected
                if (!selectedSessionId && convos && convos.length > 0) {
                    onSelectSession(convos[0].id, convos[0].title);
                }
            } catch (e) {
                console.error('Failed to load conversations:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const selected = conversations.find(c => c.id === selectedSessionId);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {loading ? (
                        <span className="text-muted-foreground text-sm">Loading sessions...</span>
                    ) : selected ? (
                        <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{selected.title || 'Untitled'}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">{selected.id}</div>
                        </div>
                    ) : (
                        <span className="text-muted-foreground text-sm">Select a session to inspect</span>
                    )}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No conversations found</div>
                    ) : (
                        conversations.map(c => (
                            <button
                                key={c.id}
                                onClick={() => {
                                    onSelectSession(c.id, c.title);
                                    setOpen(false);
                                }}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 ${c.id === selectedSessionId ? 'bg-muted' : ''}`}
                            >
                                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm truncate">{c.title || 'Untitled'}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-mono text-muted-foreground truncate">{c.id}</span>
                                        {c.last_message_time && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                                                <Clock className="h-3 w-3" />
                                                {moment(c.last_message_time).fromNow()}
                                            </span>
                                        )}
                                    </div>
                                    {c.last_message_preview && (
                                        <div className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message_preview}</div>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}