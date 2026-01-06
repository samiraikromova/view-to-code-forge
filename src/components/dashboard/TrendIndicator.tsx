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
  size?: "sm" | "md";
}

export function TrendIndicator({
  metricKey,
  current,
  previous,
  className,
  showPercentage = true,
  size = "md",
}: TrendIndicatorProps) {
  const change = calculateChange(current, previous);
  const isPositive = isTrendPositive(metricKey, change);
  const isNeutral = Math.abs(change) < 0.5;

  if (isNeutral) return null;

  const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 font-medium",
        textSize,
        isPositive ? "text-green-500" : "text-red-500",
        className
      )}
    >
      {change > 0 ? (
        <ArrowUpRight className={iconSize} />
      ) : (
        <ArrowDownRight className={iconSize} />
      )}
      {showPercentage && <span>{Math.abs(change).toFixed(1)}%</span>}
    </div>
  );
}
