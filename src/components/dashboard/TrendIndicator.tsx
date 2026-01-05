import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateChange, isTrendPositive } from "@/lib/dashboardUtils";
import type { MetricKey } from "@/types/dashboard";

interface TrendIndicatorProps {
  metricKey: MetricKey;
  current: number;
  previous: number;
  className?: string;
  showPercentage?: boolean;
}

export function TrendIndicator({
  metricKey,
  current,
  previous,
  className,
  showPercentage = true,
}: TrendIndicatorProps) {
  const change = calculateChange(current, previous);
  const isPositive = isTrendPositive(metricKey, change);
  const isNeutral = Math.abs(change) < 0.5;

  if (isNeutral) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        isPositive ? "text-green-500" : "text-red-500",
        className
      )}
    >
      {change > 0 ? (
        <ArrowUpRight className="w-3 h-3" />
      ) : (
        <ArrowDownRight className="w-3 h-3" />
      )}
      {showPercentage && <span>{Math.abs(change).toFixed(1)}%</span>}
    </div>
  );
}
