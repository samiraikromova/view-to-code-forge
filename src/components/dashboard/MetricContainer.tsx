import { useRef, useEffect, useState } from "react";
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
  const [activeIndex, setActiveIndex] = useState(0);

  // Apply shimmer animation on mount
  useEffect(() => {
    if (containerRef.current) {
      const animations = ["shimmer-border-1", "shimmer-border-2", "shimmer-border-3"];
      const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
      const randomDuration = (2.5 + Math.random() * 1.5).toFixed(2);
      containerRef.current.style.animation = `${randomAnimation} ${randomDuration}s ease-in-out infinite`;
    }
  }, []);

  const activeMetric = metrics[activeIndex];
  const definition = metricDefinitions[activeMetric.key];

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]",
        "bg-surface/60 border border-border/40",
        className
      )}
    >
      {/* Metric tabs */}
      <div className="flex items-center gap-2 mb-3">
        {metrics.map((metric, index) => {
          const def = metricDefinitions[metric.key];
          return (
            <button
              key={metric.key}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "text-xs uppercase tracking-wider font-medium transition-colors",
                index === activeIndex
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              {def.shortLabel || def.label}
              {index < metrics.length - 1 && (
                <span className="ml-2 text-muted-foreground/50">|</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Value and trend */}
      <DelayedTooltip
        content={
          <div className="text-sm">
            <div>Previous: {formatMetricValue(activeMetric.key, activeMetric.data.previous)}</div>
            <div>
              Variance:{" "}
              {formatMetricValue(
                activeMetric.key,
                activeMetric.data.current - activeMetric.data.previous
              )}
            </div>
          </div>
        }
      >
        <div className="flex items-end gap-2 cursor-default">
          <span className="text-2xl font-bold text-foreground">
            {formatMetricValue(activeMetric.key, activeMetric.data.current)}
          </span>
          <TrendIndicator
            metricKey={activeMetric.key}
            current={activeMetric.data.current}
            previous={activeMetric.data.previous}
            className="mb-1"
          />
        </div>
      </DelayedTooltip>

      {/* Icon */}
      {definition.icon && (
        <div className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15">
          <definition.icon className="w-4 h-4 text-accent" />
        </div>
      )}
    </div>
  );
}
