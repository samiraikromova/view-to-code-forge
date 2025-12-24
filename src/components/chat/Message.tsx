import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrls?: string[];
}

interface MessageProps {
  message: MessageData;
}

// Custom purple syntax theme
const purpleTheme: any = {
  'code[class*="language-"]': {
    color: '#e0e0e0',
    background: 'hsl(300, 8%, 12%)',
    fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    tabSize: 2,
    hyphens: 'none',
  },
  'pre[class*="language-"]': {
    color: '#e0e0e0',
    background: 'hsl(300, 8%, 12%)',
    fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    textAlign: 'left',
    whiteSpace: 'pre',
    wordSpacing: 'normal',
    wordBreak: 'normal',
    wordWrap: 'normal',
    tabSize: 2,
    hyphens: 'none',
    padding: '1rem',
    margin: '0',
    overflow: 'auto',
  },
  'comment': { color: '#7c7c7c', fontStyle: 'italic' },
  'prolog': { color: '#7c7c7c' },
  'doctype': { color: '#7c7c7c' },
  'cdata': { color: '#7c7c7c' },
  'punctuation': { color: '#b8b8b8' },
  'property': { color: '#a78bba' },
  'tag': { color: '#a78bba' },
  'boolean': { color: '#5ec9a5' },
  'number': { color: '#5ec9a5' },
  'constant': { color: '#5ec9a5' },
  'symbol': { color: '#5ec9a5' },
  'deleted': { color: '#e06c75' },
  'selector': { color: '#c678dd' },
  'attr-name': { color: '#a78bba' },
  'string': { color: '#d5a6e0' },
  'char': { color: '#d5a6e0' },
  'builtin': { color: '#c678dd' },
  'inserted': { color: '#5ec9a5' },
  'operator': { color: '#b8b8b8' },
  'entity': { color: '#d19a66', cursor: 'help' },
  'url': { color: '#d5a6e0' },
  'variable': { color: '#e0e0e0' },
  'atrule': { color: '#c678dd' },
  'attr-value': { color: '#d5a6e0' },
  'function': { color: '#c678dd' },
  'class-name': { color: '#e5c07b' },
  'keyword': { color: '#a78bba' },
  'regex': { color: '#e06c75' },
  'important': { color: '#e06c75', fontWeight: 'bold' },
  'bold': { fontWeight: 'bold' },
  'italic': { fontStyle: 'italic' },
};

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper my-4">
      <div className="code-block-header">
        <span className="text-muted-foreground">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="copy-button flex items-center gap-1.5"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={purpleTheme}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: 'hsl(300, 8%, 12%)',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

// Helper function to extract image URLs from text content
function extractImageUrls(content: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s<>"{}|\\^`\[\]]*)?)/gi;
  return content.match(urlRegex) || [];
}

// Helper to check if content is primarily image URLs
function isImageResponse(content: string): boolean {
  const imageUrls = extractImageUrls(content);
  if (imageUrls.length === 0) return false;
  // If the content is mostly URLs (remove URLs and check remaining text length)
  const textWithoutUrls = imageUrls.reduce((text, url) => text.replace(url, ''), content).trim();
  return textWithoutUrls.length < 100; // If minimal text remains, it's an image response
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="group flex max-w-[80%] flex-col items-end">
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message.content}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-muted-foreground">{message.timestamp}</span>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Copy message"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check for image URLs in assistant messages
  const imageUrls = message.imageUrls || extractImageUrls(message.content);
  const hasImages = imageUrls.length > 0;
  const isMainlyImages = isImageResponse(message.content);

  // If this is primarily an image response, render images prominently
  if (hasImages && isMainlyImages) {
    return (
      <div className="group flex flex-col">
        <div className="space-y-4">
          {/* Render any text that's not a URL */}
          {message.content.split(/https?:\/\/[^\s]+/g).filter(text => text.trim()).map((text, idx) => (
            <p key={idx} className="text-sm text-foreground">{text.trim()}</p>
          ))}
          {/* Render images in a grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {imageUrls.map((url, idx) => (
              <div key={idx} className="relative group/image rounded-lg overflow-hidden border border-border bg-surface">
                <img 
                  src={url} 
                  alt={`Generated image ${idx + 1}`} 
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Open Full Size
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Copy message"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col">
      <div className="markdown-content w-full">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              const value = String(children).replace(/\n$/, '');

              return !inline ? (
                <CodeBlock language={language} value={value} />
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            img({ src, alt }) {
              return (
                <div className="my-4 rounded-lg overflow-hidden border border-border">
                  <img src={src} alt={alt || 'Image'} className="w-full h-auto" loading="lazy" />
                </div>
              );
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-muted-foreground">{message.timestamp}</span>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy message"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
