// MessageContent.jsx — Verbatim extraction of renderContent() from ChatBubble.jsx
// PR2-A, Mar 7, 2026. DOM-root parity: top-level div.space-y-3 preserved exactly.

import React from 'react';
import { Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getYouTubeId, extractUrls, isVideoUrl, extractFilename } from './MessageHelpers';
import MarkdownMessage from './MarkdownMessage';
import Attachments from './Attachments';
import GeneratedFiles from './GeneratedFiles';
import VideoEmbeds from './VideoEmbeds';
import RecallResults from './RecallResults';
import CopyBlock from '@/components/chat/CopyBlock';
import YouTubeEmbed from '@/components/chat/YouTubeEmbed';
import MemorySaveIndicator, { hasMemorySave, stripMemoryMarker } from './MemorySaveIndicator';

export default function MessageContent({ message, isUser, downloadFile }) {
  // Hook must be declared before any early returns (Rules of Hooks)
  const [repoExpanded, setRepoExpanded] = React.useState(false);

  // ── STREAMING FAST PATH ───────────────────────────────────────────────────
  if (message.streaming) {
    return (
      <div className="space-y-3">
        <div className="text-xs sm:text-sm leading-relaxed text-white/90 whitespace-pre-wrap break-words">
          {message.content || ''}
          <span className="inline-block w-[2px] h-[1em] bg-blue-400 ml-[1px] align-middle animate-pulse" />
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  let content = message.content || '';
  const showMemoryBadge = !isUser && hasMemorySave(content);
  if (showMemoryBadge) content = stripMemoryMarker(content);

  if (content && content.includes('WROTE:')) {
    content = content.replace(/WROTE:[a-f0-9-]+/g, '').trim();
  }

  // Extract bare YouTube URLs on their own line
  const bareYouTubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|shorts\/)([^&?\s]+)$/gm;
  const bareYouTubeUrls = [];
  let bareMatch;
  const bareYouTubeRegexGlobal = new RegExp(bareYouTubeRegex.source, 'gm');
  while ((bareMatch = bareYouTubeRegexGlobal.exec(content)) !== null) {
    bareYouTubeUrls.push(bareMatch[0]);
  }

  const urls = extractUrls(content || '');
  const videoUrls = [...new Set([...urls, ...bareYouTubeUrls])].filter(isVideoUrl);

  let cleanContent = content;
  videoUrls.forEach(url => {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const markdownLinkRegex = new RegExp(`\\[([^\\]]+)\\]\\(${escapedUrl}\\)`, 'g');
    cleanContent = cleanContent.replace(markdownLinkRegex, '');
    const bareLineRegex = new RegExp(`^\\s*${escapedUrl}\\s*$`, 'gm');
    cleanContent = cleanContent.replace(bareLineRegex, '');
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
    if (filename) fileBlocks.push({ filename, content: fileContent });
  }

  const attachedFiles = message.file_urls || [];

  if (youtubeMatches && !isUser) {
    return (
      <div className="space-y-3">
        {youtubeMatches.map((m, index) => {
          const url = m.replace('[YOUTUBE:', '').replace(']', '');
          const videoId = getYouTubeId(url);
          content = content.replace(m, '');
          if (videoId) return <YouTubeEmbed key={index} videoId={videoId} url={url} />;
          return null;
        })}
        {content.trim() && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content.trim()}</p>
        )}
      </div>
    );
  }

  // ── Repo chunk "Next chunk" button — driven by structured message.repo_tool ──
  const nextChunk = !isUser && message.repo_tool?.op === 'read' && message.repo_tool?.done === false
    ? { path: message.repo_tool.path, offset: message.repo_tool.next_offset }
    : null;

  // ── REPO OUTPUT GUARD ─────────────────────────────────────────────────────
  const REPO_SNIPPET_LIMIT = 800;
  const PLAIN_TEXT_SNIPPET_LIMIT = 2000;
  const isRepoOutput = !isUser && message.repo_tool && typeof message.repo_tool === 'object';

  let displayContent = cleanContent?.trim() || '';
  let repoTruncated = false;

  const isLargePlainAssistantOutput =
    !isUser &&
    !isRepoOutput &&
    displayContent.length > PLAIN_TEXT_SNIPPET_LIMIT;

  if (isRepoOutput && displayContent.length > REPO_SNIPPET_LIMIT && !repoExpanded) {
    displayContent = displayContent.slice(0, REPO_SNIPPET_LIMIT);
    repoTruncated = true;
  } else if (isLargePlainAssistantOutput && !repoExpanded) {
    displayContent = displayContent.slice(0, PLAIN_TEXT_SNIPPET_LIMIT);
    repoTruncated = true;
  }

  return (
    <div className="space-y-3">
      <VideoEmbeds videoUrls={videoUrls} />
      <RecallResults recallResults={message.recall_results} />
      {displayContent && (
        <MarkdownMessage content={displayContent} />
      )}
      {repoTruncated && (
        <button
          onClick={() => setRepoExpanded(true)}
          className="text-xs text-blue-400 hover:text-blue-300 underline mt-1"
        >
          Show full output…
        </button>
      )}
      {nextChunk && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs text-blue-300 border-blue-400/40 bg-blue-500/10 hover:bg-blue-500/20 hover:text-blue-200 gap-1.5"
          onClick={() => window.dispatchEvent(new CustomEvent('caos:repoNextChunk', {
            detail: { path: nextChunk.path, offset: nextChunk.offset }
          }))}
        >
          <ChevronRight className="w-3.5 h-3.5" />
          Load next chunk
        </Button>
      )}
      {copyBlocks.map((block, index) => (
        <CopyBlock key={index} content={block.content} title={block.title} />
      ))}
      {showMemoryBadge && <MemorySaveIndicator content={message.content} />}
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