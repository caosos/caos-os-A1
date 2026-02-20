import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function ThreadSummary({ conversationId, summary, keywords, onSummaryUpdate }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateThreadSummary', {
        conversation_id: conversationId
      });

      if (response.data.success) {
        onSummaryUpdate?.({
          summary: response.data.summary,
          keywords: response.data.keywords
        });
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!summary && keywords?.length === 0) {
    return (
      <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-4">
        <p className="text-white/70 text-sm mb-3">No summary yet</p>
        <Button
          onClick={generateSummary}
          disabled={isGenerating}
          size="sm"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          Generate Summary
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-4 space-y-3">
      {summary && (
        <div>
          <h4 className="text-white font-medium text-sm mb-2 flex items-center justify-between">
            Summary
            <button
              onClick={generateSummary}
              disabled={isGenerating}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Regenerate"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white/60 ${isGenerating ? 'animate-spin' : ''}`} />
            </button>
          </h4>
          <p className="text-white/70 text-xs leading-relaxed">{summary}</p>
        </div>
      )}
      
      {keywords && keywords.length > 0 && (
        <div>
          <p className="text-white/60 text-xs font-medium mb-2">Topics & Keywords</p>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="text-xs bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/30"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}