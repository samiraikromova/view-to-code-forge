import { cn } from "@/lib/utils";

type ViewType = "metrics" | "usage";

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSelector({ currentView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="inline-flex items-center rounded-lg bg-surface/60 border border-border/50 p-1">
      <button
        onClick={() => onViewChange("metrics")}
        className={cn(
          "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
          currentView === "metrics"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Metrics
      </button>
      <button
        onClick={() => onViewChange("usage")}
        className={cn(
          "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
          currentView === "usage"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Usage
      </button>
    </div>
  );
}

export type { ViewType };
