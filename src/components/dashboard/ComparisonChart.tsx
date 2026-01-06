import { useRef, useEffect, CSSProperties } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatMetricValue, metricDefinitions } from "@/lib/dashboardUtils";
import type { ComparisonDataPoint, MetricKey } from "@/types/dashboard";

interface ComparisonChartProps {
  data: ComparisonDataPoint[];
  metricKey: MetricKey;
  className?: string;
  style?: CSSProperties;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
  metricKey: MetricKey;
}

function CustomTooltip({ active, payload, label, metricKey }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              entry.dataKey === "current" ? "bg-primary" : "bg-muted-foreground"
            )}
          />
          <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
          <span className="font-medium text-foreground">
            {formatMetricValue(metricKey, entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ComparisonChart({ data, metricKey, className, style }: ComparisonChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const definition = metricDefinitions[metricKey];

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
        "rounded-xl p-5 transition-all duration-300",
        "bg-surface/60 border border-border/40",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">
            {definition.label}
          </h3>
          <span className="text-xs text-muted-foreground">vs Previous Period</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-primary" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-muted-foreground" style={{ borderStyle: "dashed" }} />
            <span>Previous</span>
          </div>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => formatMetricValue(metricKey, value)}
            />
            <Tooltip content={<CustomTooltip metricKey={metricKey} />} />
            <Line
              type="monotone"
              dataKey="current"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: "hsl(var(--muted-foreground))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
