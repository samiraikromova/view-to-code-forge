import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MetricContainer } from "@/components/dashboard/MetricContainer";
import { GoalCard } from "@/components/dashboard/GoalCard";
import { GoalBuilder } from "@/components/dashboard/GoalBuilder";
import { ComparisonChart } from "@/components/dashboard/ComparisonChart";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";
import {
  getMockMetricsData,
  getMockComparisonData,
  getMockLeaderboardUsers,
  getMockGoals,
} from "@/lib/dashboardUtils";
import type { ViewType, Goal, MetricKey } from "@/types/dashboard";

interface DashboardProps {
  onAskAI?: (csvData: string) => void;
  currentView: ViewType;
  isGoalBuilderOpen: boolean;
  onGoalBuilderClose: () => void;
}

export function Dashboard({ 
  onAskAI,
  currentView,
  isGoalBuilderOpen,
  onGoalBuilderClose,
}: DashboardProps) {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>(getMockGoals());
  const [selectedChartMetric, setSelectedChartMetric] = useState<MetricKey>("revenue");
  const [viewKey, setViewKey] = useState(0);
  const prevViewRef = useRef(currentView);

  // Trigger animation on view change
  useEffect(() => {
    if (prevViewRef.current !== currentView) {
      setViewKey(k => k + 1);
      prevViewRef.current = currentView;
    }
  }, [currentView]);

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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-auto p-6 animate-fade-in">
      {/* Goal Builder */}
      <GoalBuilder
        isOpen={isGoalBuilderOpen}
        onClose={onGoalBuilderClose}
        onCreateGoal={handleCreateGoal}
        className="mb-6"
      />

      {/* Active Goals - Only show in metrics view */}
      {currentView === "metrics" && goals.length > 0 && (
        <div className="mb-6 animate-power-up" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 animate-hud-line" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>Active Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {goals.map((goal, index) => (
              <div 
                key={goal.id} 
                className="animate-card-reveal"
                style={{ animationDelay: `${150 + index * 80}ms`, animationFillMode: 'backwards' }}
              >
                <GoalCard goal={goal} onRemove={handleRemoveGoal} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      {currentView === "metrics" ? (
        <div key={`metrics-${viewKey}`} className="grid grid-cols-4 lg:grid-cols-8 gap-3 animate-view-switch">
          {/* ROW 1: 2 + 4 + 2 = 8 */}
          <MetricContainer
            className="col-span-2 animate-card-reveal holo-gradient"
            style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}
            metrics={[
              { key: "adSpend", data: metricsData.adSpend },
              { key: "refunds", data: metricsData.refunds },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-4 animate-card-reveal holo-gradient"
            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
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
            className="col-span-2 animate-card-reveal holo-gradient"
            style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
            metrics={[
              { key: "ctr", data: metricsData.ctr },
              { key: "cpm", data: metricsData.cpm },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />

          {/* ROW 2: 3 + 3 + 2 = 8 */}
          <MetricContainer
            className="col-span-3 animate-card-reveal holo-gradient"
            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
            metrics={[
              { key: "revenue", data: metricsData.revenue },
              { key: "initialRevenue", data: metricsData.initialRevenue },
              { key: "recurringRevenue", data: metricsData.recurringRevenue },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-3 animate-card-reveal holo-gradient"
            style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
            metrics={[
              { key: "clients", data: metricsData.clients },
              { key: "newClients", data: metricsData.newClients },
              { key: "repeatClients", data: metricsData.repeatClients },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-2 animate-card-reveal holo-gradient"
            style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
            metrics={[
              { key: "aov", data: metricsData.aov },
              { key: "ltv", data: metricsData.ltv },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />

          {/* ROW 3: 2 + 3 + 3 = 8 */}
          <MetricContainer
            className="col-span-2 animate-card-reveal holo-gradient"
            style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}
            metrics={[
              { key: "profileVisits", data: metricsData.profileVisits },
              { key: "costPerPV", data: metricsData.costPerPV },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-3 animate-card-reveal holo-gradient"
            style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}
            metrics={[
              { key: "followers", data: metricsData.followers },
              { key: "pvToFollower", data: metricsData.pvToFollower },
              { key: "costPerFollower", data: metricsData.costPerFollower },
            ]}
            onMetricClick={handleMetricClick}
            selectedMetric={selectedChartMetric}
          />
          <MetricContainer
            className="col-span-3 animate-card-reveal holo-gradient"
            style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}
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
            className="col-span-4 animate-card-reveal holo-gradient"
            style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}
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
            className="col-span-4 row-span-3 animate-power-up"
            style={{ animationDelay: '550ms', animationFillMode: 'backwards' }}
          />

          {/* ROW 5: 4 (chart continues) */}
          <MetricContainer
            className="col-span-4 animate-card-reveal holo-gradient"
            style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}
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
            className="col-span-4 animate-card-reveal holo-gradient"
            style={{ animationDelay: '650ms', animationFillMode: 'backwards' }}
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
        <div key={`leaderboard-${viewKey}`} className="animate-view-switch">
          <LeaderboardTable users={leaderboardUsers} />
        </div>
      )}
    </div>
  );
}

export default Dashboard;
