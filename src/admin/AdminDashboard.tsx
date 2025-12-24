import { useEffect, useState } from "react"
import { AdminLayout } from "./AdminLayout"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CreditCard, MessageSquare, TrendingUp } from "lucide-react"

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalCreditsUsed: number
  totalMessages: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCreditsUsed: 0,
    totalMessages: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Get active users (users with recent activity)
      const { count: activeCount } = await supabase
        .from('allowed_users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get total messages
      const { count: messageCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })

      // Sum credits used (approximate from users table)
      const { data: creditData } = await supabase
        .from('users')
        .select('credits')

      const totalCredits = creditData?.reduce((sum, u) => sum + (Number(u.credits) || 0), 0) || 0

      setStats({
        totalUsers: userCount || 0,
        activeUsers: activeCount || 0,
        totalCreditsUsed: totalCredits,
        totalMessages: messageCount || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { 
      title: "Total Users", 
      value: stats.totalUsers, 
      icon: Users,
      color: "text-blue-500"
    },
    { 
      title: "Active Users", 
      value: stats.activeUsers, 
      icon: TrendingUp,
      color: "text-green-500"
    },
    { 
      title: "Total Credits", 
      value: stats.totalCreditsUsed.toFixed(2), 
      icon: CreditCard,
      color: "text-primary"
    },
    { 
      title: "Total Messages", 
      value: stats.totalMessages, 
      icon: MessageSquare,
      color: "text-purple-500"
    },
  ]

  return (
    <AdminLayout currentPage="dashboard">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-surface border-border animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="bg-surface border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">No recent activity to display.</p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-foreground">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database</span>
                <span className="text-sm text-green-500">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">n8n Webhooks</span>
                <span className="text-sm text-green-500">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Authentication</span>
                <span className="text-sm text-green-500">Enabled</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
