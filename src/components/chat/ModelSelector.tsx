import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ModelSelectorProps {
  selected: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selected) || models[1];

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
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-hover"
      >
        <span className="text-sm text-foreground">{selectedModel.name}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-popover shadow-xl">
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onChange(model.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-surface-hover first:rounded-t-lg last:rounded-b-lg",
                selected === model.id && "bg-surface-hover"
              )}
            >
              <span className="text-sm font-medium text-foreground">{model.name}</span>
              <span className="text-xs text-muted-foreground">{model.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}