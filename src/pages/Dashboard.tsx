import { useState, useEffect } from "react";
import { RefreshCw, Calendar, ChevronDown, CreditCard, MessageCircle, Clock, TrendingUp } from "lucide-react";
import { ViewSelector, ViewType } from "@/components/dashboard/ViewSelector";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface UsageStats {
  totalChats: number;
  totalMessages: number;
  creditsUsed: number;
  avgMessagesPerChat: number;
}

export function Dashboard() {
  const { user, profile } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>("metrics");
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats>({
    totalChats: 0,
    totalMessages: 0,
    creditsUsed: 0,
    avgMessagesPerChat: 0,
  });

  // Fetch usage statistics
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      
      try {
        // Fetch chat threads count
        const { count: chatCount } = await supabase
          .from("chat_threads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Fetch messages count
        const { count: messageCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", user.id);

        // Calculate stats
        const totalChats = chatCount || 0;
        const totalMessages = messageCount || 0;
        const avgMessages = totalChats > 0 ? totalMessages / totalChats : 0;

        setStats({
          totalChats,
          totalMessages,
          creditsUsed: Math.max(0, 100 - (profile?.credits || 0)), // Estimate based on starting credits
          avgMessagesPerChat: Math.round(avgMessages * 10) / 10,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user?.id, profile]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 600);
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <ViewSelector currentView={currentView} onViewChange={setCurrentView} />

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Last 30 Days
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        {currentView === "metrics" && (
          <div className={cn(
            "grid gap-6 animate-fade-in",
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}>
            <MetricCard
              title="Available Credits"
              value={(profile?.credits || 0).toFixed(2)}
              icon={CreditCard}
            />
            <MetricCard
              title="Total Chats"
              value={stats.totalChats}
              icon={MessageCircle}
            />
            <MetricCard
              title="Total Messages"
              value={stats.totalMessages}
              icon={Clock}
            />
            <MetricCard
              title="Credits Used"
              value={stats.creditsUsed.toFixed(2)}
              icon={TrendingUp}
            />
          </div>
        )}

        {/* Usage View */}
        {currentView === "usage" && (
          <div className="animate-fade-in">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              <div className="rounded-xl p-6 bg-surface/60 border border-border/40">
                <h3 className="text-sm font-medium text-foreground mb-4">Credit Usage</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Balance</span>
                    <span className="text-lg font-semibold text-foreground">
                      {(profile?.credits || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Subscription Tier</span>
                    <span className="text-lg font-semibold text-foreground capitalize">
                      {profile?.subscription_tier || "Free"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Used</span>
                    <span className="text-lg font-semibold text-foreground">
                      {stats.creditsUsed.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-6 bg-surface/60 border border-border/40">
                <h3 className="text-sm font-medium text-foreground mb-4">Chat Statistics</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Conversations</span>
                    <span className="text-lg font-semibold text-foreground">
                      {stats.totalChats}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Messages</span>
                    <span className="text-lg font-semibold text-foreground">
                      {stats.totalMessages}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Messages/Chat</span>
                    <span className="text-lg font-semibold text-foreground">
                      {stats.avgMessagesPerChat}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Info */}
            <div className="mt-6 rounded-xl p-6 bg-surface/60 border border-border/40">
              <h3 className="text-sm font-medium text-foreground mb-4">Subscription</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold text-foreground capitalize">
                    {profile?.subscription_tier || "Free"}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Upgrade
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="animate-spin">
              <RefreshCw className="h-6 w-6 text-accent" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default Dashboard;
