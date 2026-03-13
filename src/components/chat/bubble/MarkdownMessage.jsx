import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

// Verbatim extraction of the ReactMarkdown block from ChatBubble.jsx — Commit 3
// No logic changes, no wrapper DOM changes, identical markdown component overrides.

const MarkdownMessage = React.memo(function MarkdownMessage({ content }) {
  return (
    <ReactMarkdown
      className="text-xs sm:text-sm max-w-full overflow-hidden"
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <div className="mb-2 sm:mb-3 leading-relaxed text-white/90 break-words">{children}</div>
        ),
        code: ({ inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <div className="relative group/code my-3 max-w-full">
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto max-w-full">
                <code className={className} {...props}>{children}</code>
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                onClick={() => {
                  navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                  toast.success('Code copied');
                }}
              >
                <Copy className="h-3 w-3 text-slate-400" />
              </Button>
            </div>
          ) : !inline ? (
            <div className="relative group/code my-3 max-w-full">
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto max-w-full whitespace-pre-wrap break-words">
                <code {...props}>{children}</code>
              </pre>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                onClick={() => {
                  navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                  toast.success('Code copied');
                }}
              >
                <Copy className="h-3 w-3 text-slate-400" />
              </Button>
            </div>
          ) : (
            <code className="px-2 py-1 rounded bg-white/10 text-white text-xs font-mono">
              {children}
            </code>
          );
        },
        a: ({ children, ...props }) => (
          <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{children}</a>
        ),
        ul: ({ children }) => <ul className="mb-3 ml-6 space-y-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 ml-6 space-y-1.5">{children}</ol>,
        li: ({ children }) => <li className="list-disc text-white/90">{children}</li>,
        h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-3 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1.5 text-white">{children}</h3>,
        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-white/80">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-white/30 pl-4 my-3 text-white/70 italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-4 border-white/20" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}