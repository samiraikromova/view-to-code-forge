import { useState, useRef, KeyboardEvent } from "react";
import { ArrowUp, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Project } from "./ChatHeader";
import { ProjectSelector } from "./ProjectSelector";
import { ModelThinkingSelector } from "./ModelThinkingSelector";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message, files.length > 0 ? files : undefined);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

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
  const hasText = message.trim().length > 0;
  const hasContent = hasText || files.length > 0;
  return <div className={cn("w-full", !isEmptyState && "border-t border-border/50 bg-background p-6")}>
      <div className={cn(!isEmptyState && "mx-auto max-w-4xl")}>
        <div 
          className={cn(
            "relative rounded-3xl border border-border/50 bg-surface shadow-lg transition-all duration-200",
            isDragging && "border-accent bg-accent/5",
            "focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent focus-within:shadow-[0_0_20px_rgba(155,115,175,0.3)] focus-within:animate-shimmer-border"
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Top row - Text input full width */}
          <div className="px-4 pt-3">
            {files.length > 0 && <div className="mb-2 flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide">
                {files.map((file, index) => <div key={index} className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs text-foreground flex-shrink-0">
                    <Plus className="h-3 w-3" />
                    <span className="max-w-[200px] truncate">{file.name}</span>
                    <button onClick={() => setFiles(files.filter((_, i) => i !== index))} className="text-muted-foreground hover:text-foreground">
                      ×
                    </button>
                  </div>)}
              </div>}
            <Textarea ref={textareaRef} value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Enter a prompt" className="min-h-[32px] max-h-[200px] resize-none border-0 bg-transparent px-0 py-0 text-base focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground" disabled={disabled} />
          </div>

          {/* Bottom row - All buttons */}
          <div className="flex items-center justify-between pb-2 pt-1 px-1">
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
            <div className="gap-1 flex items-center justify-start px-0 py-0">
              <ModelThinkingSelector selectedModel={selectedModel} onSelectModel={onSelectModel} extendedThinking={extendedThinking} onToggleExtendedThinking={onToggleExtendedThinking} />
              <Button size="icon" className={cn("h-8 w-8 shrink-0 rounded-full transition-all flex items-center justify-center", hasContent ? "bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg" : "bg-surface-hover text-muted-foreground")} onClick={handleSend} disabled={!message.trim() || disabled}>
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>;
}