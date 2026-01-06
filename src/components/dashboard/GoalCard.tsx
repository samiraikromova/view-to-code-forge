import { Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatMetricValue,
  metricDefinitions,
  getTimeframeLabel,
  getGoalTypeLabel,
} from "@/lib/dashboardUtils";
import { TrendIndicator } from "./TrendIndicator";
import { DelayedTooltip } from "./DelayedTooltip";
import type { Goal } from "@/types/dashboard";

interface GoalCardProps {
  goal: Goal;
  onRemove?: (id: string) => void;
  className?: string;
}

export function GoalCard({ goal, onRemove, className }: GoalCardProps) {
  const definition = metricDefinitions[goal.metricKey];
  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  const variance = goal.currentValue - goal.targetValue;
  const isAchieved = progress >= 100;

  return (
    <div
      className={cn(
        "group relative rounded-xl p-4 transition-all duration-300 holo-gradient",
        "bg-surface/60 border border-border/40 hover:border-border/60 hover:shadow-[0_0_20px_hsla(var(--primary),0.15)]",
        className
      )}
    >
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={() => onRemove(goal.id)}
          className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15">
          <Target className="w-4 h-4 text-accent" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">{definition.label}</div>
          <div className="text-xs text-muted-foreground">{getTimeframeLabel(goal.timeframe)}</div>
        </div>
      </div>

      {/* Current value with trend */}
      <DelayedTooltip
        content={
          <div className="text-sm">
            <div>Target: {formatMetricValue(goal.metricKey, goal.targetValue)}</div>
            <div>
              Variance: {variance >= 0 ? "+" : ""}
              {formatMetricValue(goal.metricKey, variance)}
            </div>
          </div>
        }
      >
        <div className="flex items-end gap-2 mb-3 cursor-default">
          <span className="text-xl font-bold text-foreground animate-metric-glow">
            {formatMetricValue(goal.metricKey, goal.currentValue)}
          </span>
          <TrendIndicator
            metricKey={goal.metricKey}
            current={goal.currentValue}
            previous={goal.previousValue}
            className="mb-0.5"
          />
        </div>
      </DelayedTooltip>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden mb-2">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
            isAchieved
              ? "bg-green-500"
              : "bg-gradient-to-r from-primary to-accent"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{getGoalTypeLabel(goal.goalType)}</span>
        <span className={cn("font-medium", isAchieved ? "text-green-500" : "text-muted-foreground")}>
          {progress.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
