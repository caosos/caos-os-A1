import React from 'react';
import { Mail } from 'lucide-react';

export default function EmailButton({ onEmail }) {
  return (
    <button
      onClick={onEmail}
      className="p-1 hover:bg-white/10 rounded transition-colors"
      title="Email this"
    >
      <Mail className="w-3.5 h-3.5 text-white/60 hover:text-white/90" />
    </button>
  );
}