import { useState, useMemo } from "react";
import { Trophy, Medal, Award, MapPin, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatMultiplier } from "@/lib/dashboardUtils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { LeaderboardUser, LeaderboardTimeframe } from "@/types/dashboard";

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  className?: string;
}

const timeframeTabs: { value: LeaderboardTimeframe; label: string }[] = [
  { value: "allTime", label: "All Time" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "slackers", label: "Slackers" },
];

type SortKey = keyof LeaderboardUser["metrics"];

export function LeaderboardTable({ users, className }: LeaderboardTableProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTimeframe>("allTime");
  const [sortKey, setSortKey] = useState<SortKey>("cashCollected");
  const [sortAsc, setSortAsc] = useState(false);

  // Sort and filter users
  const sortedUsers = useMemo(() => {
    let filtered = [...users];

    // Filter for slackers (bottom performers)
    if (activeTab === "slackers") {
      filtered = filtered.sort((a, b) => a.metrics[sortKey] - b.metrics[sortKey]);
    } else {
      filtered = filtered.sort((a, b) =>
        sortAsc
          ? a.metrics[sortKey] - b.metrics[sortKey]
          : b.metrics[sortKey] - a.metrics[sortKey]
      );
    }

    return filtered;
  }, [users, activeTab, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const getRankBadge = (rank: number) => {
    if (activeTab === "slackers") return null;

    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <span className="text-muted-foreground">{rank}</span>;
    }
  };

  const columns: { key: SortKey; label: string; format: (v: number) => string }[] = [
    { key: "cashCollected", label: "Cash", format: formatCurrency },
    { key: "revenue", label: "Revenue", format: formatCurrency },
    { key: "profit", label: "Profit", format: formatCurrency },
    { key: "roas", label: "ROAS", format: formatMultiplier },
    { key: "adSpend", label: "Ad Spend", format: formatCurrency },
    { key: "followers", label: "Followers", format: formatNumber },
    { key: "outreach", label: "Outreach", format: formatNumber },
    { key: "responses", label: "Responses", format: formatNumber },
    { key: "calls", label: "Calls", format: formatNumber },
  ];

  return (
    <div className={cn("rounded-xl bg-surface/60 border border-border/40", className)}>
      {/* Timeframe tabs */}
      <div className="flex items-center border-b border-border/40 px-4">
        <div className="relative flex">
          {timeframeTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-colors relative",
                activeTab === tab.value
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="min-w-[180px]">Member</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-right min-w-[100px]">
                  <button
                    onClick={() => handleSort(col.key)}
                    className={cn(
                      "flex items-center gap-1 ml-auto hover:text-foreground transition-colors",
                      sortKey === col.key ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {col.label}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user, index) => (
              <TableRow
                key={user.id}
                className={cn(
                  user.isCurrentUser && "bg-primary/5 hover:bg-primary/10"
                )}
              >
                <TableCell className="text-center font-medium">
                  {getRankBadge(index + 1)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{user.name}</span>
                        {user.isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      {user.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {user.location}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.key} className="text-right tabular-nums">
                    {col.format(user.metrics[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
