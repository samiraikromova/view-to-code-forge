import { BarChart3, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewType } from "@/types/dashboard";

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
          "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
          currentView === "metrics"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <BarChart3 className="w-4 h-4" />
        Metrics
      </button>
      <button
        onClick={() => onViewChange("leaderboard")}
        className={cn(
          "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
          currentView === "leaderboard"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Users className="w-4 h-4" />
        Leaderboard
      </button>
    </div>
  );
}

export type { ViewType };
