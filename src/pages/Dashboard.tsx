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

      {/* Active Goals - Only show in metrics view */}
      {currentView === "metrics" && goals.length > 0 && (
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4">
            {/* COST | REFUNDS */}
            <MetricContainer
              metrics={[
                { key: "cashCollected", data: metricsData.cashCollected },
                { key: "refunds", data: metricsData.refunds },
              ]}
            />
            
            {/* REVENUE | INITIAL | RECURRING */}
            <MetricContainer
              metrics={[
                { key: "revenue", data: metricsData.revenue },
                { key: "initialRevenue", data: metricsData.initialRevenue },
                { key: "recurringRevenue", data: metricsData.recurringRevenue },
              ]}
            />
            
            {/* PV | COST/PV */}
            <MetricContainer
              metrics={[
                { key: "profileVisits", data: metricsData.profileVisits },
                { key: "costPerPV", data: metricsData.costPerPV },
              ]}
            />
            
            {/* RESPONSES | O→R % | F→R % | COST/R */}
            <MetricContainer
              metrics={[
                { key: "responses", data: metricsData.responses },
                { key: "outreachToResponse", data: metricsData.outreachToResponse },
                { key: "followerToResponse", data: metricsData.followerToResponse },
                { key: "costPerResponse", data: metricsData.costPerResponse },
              ]}
            />
            
            {/* CALLS | O→C % | R→C % | COST/C */}
            <MetricContainer
              metrics={[
                { key: "calls", data: metricsData.calls },
                { key: "outreachToCall", data: metricsData.outreachToCall },
                { key: "responseToCall", data: metricsData.responseToCall },
                { key: "costPerCall", data: metricsData.costPerCall },
              ]}
            />
            
            {/* SALES | F→S % | R→S % | CAC */}
            <MetricContainer
              metrics={[
                { key: "sales", data: metricsData.sales },
                { key: "followerToSale", data: metricsData.followerToSale },
                { key: "responseToSale", data: metricsData.responseToSale },
                { key: "cac", data: metricsData.cac },
              ]}
            />
          </div>

          {/* MIDDLE COLUMN */}
          <div className="flex flex-col gap-4">
            {/* PROFIT | ROAS | ROI | MARGIN */}
            <MetricContainer
              metrics={[
                { key: "profit", data: metricsData.profit },
                { key: "roas", data: metricsData.roas },
                { key: "roi", data: metricsData.roi },
                { key: "margin", data: metricsData.margin },
              ]}
            />
            
            {/* CLIENTS | NEW | REPEAT */}
            <MetricContainer
              metrics={[
                { key: "clients", data: metricsData.clients },
                { key: "newClients", data: metricsData.newClients },
                { key: "repeatClients", data: metricsData.repeatClients },
              ]}
            />
            
            {/* FOLLOWERS | PV→F % | COST/F */}
            <MetricContainer
              metrics={[
                { key: "followers", data: metricsData.followers },
                { key: "pvToFollower", data: metricsData.pvToFollower },
                { key: "costPerFollower", data: metricsData.costPerFollower },
              ]}
            />
            
            {/* Comparison Chart */}
            <ComparisonChart
              data={comparisonData}
              metricKey="revenue"
              className="flex-1 min-h-[280px]"
            />
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4">
            {/* CTR | CPM */}
            <MetricContainer
              metrics={[
                { key: "ctr", data: metricsData.ctr },
                { key: "cpm", data: metricsData.cpm },
              ]}
            />
            
            {/* AOV | LTV */}
            <MetricContainer
              metrics={[
                { key: "aov", data: metricsData.aov },
                { key: "ltv", data: metricsData.ltv },
              ]}
            />
            
            {/* OUTREACH | F→O % | COST/O */}
            <MetricContainer
              metrics={[
                { key: "outreach", data: metricsData.outreach },
                { key: "followerToOutreach", data: metricsData.followerToOutreach },
                { key: "costPerOutreach", data: metricsData.costPerOutreach },
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
