import { useRef, useEffect } from "react";
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  icon?: LucideIcon;
  format?: "number" | "currency" | "percentage";
  className?: string;
}

export function MetricCard({
  title,
  value,
  previousValue,
  currentValue,
  icon: Icon,
  className,
}: MetricCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply shimmer animation on mount
  useEffect(() => {
    if (containerRef.current) {
      const animations = ["shimmer-border-1", "shimmer-border-2", "shimmer-border-3"];
      const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
      const randomDuration = (2.5 + Math.random() * 1.5).toFixed(2);
      containerRef.current.style.animation = `${randomAnimation} ${randomDuration}s ease-in-out infinite`;
    }
  }, []);

  // Calculate trend
  const showTrend = previousValue !== undefined && currentValue !== undefined && previousValue !== 0;
  const changePercent = showTrend ? ((currentValue! - previousValue!) / previousValue!) * 100 : 0;
  const isPositive = changePercent >= 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]",
        "bg-surface/60 border border-border/40",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          {title}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15">
            <Icon className="w-4 h-4 text-accent" />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        
        {showTrend && Math.abs(changePercent) >= 0.5 && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium mb-1",
              isPositive ? "text-green-500" : "text-red-500"
            )}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
