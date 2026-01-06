import { useRef, useEffect, CSSProperties } from "react";
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
  style?: CSSProperties;
  onMetricClick?: (metricKey: MetricKey) => void;
  selectedMetric?: MetricKey;
}

export function MetricContainer({ 
  metrics, 
  className, 
  style,
  onMetricClick,
  selectedMetric 
}: MetricContainerProps) {
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
      style={style}
      className={cn(
        "rounded-xl p-3 transition-all duration-300 hover:scale-[1.01]",
        "bg-surface/60 border border-border/40",
        className
      )}
    >
      {/* All metrics displayed side by side */}
      <div className="flex items-center">
        {metrics.map((metric, index) => {
          const def = metricDefinitions[metric.key];
          const isSelected = selectedMetric === metric.key;
          const isClickable = !!onMetricClick;
          
          return (
            <div key={metric.key} className="flex items-center justify-center flex-1">
              {/* Metric content */}
              <div 
                className={cn(
                  "flex flex-col items-center min-w-0 flex-1",
                  isClickable && "cursor-pointer",
                  isSelected && "ring-1 ring-primary rounded-md p-1 -m-1"
                )}
                onClick={() => onMetricClick?.(metric.key)}
              >
                {/* Label with tooltip */}
                <DelayedTooltip
                  content={
                    <div className="text-xs max-w-[200px]">
                      <div className="font-medium">{def.shortLabel} — {def.label}</div>
                      {def.description && (
                        <div className="text-muted-foreground mt-1">{def.description}</div>
                      )}
                      {isClickable && (
                        <div className="text-primary mt-1 text-[10px]">Click to view in chart</div>
                      )}
                    </div>
                  }
                >
                  <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-0.5 cursor-help">
                    {def.shortLabel || def.label}
                  </span>
                </DelayedTooltip>
                
                {/* Value and trend with separate tooltip */}
                <div className="flex items-center justify-center gap-1">
                  <span className="text-base font-bold text-foreground">
                    {formatMetricValue(metric.key, metric.data.current)}
                  </span>
                  <DelayedTooltip
                    content={
                      <div className="text-xs">
                        <div className="text-muted-foreground">
                          Previous: {formatMetricValue(metric.key, metric.data.previous)}
                        </div>
                        <div className="text-muted-foreground">
                          Change: {formatMetricValue(metric.key, metric.data.current - metric.data.previous)}
                        </div>
                      </div>
                    }
                  >
                    <div>
                      <TrendIndicator
                        metricKey={metric.key}
                        current={metric.data.current}
                        previous={metric.data.previous}
                        size="sm"
                      />
                    </div>
                  </DelayedTooltip>
                </div>
              </div>

              {/* Divider between metrics */}
              {index < metrics.length - 1 && (
                <div className="mx-2 h-8 w-px bg-border/50 self-center flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
