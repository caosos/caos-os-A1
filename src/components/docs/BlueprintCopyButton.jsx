import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function BlueprintCopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const container = document.getElementById('blueprint-content');
    if (!container) return;

    // Find all collapsed section content divs (hidden ones)
    // Each Section renders a button + a div that's only present when open
    // We'll click all closed toggle buttons, grab text, then click them back

    const toggleButtons = Array.from(container.querySelectorAll('button[data-section-toggle]'));
    const wasOpen = toggleButtons.map(btn => btn.getAttribute('data-open') === 'true');

    // Open all closed sections
    toggleButtons.forEach((btn, i) => {
      if (!wasOpen[i]) btn.click();
    });

    // Wait a tick for React to re-render
    await new Promise(r => setTimeout(r, 100));

    const text = container.innerText;
    await navigator.clipboard.writeText(text);
    setCopied(true);

    // Restore original state — close the ones we opened
    await new Promise(r => setTimeout(r, 50));
    toggleButtons.forEach((btn, i) => {
      if (!wasOpen[i]) btn.click();
    });

    setTimeout(() => setCopied(false), 2500);
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