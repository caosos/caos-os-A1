import React from 'react';
import { getYouTubeId, getVimeoId } from './MessageHelpers';
import YouTubeEmbed from '../YouTubeEmbed';

// Verbatim extraction of the "Embedded Videos" render block — Commit 9
// URL extraction/cleaning logic stays in renderContent() in ChatBubble.
// No behavior changes, no markup changes.

export default function VideoEmbeds({ videoUrls }) {
  if (!videoUrls || videoUrls.length === 0) return null;

  return (
    <div className="space-y-3">
      {videoUrls.map((url, idx) => {
        const youtubeId = getYouTubeId(url);
        const vimeoId = getVimeoId(url);

        if (youtubeId) {
          return <YouTubeEmbed key={idx} videoId={youtubeId} url={url} />;
        }

        if (vimeoId) {
          return (
            <div key={idx} className="w-full rounded-xl overflow-hidden border border-white/20 shadow-lg">
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  src={`https://player.vimeo.com/video/${vimeoId}`}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}