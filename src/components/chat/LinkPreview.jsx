import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';

export default function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.data) {
          setPreview({
            title: data.data.title,
            description: data.data.description,
            image: data.data.image?.url,
            url: url
          });
        }
      } catch (error) {
        console.error('Error fetching link preview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/20 rounded-lg p-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
        <span className="text-sm text-white/50">Loading preview...</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
      >
        {url} <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white/5 border border-white/20 rounded-lg overflow-hidden hover:bg-white/10 transition-colors"
    >
      <div className="flex gap-3 p-3">
        {preview.image && (
          <div className="w-24 h-24 flex-shrink-0 rounded overflow-hidden bg-white/5">
            <img
              src={preview.image}
              alt={preview.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {preview.title && (
            <h4 className="font-semibold text-white text-sm mb-1 line-clamp-2">
              {preview.title}
            </h4>
          )}
          {preview.description && (
            <p className="text-white/70 text-xs line-clamp-2 mb-2">
              {preview.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-blue-400">
            <ExternalLink className="w-3 h-3" />
            Open
          </div>
        </div>
      </div>
    </a>
  );
}