import { useState, useRef, KeyboardEvent } from "react";
import { Send, Plus, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Project } from "./ChatHeader";
import { ProjectSelector } from "./ProjectSelector";
import { ModelThinkingSelector } from "./ModelThinkingSelector";

const mockProjects: Project[] = [
  {
    id: "cb4",
    name: "CB4 (Cam's Brain)",
    icon: "🧠",
    description: "Vector search integration with personal knowledge base",
  },
  {
    id: "contract",
    name: "Contract Writer",
    icon: "📄",
    description: "Generate professional contracts and legal documents",
  },
  {
    id: "ad-writing",
    name: "Ad Writing",
    icon: "📢",
    description: "Create compelling ad copy for various platforms",
  },
  {
    id: "sales-review",
    name: "Sales Call Review",
    icon: "📞",
    description: "Analyze and summarize sales call transcripts",
  },
];

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message, files.length > 0 ? files : undefined);
      setMessage("");
      setFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
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
      setFiles(Array.from(e.target.files));
    }
  };

  const hasText = message.trim().length > 0;
  const hasContent = hasText || files.length > 0;

  return (
    <div className={cn("w-full", !isEmptyState && "border-t border-border/50 bg-background p-6")}>
      <div className={cn(!isEmptyState && "mx-auto max-w-4xl")}>
        <div className="relative rounded-3xl border border-border/50 bg-surface shadow-lg">
          {/* Top row - Text input full width */}
          <div className="px-4 pt-4">
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="max-w-[200px] truncate">{file.name}</span>
                    <button
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a prompt"
              className="min-h-[48px] max-h-[200px] resize-none border-0 bg-transparent px-0 py-0 text-base focus-visible:ring-0 placeholder:text-muted-foreground"
              disabled={disabled}
            />
          </div>

          {/* Bottom row - All buttons */}
          <div className="flex items-center justify-between px-3 pb-3 pt-2">
            {/* Left controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full hover:bg-surface-hover"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="*/*"
              />
              <ProjectSelector
                projects={mockProjects}
                selected={selectedProject}
                onChange={onSelectProject}
              />
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              <ModelThinkingSelector
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                extendedThinking={extendedThinking}
                onToggleExtendedThinking={onToggleExtendedThinking}
              />
              <Button
                size="icon"
                className={cn(
                  "h-10 w-10 shrink-0 rounded-full transition-all",
                  hasContent 
                    ? "bg-accent text-accent-foreground hover:bg-accent-hover shadow-lg" 
                    : "bg-surface-hover text-muted-foreground"
                )}
                onClick={handleSend}
                disabled={!message.trim() || disabled}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}