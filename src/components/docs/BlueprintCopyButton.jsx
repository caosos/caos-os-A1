import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function BlueprintCopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const container = document.getElementById('blueprint-content');
    if (!container) return;
    const text = container.innerText;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
        copied
          ? 'bg-green-600 text-white'
          : 'bg-blue-600 hover:bg-blue-500 text-white'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy Full Blueprint'}
    </button>
  );
}