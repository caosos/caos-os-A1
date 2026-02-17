import React, { useState, useEffect } from 'react';
import { Save, X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function MemoryPanel({ onClose }) {
  const [memoryContent, setMemoryContent] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    try {
      setLoading(true);
      // Try to get existing memory file
      const files = await base44.entities.UserFile.filter({
        name: 'permanent_memory.md',
        folder_path: '/'
      });

      if (files.length > 0) {
        const response = await fetch(files[0].url);
        const content = await response.text();
        setMemoryContent(content);
      } else {
        // Initialize with default
        const defaultContent = `# 🧠 CAOS Permanent Memories

Your lasting knowledge base. Pin important facts, preferences, and context here.
AI reads this every conversation automatically.

## Key Facts
- Add your important context here
- Use simple, clear language
- Organize by category

## Preferences
- Add what you like/dislike

## Context
- Add ongoing projects or goals
`;
        setMemoryContent(defaultContent);
      }
    } catch (error) {
      console.error('Error loading memory:', error);
      toast.error('Failed to load memory file');
    } finally {
      setLoading(false);
    }
  };

  const saveMemory = async () => {
    try {
      setSaving(true);

      // Check if file already exists
      const existingFiles = await base44.entities.UserFile.filter({
        name: 'permanent_memory.md',
        folder_path: '/'
      });

      // Create blob and file
      const blob = new Blob([memoryContent], { type: 'text/markdown' });
      const file = new File([blob], 'permanent_memory.md', { type: 'text/markdown' });

      // Upload
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      // Save/update in UserFile entity
      if (existingFiles.length > 0) {
        await base44.entities.UserFile.update(existingFiles[0].id, {
          url: uploadResult.file_url
        });
      } else {
        await base44.entities.UserFile.create({
          name: 'permanent_memory.md',
          url: uploadResult.file_url,
          type: 'file',
          folder_path: '/',
          mime_type: 'text/markdown'
        });
      }

      setEditing(false);
      toast.success('💾 Memory saved! AI will use this context.');

      // Reload content to show what was saved
      await loadMemory();
    } catch (error) {
      console.error('Error saving memory:', error);
      toast.error('Failed to save memory');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1f3d] border border-white/20 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Permanent Memories</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {editing ? (
            <>
              <textarea
                value={memoryContent}
                onChange={(e) => setMemoryContent(e.target.value)}
                className="flex-1 p-4 bg-white/5 border border-white/10 text-white placeholder-white/30 resize-none focus:outline-none focus:border-blue-400 font-mono text-sm"
                placeholder="Type your permanent memories here..."
              />
              <div className="flex gap-2 p-4 border-t border-white/10">
                <button
                  onClick={saveMemory}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <pre className="flex-1 p-4 bg-white/5 border border-white/10 text-white/90 overflow-auto font-mono text-sm whitespace-pre-wrap break-words">
                {memoryContent}
              </pre>
              <div className="flex gap-2 p-4 border-t border-white/10">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  ✏️ Edit
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-xs text-white/50">
          💡 AI loads this on every message. Pin facts, preferences, and context here.
        </div>
      </div>
    </div>
  );
}