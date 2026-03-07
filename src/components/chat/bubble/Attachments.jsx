import React from 'react';
import { Download } from 'lucide-react';

// Verbatim extraction of the "Display attached files" block from ChatBubble.jsx — Commit 4
// No wrapper DOM changes, identical image regex, identical className and filename derivation.

export default function Attachments({ fileUrls }) {
  if (!fileUrls || fileUrls.length === 0) return null;

  return (
    <div className="space-y-2">
      {fileUrls.map((fileUrl, index) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
        const fileName = fileUrl.split('/').pop();

        return isImage ? (
          <div key={index} className="rounded-lg overflow-hidden border border-white/20">
            <img src={fileUrl} alt="Attached" className="max-w-full h-auto" />
          </div>
        ) : (
          <a
            key={index}
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-white/80 flex-1">{fileName}</span>
          </a>
        );
      })}
    </div>
  );
}