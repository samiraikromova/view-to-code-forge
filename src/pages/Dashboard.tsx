import { useState, useCallback } from "react";
import { Plus, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewSelector } from "@/components/dashboard/ViewSelector";
import { MetricContainer } from "@/components/dashboard/MetricContainer";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { GoalBuilder } from "@/components/dashboard/GoalBuilder";
import { ComparisonChart } from "@/components/dashboard/ComparisonChart";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import {
  getMockMetricsData,
  getMockComparisonData,
  getMockLeaderboardUsers,
  getMockGoals,
} from "@/lib/dashboardUtils";
import type { ViewType, Goal, TimePreset } from "@/types/dashboard";

export function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewType>("metrics");
  const [isGoalBuilderOpen, setIsGoalBuilderOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>(getMockGoals());
  const [selectedPreset, setSelectedPreset] = useState("last30days");
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const metricsData = getMockMetricsData();
  const comparisonData = getMockComparisonData("revenue");
  const leaderboardUsers = getMockLeaderboardUsers();

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const handleCreateGoal = useCallback(
    (newGoal: Omit<Goal, "id" | "currentValue" | "previousValue">) => {
      const metric = metricsData[newGoal.metricKey];
      setGoals((prev) => [
        ...prev,
        {
          ...newGoal,
          id: Date.now().toString(),
          currentValue: metric?.current || 0,
          previousValue: metric?.previous || 0,
        },
      ]);
    },
    [metricsData]
  );

  const handleRemoveGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const handlePresetChange = useCallback((preset: TimePreset) => {
    setSelectedPreset(preset.value);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <ViewSelector currentView={currentView} onViewChange={setCurrentView} />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGoalBuilderOpen(!isGoalBuilderOpen)}
            className="gap-1.5 bg-surface/60 border-border/50"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 bg-surface/60 border-border/50"
          >
            <Sparkles className="w-4 h-4" />
            Ask AI
          </Button>

          <DateRangePicker
            selectedPreset={selectedPreset}
            onPresetChange={handlePresetChange}
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className={isLoading ? "animate-spin" : ""}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Goal Builder */}
      <GoalBuilder
        isOpen={isGoalBuilderOpen}
        onClose={() => setIsGoalBuilderOpen(false)}
        onCreateGoal={handleCreateGoal}
        className="mb-6"
      />

      {/* Active Goals */}
      {goals.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Active Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onRemove={handleRemoveGoal} />
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {currentView === "metrics" ? (
        <div className="space-y-6">
          {/* Row 1: Cost/Refunds | Chart | CTR/CPM */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <MetricContainer
              metrics={[
                { key: "cashCollected", data: metricsData.cashCollected },
                { key: "refunds", data: metricsData.refunds },
              ]}
              className="lg:col-span-1"
            />
            <ComparisonChart
              data={comparisonData}
              metricKey="revenue"
              className="lg:col-span-4"
            />
            <MetricContainer
              metrics={[
                { key: "ctr", data: metricsData.ctr },
                { key: "cpm", data: metricsData.cpm },
              ]}
              className="lg:col-span-1"
            />
          </div>

          {/* Row 2: Profit/ROAS/ROI | Revenue/Initial/Recurring | Clients */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricContainer
              metrics={[
                { key: "profit", data: metricsData.profit },
                { key: "roas", data: metricsData.roas },
                { key: "roi", data: metricsData.roi },
              ]}
            />
            <MetricContainer
              metrics={[
                { key: "revenue", data: metricsData.revenue },
                { key: "initialRevenue", data: metricsData.initialRevenue },
                { key: "recurringRevenue", data: metricsData.recurringRevenue },
              ]}
            />
            <MetricContainer
              metrics={[
                { key: "clients", data: metricsData.clients },
                { key: "aov", data: metricsData.aov },
                { key: "ltv", data: metricsData.ltv },
              ]}
            />
          </div>

          {/* Row 3: Profile Visits | Followers/Conversion | Outreach/Responses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricContainer
              metrics={[
                { key: "profileVisits", data: metricsData.profileVisits },
              ]}
            />
            <MetricContainer
              metrics={[
                { key: "followers", data: metricsData.followers },
                { key: "conversionRate", data: metricsData.conversionRate },
              ]}
            />
            <MetricContainer
              metrics={[
                { key: "outreach", data: metricsData.outreach },
                { key: "responses", data: metricsData.responses },
                { key: "calls", data: metricsData.calls },
              ]}
            />
          </div>
        </div>
      ) : (
        <LeaderboardTable users={leaderboardUsers} />
      )}
    </div>
  );
}

export default Dashboard;
