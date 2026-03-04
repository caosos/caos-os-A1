import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

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

export default function BootloaderInject({ conversationId, onMessageSent, disabled }) {
  const [injecting, setInjecting] = useState(false);

  const handleInject = async () => {
    if (!conversationId || injecting) return;
    setInjecting(true);
    try {
      const { data } = await base44.functions.invoke('hybridMessage', {
        input: BOOTLOADER_PAYLOAD,
        session_id: conversationId,
        file_urls: []
      });
      if (data?.reply) {
        onMessageSent?.({
          userContent: BOOTLOADER_PAYLOAD,
          assistantReply: data.reply,
          executionReceipt: data.execution_receipt || null,
          responseTimeMs: data.response_time_ms || 0,
        });
        toast.success('Bootloader injected — Aria now has current capability state.');
      }
    } catch (e) {
      toast.error('Bootloader injection failed: ' + e.message);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <button
      onClick={handleInject}
      disabled={disabled || injecting || !conversationId}
      title="Inject capability bootloader into this conversation"
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Zap className={`w-3.5 h-3.5 ${injecting ? 'animate-pulse' : ''}`} />
      {injecting ? 'Injecting...' : 'Bootloader'}
    </button>
  );
}