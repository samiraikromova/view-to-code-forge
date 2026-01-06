import { LucideIcon } from "lucide-react";

export type MetricKey =
  | "cashCollected"
  | "revenue"
  | "profit"
  | "roas"
  | "roi"
  | "margin"
  | "adSpend"
  | "refunds"
  | "ctr"
  | "cpm"
  | "followers"
  | "profileVisits"
  | "outreach"
  | "responses"
  | "calls"
  | "clients"
  | "initialRevenue"
  | "recurringRevenue"
  | "aov"
  | "ltv"
  | "conversionRate"
  | "costPerPV"
  | "pvToFollower"
  | "costPerFollower"
  | "outreachToResponse"
  | "followerToResponse"
  | "costPerResponse"
  | "outreachToCall"
  | "responseToCall"
  | "costPerCall"
  | "newClients"
  | "repeatClients"
  | "sales"
  | "followerToSale"
  | "responseToSale"
  | "cac"
  | "followerToOutreach"
  | "costPerOutreach";

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  shortLabel?: string;
  format: "currency" | "number" | "percent" | "multiplier";
  icon?: LucideIcon;
  description?: string;
}

export interface MetricValue {
  current: number;
  previous: number;
}

export interface MetricData {
  [key: string]: MetricValue;
}

export interface ComparisonDataPoint {
  date: string;
  current: number;
  previous: number;
}

export interface TimePreset {
  label: string;
  value: string;
  days?: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type GoalType = "custom" | "top10" | "leader";

export type Timeframe = "thisMonth" | "lastMonth" | "allTime";

export interface Goal {
  id: string;
  metricKey: MetricKey;
  targetValue: number;
  currentValue: number;
  previousValue: number;
  timeframe: Timeframe;
  goalType: GoalType;
  label?: string;
}

export interface LeaderboardMetrics {
  cashCollected: number;
  revenue: number;
  profit: number;
  roas: number;
  adSpend: number;
  followers: number;
  outreach: number;
  responses: number;
  calls: number;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar?: string;
  location?: string;
  isCurrentUser?: boolean;
  metrics: LeaderboardMetrics;
}

export type LeaderboardTimeframe = "allTime" | "thisMonth" | "lastMonth" | "slackers";

export type ViewType = "metrics" | "leaderboard";
