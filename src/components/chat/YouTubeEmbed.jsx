import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';

export default function YouTubeEmbed({ videoId, url }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!videoId) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;

  return (
    <>
      {/* Embedded iframe — click to expand */}
      <div
        className="w-full rounded-xl overflow-hidden border border-white/20 shadow-lg hover:shadow-xl transition-shadow cursor-pointer group relative"
        onClick={() => setIsExpanded(true)}
      >
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            src={embedUrl}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {/* Expand button on hover */}
        <button
          className="absolute top-2 right-2 p-2 bg-black/60 rounded hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          title="Expand fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Fullscreen modal */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setIsExpanded(false)}>
          <div className="w-full max-w-6xl aspect-video relative" onClick={(e) => e.stopPropagation()}>
            <iframe
              className="w-full h-full rounded-lg"
              src={embedUrl}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              className="absolute top-2 right-2 p-2 bg-black/60 rounded hover:bg-black/80"
              onClick={() => setIsExpanded(false)}
              title="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}