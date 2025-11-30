import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { ArrowUp, Plus, Clock, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Project } from "./ChatHeader";
import { ProjectSelector } from "./ProjectSelector";
import { ModelThinkingSelector } from "./ModelThinkingSelector";
import { FilePreviewModal } from "./FilePreviewModal";
const mockProjects: Project[] = [{
  id: "cb4",
  name: "CB4 (Cam's Brain)",
  icon: "🧠",
  description: "Vector search integration with personal knowledge base"
}, {
  id: "copywriting",
  name: "Copywriting Assistant",
  icon: "✍️",
  description: "Generate engaging copy for marketing materials"
}, {
  id: "contract",
  name: "Contract Writer",
  icon: "📄",
  description: "Generate professional contracts and legal documents"
}, {
  id: "sales-review",
  name: "Sales Call Transcript Review",
  icon: "📞",
  description: "Analyze and summarize sales call transcripts"
}, {
  id: "ad-writing",
  name: "Ad Writing",
  icon: "📢",
  description: "Create compelling ad copy for various platforms"
}, {
  id: "image-gen",
  name: "Image Ad Generator",
  icon: "🎨",
  description: "Generate images for advertisements"
}, {
  id: "hooks",
  name: "AI Hooks Generator",
  icon: "🎣",
  description: "Create attention-grabbing hooks for content"
}, {
  id: "documentation",
  name: "Documentation",
  icon: "📚",
  description: "Generate and manage technical documentation"
}];
interface ChatInputProps {
  onSendMessage: (content: string, files?: File[]) => void;
  disabled?: boolean;
  selectedProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
  isEmptyState?: boolean;
}
export function ChatInput({
  onSendMessage,
  disabled,
  selectedProject,
  onSelectProject,
  selectedModel,
  onSelectModel,
  extendedThinking,
  onToggleExtendedThinking,
  isEmptyState = false
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message, files.length > 0 ? files : undefined);
      setMessage("");
      setFiles([]);
      setIsFullScreen(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // approximate line height
      const lines = Math.floor(scrollHeight / lineHeight);
      setLineCount(lines);
      
      // Max 7 lines before scrolling
      const maxHeight = lineHeight * 7;
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles([...files, ...droppedFiles]);
    }
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleReorderFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...files];
    const [removed] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, removed);
    setFiles(newFiles);
  };
  const hasText = message.trim().length > 0;
  const hasContent = hasText || files.length > 0;
  
  return (
    <>
      <FilePreviewModal
        files={files}
        open={showFilePreview}
        onOpenChange={setShowFilePreview}
        onRemove={handleRemoveFile}
        onReorder={handleReorderFile}
      />
      
      <div className={cn(
        "w-full",
        !isEmptyState && "border-t border-border/50 bg-background p-6",
        isFullScreen && "fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-6"
      )}>
        <div className={cn(!isEmptyState && !isFullScreen && "mx-auto max-w-2xl", isFullScreen && "w-full max-w-2xl")}>
          <div 
            className={cn(
              "relative rounded-3xl border border-border/50 bg-surface shadow-lg transition-all duration-500",
              isDragging && "border-accent bg-accent/5",
              "focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent transition-shadow"
            )}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
          {/* Top row - Text input with fullscreen button */}
          <div className="px-4 pt-2 relative">
            {files.length > 0 && (
              <button
                onClick={() => setShowFilePreview(true)}
                className="mb-2 flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs text-foreground hover:bg-accent/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>{files.length} file{files.length > 1 ? 's' : ''} attached</span>
              </button>
            )}
            <Textarea 
              ref={textareaRef} 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              onKeyDown={handleKeyDown} 
              placeholder="Enter a prompt" 
              rows={1}
              className="min-h-[24px] max-h-[168px] resize-none border-0 bg-transparent px-0 py-0 text-sm focus-visible:ring-0 focus-visible:outline-none outline-none ring-0 placeholder:text-xs placeholder:text-muted-foreground overflow-y-auto" 
              disabled={disabled} 
            />
            {lineCount >= 3 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setIsFullScreen(!isFullScreen)}
              >
                {isFullScreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Bottom row - All buttons */}
          <div className="flex items-center justify-between pb-3 pt-2 px-3">
            {/* Left controls */}
            <div className="flex items-center gap-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full hover:bg-surface-hover" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </Button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="*/*" />
              <ProjectSelector projects={mockProjects} selected={selectedProject} onChange={onSelectProject} />
              <Button variant="ghost" size="icon" className={cn("h-8 w-8 shrink-0 rounded-full hover:bg-surface-hover transition-colors", extendedThinking ? "text-accent" : "text-muted-foreground")} onClick={onToggleExtendedThinking} disabled={disabled}>
                <Clock className="h-4 w-4" />
              </Button>
            </div>

            {/* Right controls */}
            <div className="gap-3 flex items-center justify-start px-0 py-0">
              <ModelThinkingSelector selectedModel={selectedModel} onSelectModel={onSelectModel} extendedThinking={extendedThinking} onToggleExtendedThinking={onToggleExtendedThinking} />
              <Button size="icon" className={cn("h-8 w-8 shrink-0 rounded-full transition-all flex items-center justify-center", hasContent ? "bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg" : "bg-surface-hover text-muted-foreground")} onClick={handleSend} disabled={!message.trim() || disabled}>
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}