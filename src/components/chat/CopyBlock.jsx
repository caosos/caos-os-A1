import React, { useState } from 'react';
import { Copy, Mail, Check, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CopyBlock({ content, title }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title || 'From CAOS');
    const body = encodeURIComponent(editedContent);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success('Opening email client...');
  };

  return (
    <div className="relative group bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden my-3">
      {/* Header with title and action buttons */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5">
        <div className="text-xs font-medium text-white/70">
          {title || 'Copy Block'}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
            title={isEditing ? 'Done editing' : 'Edit content'}
          >
            <Edit2 className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={handleEmail}
            className="p-1.5 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
            title="Open in email"
          >
            <Mail className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Content area */}
      {isEditing ? (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full bg-transparent text-white text-sm p-4 focus:outline-none resize-none font-mono"
          rows={editedContent.split('\n').length}
          style={{ minHeight: '100px' }}
        />
      ) : (
        <pre className="text-white/90 text-sm p-4 overflow-x-auto whitespace-pre-wrap break-words font-mono">
          {editedContent}
        </pre>
      )}
    </div>
  );
}