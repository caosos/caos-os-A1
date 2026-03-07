import React from 'react';
import { Copy } from 'lucide-react';

export default function CopyButton({ onCopy }) {
  return (
    <button
      onClick={onCopy}
      className="p-1 hover:bg-white/10 rounded transition-colors"
      title="Copy"
    >
      <Copy className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
    </button>
  );
}