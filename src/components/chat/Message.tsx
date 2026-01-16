import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useState, useEffect } from "react";
import { Check, Copy, Loader2, Download, Trash2, FileIcon, X, ChevronDown, ChevronUp, FileJson, FileText, FileCode } from "lucide-react";
import { ImageModal } from "./ImageModal";
import { ScrollArea } from "@/components/ui/scroll-area";

// Thumbnail image with loading state for file attachments
function ImageThumbnail({ url, name }: { url: string; name: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="aspect-square rounded bg-surface-hover flex items-center justify-center overflow-hidden relative">
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-hover z-10">
          <Loader2 className="h-5 w-5 text-accent animate-spin" />
        </div>
      )}
      {hasError ? (
        <FileIcon className="h-6 w-6 text-muted-foreground" />
      ) : (
        <img
          src={url}
          alt={name}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
}

// File content viewer for JSON, text, code files (Claude-like expandable preview)
function FileContentViewer({ file }: { file: FileAttachment }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = file.name.toLowerCase();
  const isJson = fileName.endsWith('.json') || file.type === 'application/json';
  const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';
  const isText = fileName.endsWith('.txt') || file.type?.startsWith('text/');
  const isCode = /\.(js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|hpp|cs|php|swift|kt|scala|sh|bash|yaml|yml|toml|ini|cfg|conf|xml|html|htm|css|scss|sass|less|sql|md|mdx)$/i.test(fileName);
  
  const canPreview = isJson || isPdf || isText || isCode;
  
  const getFileIcon = () => {
    if (isJson) return <FileJson className="h-5 w-5 text-accent" />;
    if (isCode) return <FileCode className="h-5 w-5 text-primary" />;
    if (isText) return <FileText className="h-5 w-5 text-muted-foreground" />;
    return <FileIcon className="h-5 w-5 text-muted-foreground" />;
  };

  useEffect(() => {
    if (isExpanded && !content && !isPdf && canPreview) {
      setIsLoading(true);
      fetch(file.url)
        .then(res => res.text())
        .then(text => {
          if (isJson) {
            try {
              // Pretty print JSON
              const parsed = JSON.parse(text);
              setContent(JSON.stringify(parsed, null, 2));
            } catch {
              setContent(text);
            }
          } else {
            setContent(text);
          }
          setIsLoading(false);
        })
        .catch(err => {
          setError('Failed to load file content');
          setIsLoading(false);
        });
    }
  }, [isExpanded, file.url, content, isPdf, isJson, canPreview]);

  if (!canPreview) {
    // Non-previewable file - just show download link
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors">
        <FileIcon className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
          {file.size && (
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          )}
        </div>
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-background transition-colors"
        >
          <Download className="h-4 w-4 text-muted-foreground" />
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors"
      >
        {getFileIcon()}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
          {file.size && (
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded hover:bg-background transition-colors"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 text-accent animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-muted-foreground text-center">{error}</div>
          ) : isPdf ? (
            <iframe
              src={file.url}
              className="w-full h-[400px]"
              title={file.name}
            />
          ) : (
            <ScrollArea className="max-h-[400px]">
              <pre className={cn(
                "p-4 text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto",
                isJson && "text-accent"
              )}>
                <code>{content}</code>
              </pre>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

// Image component with loading state, hover actions, and modal view
interface ImageWithLoadingProps {
  url: string;
  idx: number;
  onDelete?: (url: string) => void;
}

function ImageWithLoading({ url, idx, onDelete }: ImageWithLoadingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(url);
  };

  return (
    <>
      <div 
        className="relative group/image rounded-lg overflow-hidden border border-border bg-surface cursor-pointer"
        onClick={handleImageClick}
      >
        {/* Loading state */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
        )}
        
        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
            <p className="text-sm text-muted-foreground">Failed to load image</p>
          </div>
        )}
        
        <img 
          src={url} 
          alt={`Generated image ${idx + 1}`} 
          className={cn(
            "w-full h-auto object-cover transition-opacity duration-500",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
        
        {/* Hover overlay with actions */}
        {!isLoading && !hasError && (
          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 rounded-full bg-surface border border-border hover:bg-primary hover:border-primary transition-colors"
            >
              {isDownloading ? (
                <Loader2 className="h-5 w-5 text-foreground animate-spin" />
              ) : (
                <Download className="h-5 w-5 text-foreground" />
              )}
            </button>
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 rounded-full bg-surface border border-border hover:bg-destructive hover:border-destructive transition-colors"
              >
                <Trash2 className="h-5 w-5 text-foreground" />
              </button>
            )}
            <span className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              View Full Size
            </span>
          </div>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        isOpen={isModalOpen}
        imageUrl={url}
        onClose={() => setIsModalOpen(false)}
        onDelete={onDelete ? () => onDelete(url) : undefined}
      />
    </>
  );
}

export interface FileAttachment {
  url: string;
  name: string;
  type?: string;
  size?: number;
}

interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrls?: string[];
  files?: FileAttachment[];
}

interface MessageProps {
  message: MessageData;
  onDeleteImage?: (url: string) => void;
}

// Custom purple syntax theme
const purpleTheme: any = {
  'code[class*="language-"]': {
    color: '#e0e0e0',
    background: '#8e4b9b',
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
    background: '#8e4b9b',
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
          background: '#8e4b9b',
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

export function Message({ message, onDeleteImage }: MessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isImageFile = (type?: string, name?: string) => {
    if (type?.startsWith('image/')) return true;
    if (name) {
      return /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(name);
    }
    return false;
  };
  
  if (isUser) {
    const imageFiles = message.files?.filter(f => isImageFile(f.type, f.name)) || [];
    const otherFiles = message.files?.filter(f => !isImageFile(f.type, f.name)) || [];
    return (
      <div className="flex justify-end">
        <div className="group flex max-w-[80%] flex-col items-end">
          {/* Image file attachments - thumbnails */}
          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 justify-end">
              {imageFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="relative flex-shrink-0 w-[100px] rounded-lg border border-border bg-surface hover:bg-surface-hover transition-all duration-200 p-1.5 cursor-pointer"
                  onClick={() => setPreviewFile(file)}
                >
                  <ImageThumbnail url={file.url} name={file.name} />
                  <p className="text-[10px] font-medium text-foreground truncate mt-1 leading-tight" title={file.name}>
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {/* Other files (JSON, PDF, text, code) - Claude-like expandable preview */}
          {otherFiles.length > 0 && (
            <div className="w-full space-y-2 mb-2">
              {otherFiles.map((file, idx) => (
                <FileContentViewer key={idx} file={file} />
              ))}
            </div>
          )}
          
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
        
        {/* File preview modal */}
        {previewFile && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md"
            onClick={() => setPreviewFile(null)}
          >
            <div 
              className="relative max-w-[90vw] max-h-[90vh] animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewFile(null)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-surface border border-border hover:bg-surface-hover transition-colors z-10"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
              
              {isImageFile(previewFile.type, previewFile.name) ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
                />
              ) : (
                <div className="bg-surface border border-border rounded-lg p-8 max-w-lg">
                  <FileIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium text-center">{previewFile.name}</p>
                  <a 
                    href={previewFile.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 block text-center text-accent hover:underline"
                  >
                    Open file
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Check for image URLs in assistant messages - deduplicate
  const rawImageUrls = message.imageUrls || extractImageUrls(message.content);
  const imageUrls = [...new Set(rawImageUrls)]; // Remove duplicates
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
              <ImageWithLoading key={idx} url={url} idx={idx} onDelete={onDeleteImage} />
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
