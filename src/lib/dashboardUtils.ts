import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Eye,
  MessageSquare,
  Phone,
  Percent,
  CreditCard,
} from "lucide-react";
import type {
  MetricDefinition,
  MetricKey,
  MetricData,
  TimePreset,
  LeaderboardUser,
  ComparisonDataPoint,
  Goal,
  Timeframe,
  GoalType,
} from "@/types/dashboard";

// Metric definitions
export const metricDefinitions: Record<MetricKey, MetricDefinition> = {
  cashCollected: {
    key: "cashCollected",
    label: "Cash Collected",
    shortLabel: "Cost",
    format: "currency",
    icon: DollarSign,
  },
  revenue: {
    key: "revenue",
    label: "Revenue",
    format: "currency",
    icon: DollarSign,
  },
  profit: {
    key: "profit",
    label: "Profit",
    format: "currency",
    icon: TrendingUp,
  },
  roas: {
    key: "roas",
    label: "ROAS",
    format: "multiplier",
    icon: BarChart3,
  },
  roi: {
    key: "roi",
    label: "ROI",
    format: "percent",
    icon: Percent,
  },
  margin: {
    key: "margin",
    label: "Margin",
    format: "percent",
    icon: Percent,
  },
  adSpend: {
    key: "adSpend",
    label: "Ad Spend",
    format: "currency",
    icon: CreditCard,
  },
  refunds: {
    key: "refunds",
    label: "Refunds",
    format: "currency",
    icon: CreditCard,
  },
  ctr: {
    key: "ctr",
    label: "CTR",
    format: "percent",
    icon: Percent,
  },
  cpm: {
    key: "cpm",
    label: "CPM",
    format: "currency",
    icon: DollarSign,
  },
  followers: {
    key: "followers",
    label: "Followers",
    format: "number",
    icon: Users,
  },
  profileVisits: {
    key: "profileVisits",
    label: "Profile Visits",
    format: "number",
    icon: Eye,
  },
  outreach: {
    key: "outreach",
    label: "Outreach",
    format: "number",
    icon: MessageSquare,
  },
  responses: {
    key: "responses",
    label: "Responses",
    format: "number",
    icon: MessageSquare,
  },
  calls: {
    key: "calls",
    label: "Calls",
    format: "number",
    icon: Phone,
  },
  clients: {
    key: "clients",
    label: "Clients",
    format: "number",
    icon: Users,
  },
  initialRevenue: {
    key: "initialRevenue",
    label: "Initial Revenue",
    shortLabel: "Initial",
    format: "currency",
    icon: DollarSign,
  },
  recurringRevenue: {
    key: "recurringRevenue",
    label: "Recurring Revenue",
    shortLabel: "Recurring",
    format: "currency",
    icon: DollarSign,
  },
  aov: {
    key: "aov",
    label: "AOV",
    format: "currency",
    icon: DollarSign,
  },
  ltv: {
    key: "ltv",
    label: "LTV",
    format: "currency",
    icon: DollarSign,
  },
  conversionRate: {
    key: "conversionRate",
    label: "Conversion Rate",
    shortLabel: "Conv.",
    format: "percent",
    icon: Percent,
  },
};

// Metrics where lower is better (inverse trend)
export const inverseMetrics: Set<MetricKey> = new Set([
  "adSpend",
  "refunds",
  "cpm",
]);

// Time presets for date picker
export const timePresets: TimePreset[] = [
  { label: "Today", value: "today", days: 0 },
  { label: "Yesterday", value: "yesterday", days: 1 },
  { label: "Last 7 Days", value: "last7days", days: 7 },
  { label: "Last 14 Days", value: "last14days", days: 14 },
  { label: "Last 30 Days", value: "last30days", days: 30 },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "All Time", value: "allTime" },
];

// Format functions
export function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function formatMetricValue(key: MetricKey, value: number): string {
  const definition = metricDefinitions[key];
  if (!definition) return String(value);

  switch (definition.format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value);
    case "multiplier":
      return formatMultiplier(value);
    case "number":
    default:
      return formatNumber(value);
  }
}

// Calculate percentage change
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Check if trend is positive
export function isTrendPositive(key: MetricKey, change: number): boolean {
  return inverseMetrics.has(key) ? change < 0 : change > 0;
}

// Mock metrics data
export function getMockMetricsData(): MetricData {
  return {
    cashCollected: { current: 45230, previous: 38500 },
    revenue: { current: 125000, previous: 98000 },
    profit: { current: 67500, previous: 52000 },
    roas: { current: 4.2, previous: 3.8 },
    roi: { current: 320, previous: 280 },
    margin: { current: 54, previous: 53 },
    adSpend: { current: 29800, previous: 25800 },
    refunds: { current: 2100, previous: 3200 },
    ctr: { current: 3.2, previous: 2.8 },
    cpm: { current: 12.5, previous: 14.2 },
    followers: { current: 45200, previous: 42100 },
    profileVisits: { current: 12500, previous: 9800 },
    outreach: { current: 350, previous: 280 },
    responses: { current: 145, previous: 112 },
    calls: { current: 42, previous: 35 },
    clients: { current: 28, previous: 22 },
    initialRevenue: { current: 85000, previous: 68000 },
    recurringRevenue: { current: 40000, previous: 30000 },
    aov: { current: 3035, previous: 2800 },
    ltv: { current: 8500, previous: 7200 },
    conversionRate: { current: 12.5, previous: 10.2 },
  };
}

