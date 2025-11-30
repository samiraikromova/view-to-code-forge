import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface Model {
  id: string;
  name: string;
  description: string;
}

const models: Model[] = [
  { id: "claude-opus-4", name: "Opus 4.1", description: "Most capable" },
  { id: "claude-sonnet-4-5", name: "Sonnet 4.5", description: "Best balance" },
  { id: "claude-haiku-4", name: "Haiku 4", description: "Fastest" },
];

interface ModelThinkingSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
}

export function ModelThinkingSelector({
  selectedModel,
  onSelectModel,
  extendedThinking,
  onToggleExtendedThinking,
}: ModelThinkingSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentModel = models.find((m) => m.id === selectedModel) || models[1];
  const displayText = extendedThinking ? "Thinking" : currentModel.name;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground"
      >
        <span>{displayText}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl border border-border bg-popover shadow-xl z-50">
          <div className="p-2">
            <div className="mb-1 px-2 text-xs font-medium text-muted-foreground">Models</div>
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onSelectModel(model.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-hover",
                  selectedModel === model.id && "bg-surface-hover"
                )}
              >
                <span className="text-sm font-medium text-foreground">{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </button>
            ))}
          </div>

          <Separator className="my-1" />

          <div className="p-2">
            <button
              onClick={() => {
                onToggleExtendedThinking();
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface-hover",
                extendedThinking && "bg-surface-hover"
              )}
            >
              <Sparkles className={cn("h-4 w-4", extendedThinking && "text-accent")} />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-foreground">Extended thinking</div>
                <div className="text-xs text-muted-foreground">Deep reasoning for complex tasks</div>
              </div>
              {extendedThinking && (
                <div className="h-2 w-2 rounded-full bg-accent" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
