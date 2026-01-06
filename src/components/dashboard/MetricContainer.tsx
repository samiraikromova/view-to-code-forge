import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatMetricValue, metricDefinitions } from "@/lib/dashboardUtils";
import { TrendIndicator } from "./TrendIndicator";
import { DelayedTooltip } from "./DelayedTooltip";
import type { MetricKey, MetricValue } from "@/types/dashboard";

interface MetricContainerProps {
  metrics: Array<{
    key: MetricKey;
    data: MetricValue;
  }>;
  className?: string;
}

export function MetricContainer({ metrics, className }: MetricContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply shimmer animation on mount with random variation
  useEffect(() => {
    if (containerRef.current) {
      const animations = ["shimmer-border-1", "shimmer-border-2", "shimmer-border-3"];
      const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
      const randomDuration = (2.5 + Math.random() * 1.5).toFixed(2);
      const randomDelay = (Math.random() * 2).toFixed(2);
      containerRef.current.style.animation = `${randomAnimation} ${randomDuration}s ease-in-out ${randomDelay}s infinite`;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-xl p-4 transition-all duration-300 hover:scale-[1.02]",
        "bg-surface/60 border border-border/40",
        className
      )}
    >
      {/* All metrics displayed side by side */}
      <div className="flex items-start gap-0">
        {metrics.map((metric, index) => {
          const def = metricDefinitions[metric.key];
          return (
            <div key={metric.key} className="flex items-start">
              {/* Metric content */}
              <div className="flex flex-col min-w-0">
                {/* Label */}
                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
                  {def.shortLabel || def.label}
                </span>
                
                {/* Value and trend */}
                <DelayedTooltip
                  content={
                    <div className="text-sm">
                      <div>Previous: {formatMetricValue(metric.key, metric.data.previous)}</div>
                      <div>
                        Variance:{" "}
                        {formatMetricValue(
                          metric.key,
                          metric.data.current - metric.data.previous
                        )}
                      </div>
                    </div>
                  }
                >
                  <div className="flex items-center gap-1.5 cursor-default">
                    <span className="text-lg font-bold text-foreground">
                      {formatMetricValue(metric.key, metric.data.current)}
                    </span>
                    <TrendIndicator
                      metricKey={metric.key}
                      current={metric.data.current}
                      previous={metric.data.previous}
                      size="sm"
                    />
                  </div>
                </DelayedTooltip>
              </div>

              {/* Divider between metrics */}
              {index < metrics.length - 1 && (
                <div className="mx-3 h-10 w-px bg-border/50 self-center" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
