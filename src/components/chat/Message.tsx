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

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[80%] flex-col items-end">
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {message.content}
            </p>
          </div>
          <span className="mt-1 text-xs text-muted-foreground">{message.timestamp}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
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
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      <span className="mt-1 text-xs text-muted-foreground">{message.timestamp}</span>
    </div>
  );
}
