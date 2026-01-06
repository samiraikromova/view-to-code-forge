import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles, RefreshCw, UserIcon, CreditCard, LogOut, TrendingUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewSelector } from "@/components/dashboard/ViewSelector";
import { MetricContainer } from "@/components/dashboard/MetricContainer";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { GoalBuilder } from "@/components/dashboard/GoalBuilder";
import { ComparisonChart } from "@/components/dashboard/ComparisonChart";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import {
  getMockMetricsData,
  getMockComparisonData,
  getMockLeaderboardUsers,
  getMockGoals,
} from "@/lib/dashboardUtils";
import type { ViewType, Goal, TimePreset, MetricKey } from "@/types/dashboard";

interface DashboardProps {
  onAskAI?: (csvData: string) => void;
}

export function Dashboard({ 
  onAskAI,
}: DashboardProps) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("metrics");
  const [isGoalBuilderOpen, setIsGoalBuilderOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("last30days");
  const [isLoading, setIsLoading] = useState(false);
  const [goals, setGoals] = useState<Goal[]>(getMockGoals());
  const [selectedChartMetric, setSelectedChartMetric] = useState<MetricKey>("revenue");

  const userName = profile?.name || profile?.email?.split("@")[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const userCredits = profile?.credits ?? 0;

  // Mock data
  const metricsData = getMockMetricsData();
  const comparisonData = getMockComparisonData(selectedChartMetric);
  const leaderboardUsers = getMockLeaderboardUsers();

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

  const handleMetricClick = useCallback((metricKey: MetricKey) => {
    setSelectedChartMetric(metricKey);
  }, []);

  const handleAskAI = useCallback(() => {
    // Build CSV from metrics data
    const headers = ["Metric", "Current", "Previous", "Change"];
    const rows = Object.entries(metricsData).map(([key, data]) => {
      const change = data.previous ? ((data.current - data.previous) / data.previous * 100).toFixed(1) : "N/A";
      return [key, data.current, data.previous ?? "N/A", `${change}%`];
    });
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    
    if (onAskAI) {
      onAskAI(csv);
    } else {
      // Navigate to chat with CSV data stored
      sessionStorage.setItem("dashboardCSV", csv);
      navigate("/chat");
    }
  }, [metricsData, onAskAI, navigate]);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const handlePresetChange = useCallback((preset: TimePreset) => {
    setSelectedPreset(preset.value);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Header Controls Row */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/50">
        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:ring-2 hover:ring-primary/50 transition-all flex items-center justify-center flex-shrink-0">
              {userInitial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {/* Credit Usage Gauge */}
            <div className="px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Credits</span>
                <span className="text-xs font-medium text-foreground">
                  {userCredits.toFixed(1)} available
                </span>
              </div>
              <Progress value={Math.min(userCredits, 100)} className="h-2" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")} className="text-muted-foreground">
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/analytics")} className="text-muted-foreground">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade to Pro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/pricing/top-up")} className="text-muted-foreground">
              <CreditCard className="mr-2 h-4 w-4" />
              Top up credits
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View Selector */}
        <ViewSelector currentView={currentView} onViewChange={setCurrentView} />

        {/* Dashboard Controls */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsGoalBuilderOpen(!isGoalBuilderOpen)}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleAskAI}
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

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 p-6 overflow-auto">
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
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
          {/* ROW 1: 2 + 4 + 2 = 8 */}
          <MetricContainer
            className="col-span-2"
            metrics={[
              { key: "adSpend", data: metricsData.adSpend },
              { key: "refunds", data: metricsData.refunds },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-4"
            metrics={[
              { key: "profit", data: metricsData.profit },
              { key: "roas", data: metricsData.roas },
              { key: "roi", data: metricsData.roi },
              { key: "margin", data: metricsData.margin },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-2"
            metrics={[
              { key: "ctr", data: metricsData.ctr },
              { key: "cpm", data: metricsData.cpm },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />

          {/* ROW 2: 3 + 3 + 2 = 8 */}
          <MetricContainer
            className="col-span-3"
            metrics={[
              { key: "revenue", data: metricsData.revenue },
              { key: "initialRevenue", data: metricsData.initialRevenue },
              { key: "recurringRevenue", data: metricsData.recurringRevenue },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-3"
            metrics={[
              { key: "clients", data: metricsData.clients },
              { key: "newClients", data: metricsData.newClients },
              { key: "repeatClients", data: metricsData.repeatClients },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-2"
            metrics={[
              { key: "aov", data: metricsData.aov },
              { key: "ltv", data: metricsData.ltv },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />

          {/* ROW 3: 2 + 3 + 3 = 8 */}
          <MetricContainer
            className="col-span-2"
            metrics={[
              { key: "profileVisits", data: metricsData.profileVisits },
              { key: "costPerPV", data: metricsData.costPerPV },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-3"
            metrics={[
              { key: "followers", data: metricsData.followers },
              { key: "pvToFollower", data: metricsData.pvToFollower },
              { key: "costPerFollower", data: metricsData.costPerFollower },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-3"
            metrics={[
              { key: "outreach", data: metricsData.outreach },
              { key: "followerToOutreach", data: metricsData.followerToOutreach },
              { key: "costPerOutreach", data: metricsData.costPerOutreach },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />

          {/* ROW 4: 4 + chart (4 wide, 3 rows tall) */}
          <MetricContainer
            className="col-span-4"
            metrics={[
              { key: "responses", data: metricsData.responses },
              { key: "outreachToResponse", data: metricsData.outreachToResponse },
              { key: "followerToResponse", data: metricsData.followerToResponse },
              { key: "costPerResponse", data: metricsData.costPerResponse },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <ComparisonChart
            data={comparisonData}
            metricKey={selectedChartMetric}
            className="col-span-4 row-span-3"
          />

          {/* ROW 5: 4 (chart continues) */}
          <MetricContainer
            className="col-span-4"
            metrics={[
              { key: "calls", data: metricsData.calls },
              { key: "outreachToCall", data: metricsData.outreachToCall },
              { key: "responseToCall", data: metricsData.responseToCall },
              { key: "costPerCall", data: metricsData.costPerCall },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />

          {/* ROW 6: 4 (chart continues) */}
          <MetricContainer
            className="col-span-4"
            metrics={[
              { key: "sales", data: metricsData.sales },
              { key: "followerToSale", data: metricsData.followerToSale },
              { key: "responseToSale", data: metricsData.responseToSale },
              { key: "cac", data: metricsData.cac },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
        </div>
      ) : (
        <LeaderboardTable users={leaderboardUsers} />
      )}
      </div>
    </div>
  );
}

export default Dashboard;
