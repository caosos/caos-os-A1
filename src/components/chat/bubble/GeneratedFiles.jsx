import React from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

// Verbatim extraction of the "Display generated files" block from ChatBubble.jsx — Commit 5
// No wrapper DOM changes, identical isImage logic, identical click handler semantics.

export default function GeneratedFiles({ files, downloadFile }) {
  if (!files || files.length === 0) return null;

  return (
    <div className="space-y-2 mt-3">
      <div className="text-xs text-green-400 font-medium flex items-center gap-2">
        <span>📁</span> Generated Files
      </div>
      {files.map((file, index) => {
        const isImage = file.type === 'image' || /image/.test(file.type);

        return isImage && file.url ? (
          <div key={index} className="rounded-lg overflow-hidden border border-green-400/30">
            <img src={file.url} alt={file.name} className="max-w-full h-auto" />
          </div>
        ) : (
          <button
            key={index}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (file.url) {
                const a = document.createElement('a');
                a.href = file.url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                toast.success(`Downloaded ${file.name}`);
              } else if (file.content) {
                downloadFile(file.content, file.name);
              }
            }}
            className="w-full flex items-center gap-2 bg-green-500/10 border border-green-400/30 rounded-lg px-3 py-2 hover:bg-green-500/20 transition-colors text-left cursor-pointer"
          >
            <Download className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-sm text-white/90 flex-1 truncate">{file.name}</span>
            <span className="text-xs text-green-400 whitespace-nowrap">Download</span>
          </button>
        );
      })}
    </div>
  );
}