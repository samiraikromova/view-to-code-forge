import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
interface Model {
  id: string;
  name: string;
  description: string;
}
const models: Model[] = [{
  id: "claude-opus-4",
  name: "Opus 4.5",
  description: "Most capable for complex work"
}, {
  id: "claude-sonnet-4-5",
  name: "Sonnet 4.5",
  description: "Best balance"
}, {
  id: "claude-haiku-4",
  name: "Haiku 4.5",
  description: "Fastest"
}];
interface ModelThinkingSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  extendedThinking: boolean;
  onToggleExtendedThinking: () => void;
}
export function ModelThinkingSelector({
  selectedModel,
  onSelectModel
}: ModelThinkingSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentModel = models.find(m => m.id === selectedModel) || models[1];
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="h-8 px-3 rounded-md flex items-center gap-2 text-sm text-muted-foreground transition-all hover:bg-surface-hover hover:text-foreground">
        <span>{currentModel.name}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && <div className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-border bg-popover shadow-xl z-50">
          <div className="p-1.5">
            
            {models.map(model => <button key={model.id} onClick={() => {
          onSelectModel(model.id);
          setOpen(false);
        }} className={cn("flex w-full flex-col rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-hover", selectedModel === model.id && "bg-surface-hover")}>
                <span className="text-sm font-medium text-foreground">{model.name}</span>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </button>)}
          </div>
        </div>}
    </div>;
}