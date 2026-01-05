import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  metricDefinitions,
  getLeaderboardTarget,
  getMockLeaderboardUsers,
  formatMetricValue,
} from "@/lib/dashboardUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MetricKey, GoalType, Timeframe, Goal } from "@/types/dashboard";

interface GoalBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGoal: (goal: Omit<Goal, "id" | "currentValue" | "previousValue">) => void;
  className?: string;
}

const goalTypes: { value: GoalType; label: string }[] = [
  { value: "custom", label: "Custom Value" },
  { value: "top10", label: "Average of Top 10" },
  { value: "leader", label: "Market Leader" },
];

const timeframes: { value: Timeframe; label: string }[] = [
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "allTime", label: "All Time" },
];

export function GoalBuilder({ isOpen, onClose, onCreateGoal, className }: GoalBuilderProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("revenue");
  const [goalType, setGoalType] = useState<GoalType>("custom");
  const [timeframe, setTimeframe] = useState<Timeframe>("thisMonth");
  const [customValue, setCustomValue] = useState<string>("");

  const metricOptions = Object.values(metricDefinitions);
  const leaderboardUsers = getMockLeaderboardUsers();

  // Calculate target value based on goal type
  const calculateTargetValue = (): number => {
    if (goalType === "custom") {
      return parseFloat(customValue) || 0;
    }
    return getLeaderboardTarget(selectedMetric, goalType, leaderboardUsers);
  };

  const handleSubmit = () => {
    const targetValue = calculateTargetValue();
    if (targetValue <= 0) return;

    onCreateGoal({
      metricKey: selectedMetric,
      targetValue,
      timeframe,
      goalType,
    });

    // Reset form
    setSelectedMetric("revenue");
    setGoalType("custom");
    setTimeframe("thisMonth");
    setCustomValue("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "rounded-xl p-5 bg-surface/60 border border-border/40 animate-fade-in",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Create New Goal</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Metric</label>
          <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((metric) => (
                <SelectItem key={metric.key} value={metric.key}>
                  {metric.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Goal type selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Goal Type</label>
          <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {goalTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeframe selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Timeframe</label>
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeframes.map((tf) => (
                <SelectItem key={tf.value} value={tf.value}>
                  {tf.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom value input or calculated target */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Target Value</label>
          {goalType === "custom" ? (
            <Input
              type="number"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Enter target..."
              className="bg-background"
            />
          ) : (
            <div className="h-10 px-3 flex items-center rounded-md border border-border bg-background text-foreground">
              {formatMetricValue(selectedMetric, calculateTargetValue())}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSubmit} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Set Goal
        </Button>
      </div>
    </div>
  );
}