// Mock comparison chart data
export function getMockComparisonData(metric: MetricKey = "revenue"): ComparisonDataPoint[] {
  const days = 14;
  const data: ComparisonDataPoint[] = [];
  const baseValue = metricDefinitions[metric].format === "currency" ? 5000 : 100;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      current: baseValue + Math.random() * baseValue * 0.5,
      previous: baseValue * 0.8 + Math.random() * baseValue * 0.4,
    });
  }

  return data;
}

// Mock leaderboard data
export function getMockLeaderboardUsers(): LeaderboardUser[] {
  return [
    {
      id: "1",
      name: "Alex Thompson",
      location: "Los Angeles, CA",
      isCurrentUser: false,
      metrics: {
        cashCollected: 245000,
        revenue: 312000,
        profit: 185000,
        roas: 5.2,
        adSpend: 60000,
        followers: 125000,
        outreach: 850,
        responses: 420,
        calls: 95,
      },
    },
    {
      id: "2",
      name: "Sarah Chen",
      location: "New York, NY",
      isCurrentUser: false,
      metrics: {
        cashCollected: 198000,
        revenue: 275000,
        profit: 156000,
        roas: 4.8,
        adSpend: 57000,
        followers: 98000,
        outreach: 720,
        responses: 380,
        calls: 82,
      },
    },
    {
      id: "3",
      name: "You",
      location: "Austin, TX",
      isCurrentUser: true,
      metrics: {
        cashCollected: 125000,
        revenue: 180000,
        profit: 95000,
        roas: 4.2,
        adSpend: 43000,
        followers: 45200,
        outreach: 350,
        responses: 145,
        calls: 42,
      },
    },
    {
      id: "4",
      name: "Mike Johnson",
      location: "Miami, FL",
      isCurrentUser: false,
      metrics: {
        cashCollected: 112000,
        revenue: 165000,
        profit: 88000,
        roas: 3.9,
        adSpend: 42000,
        followers: 67000,
        outreach: 480,
        responses: 210,
        calls: 55,
      },
    },
    {
      id: "5",
      name: "Emily Rodriguez",
      location: "Chicago, IL",
      isCurrentUser: false,
      metrics: {
        cashCollected: 98000,
        revenue: 142000,
        profit: 72000,
        roas: 3.5,
        adSpend: 40000,
        followers: 52000,
        outreach: 390,
        responses: 165,
        calls: 38,
      },
    },
    {
      id: "6",
      name: "David Kim",
      location: "Seattle, WA",
      isCurrentUser: false,
      metrics: {
        cashCollected: 85000,
        revenue: 128000,
        profit: 65000,
        roas: 3.2,
        adSpend: 40000,
        followers: 38000,
        outreach: 320,
        responses: 140,
        calls: 32,
      },
    },
    {
      id: "7",
      name: "Jessica Williams",
      location: "Denver, CO",
      isCurrentUser: false,
      metrics: {
        cashCollected: 72000,
        revenue: 105000,
        profit: 52000,
        roas: 2.8,
        adSpend: 37500,
        followers: 28000,
        outreach: 280,
        responses: 115,
        calls: 28,
      },
    },
    {
      id: "8",
      name: "Chris Anderson",
      location: "Portland, OR",
      isCurrentUser: false,
      metrics: {
        cashCollected: 58000,
        revenue: 85000,
        profit: 42000,
        roas: 2.4,
        adSpend: 35000,
        followers: 22000,
        outreach: 220,
        responses: 85,
        calls: 22,
      },
    },
  ];
}

// Get target value for goal based on leaderboard
export function getLeaderboardTarget(
  metricKey: MetricKey,
  goalType: GoalType,
  users: LeaderboardUser[]
): number {
  const values = users.map((u) => {
    const metrics = u.metrics as unknown as Record<string, number>;
    return metrics[metricKey] || 0;
  });

  if (goalType === "leader") {
    return Math.max(...values);
  }

  if (goalType === "top10") {
    const sorted = [...values].sort((a, b) => b - a);
    const top10 = sorted.slice(0, Math.min(10, sorted.length));
    return top10.reduce((a, b) => a + b, 0) / top10.length;
  }

  return 0;
}

// Get timeframe label
export function getTimeframeLabel(timeframe: Timeframe): string {
  switch (timeframe) {
    case "thisMonth":
      return "This Month";
    case "lastMonth":
      return "Last Month";
    case "allTime":
      return "All Time";
    default:
      return timeframe;
  }
}

// Get goal type label
export function getGoalTypeLabel(goalType: GoalType): string {
  switch (goalType) {
    case "custom":
      return "Custom Goal";
    case "top10":
      return "Top 10 Average";
    case "leader":
      return "Market Leader";
    default:
      return goalType;
  }
}

// Generate mock goals
export function getMockGoals(): Goal[] {
  const metrics = getMockMetricsData();
  return [
    {
      id: "1",
      metricKey: "revenue",
      targetValue: 150000,
      currentValue: metrics.revenue.current,
      previousValue: metrics.revenue.previous,
      timeframe: "thisMonth",
      goalType: "custom",
    },
    {
      id: "2",
      metricKey: "profit",
      targetValue: 80000,
      currentValue: metrics.profit.current,
      previousValue: metrics.profit.previous,
      timeframe: "thisMonth",
      goalType: "top10",
    },
  ];
}
