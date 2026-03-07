// MessageContent.jsx — Verbatim extraction of renderContent() from ChatBubble.jsx
// PR2-A, Mar 7, 2026. DOM-root parity: top-level div.space-y-3 preserved exactly.
// No logic changes from source.

import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getYouTubeId, extractUrls, isVideoUrl, extractFilename } from './MessageHelpers';
import MarkdownMessage from './MarkdownMessage';
import Attachments from './Attachments';
import GeneratedFiles from './GeneratedFiles';
import VideoEmbeds from './VideoEmbeds';
import RecallResults from './RecallResults';
import CopyBlock from '@/components/chat/CopyBlock';
import YouTubeEmbed from '@/components/chat/YouTubeEmbed';

export default function MessageContent({ message, isUser, downloadFile }) {
  let content = message.content || '';

  if (content && content.includes('WROTE:')) {
    content = content.replace(/WROTE:[a-f0-9-]+/g, '').trim();
  }

  const urls = extractUrls(content || '');
  const videoUrls = urls.filter(isVideoUrl);

  let cleanContent = content;
  videoUrls.forEach(url => {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const markdownLinkRegex = new RegExp(`\\[([^\\]]+)\\]\\(${escapedUrl}\\)`, 'g');
    cleanContent = cleanContent.replace(markdownLinkRegex, '');
    cleanContent = cleanContent.replace(url, '');
  });
  cleanContent = cleanContent.trim();

  const youtubeMatches = content ? content.match(/\[YOUTUBE:(.*?)\]/g) : null;

  const copyBlockRegex = /```(?:copy|copyblock)(?:\s+title:([^\n]+))?\n([\s\S]*?)```/g;
  const copyBlocks = [];
  let copyMatch;
  while ((copyMatch = copyBlockRegex.exec(message.content || '')) !== null) {
    const title = copyMatch[1]?.trim();
    const blockContent = copyMatch[2];
    copyBlocks.push({ title, content: blockContent });
    content = content.replace(copyMatch[0], '');
  }

  const codeBlockRegex = /```(filename:[^\n]+)\n([\s\S]*?)```/g;
  const fileBlocks = [];
  let match;
  while ((match = codeBlockRegex.exec(message.content || '')) !== null) {
    const filename = extractFilename(match[1]);
    const fileContent = match[2];
    if (filename) {
      fileBlocks.push({ filename, content: fileContent });
    }
  }

  const attachedFiles = message.file_urls || [];

  if (youtubeMatches && !isUser) {
    return (
      <div className="space-y-3">
        {youtubeMatches.map((m, index) => {
          const url = m.replace('[YOUTUBE:', '').replace(']', '');
          const videoId = getYouTubeId(url);
          content = content.replace(m, '');
          if (videoId) {
            return <YouTubeEmbed key={index} videoId={videoId} url={url} />;
          }
          return null;
        })}
        {content.trim() && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content.trim()}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <VideoEmbeds videoUrls={videoUrls} />

      <RecallResults recallResults={message.recall_results} />

      {cleanContent && cleanContent.trim() && (
        <MarkdownMessage content={cleanContent.trim()} />
      )}

      {copyBlocks.map((block, index) => (
        <CopyBlock key={index} content={block.content} title={block.title} />
      ))}

      <Attachments fileUrls={attachedFiles} />

      <GeneratedFiles files={message.generated_files} downloadFile={downloadFile} />

      {fileBlocks.map((file, index) => (
        <div key={index} className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-lg px-3 py-2">
          <span className="text-sm text-white/80 flex-1">{file.filename}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => downloadFile(file.content, file.filename)}
            className="h-8 px-3 text-blue-400 hover:text-blue-300 hover:bg-white/10"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}