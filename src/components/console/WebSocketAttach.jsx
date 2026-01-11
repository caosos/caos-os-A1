import React from 'react';
import { Terminal } from 'lucide-react';
import CodeTerminal from '@/components/terminal/CodeTerminal';

export default function WebSocketAttach({ onClose }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
      <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-purple-400" />
        WebSocket Terminal Attach
      </h2>
      
      <div className="bg-purple-900/20 border border-purple-600/50 rounded p-3 mb-4">
        <p className="text-purple-300 text-sm">
          This mode attaches to an <strong>existing</strong> terminal process (tmux/screen/daemon).
          It does not establish new connections. Use SSH Console for direct server access.
        </p>
      </div>
      
      <CodeTerminal onClose={onClose} />
    </div>
  );
}