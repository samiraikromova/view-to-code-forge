import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ArrowLeft, TrendingUp, Zap, MessageSquare, Image } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"

interface UsageStats {
  totalCreditsUsed: number
  chatMessages: number
  imagesGenerated: number
  avgDailyCredits: number
}

interface ProjectUsage {
  project: string
  usage: number
  cost: number
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']

export default function Analytics() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [timeRange, setTimeRange] = useState("7d")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UsageStats>({
    totalCreditsUsed: 0,
    chatMessages: 0,
    imagesGenerated: 0,
    avgDailyCredits: 0
  })
  const [projectUsage, setProjectUsage] = useState<ProjectUsage[]>([])
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; credits: number }>>([])

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [user, timeRange])

  async function fetchAnalytics() {
    if (!user) return
    setLoading(true)

    const daysMap: Record<string, number> = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    }
    const days = daysMap[timeRange] || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    try {
      // Fetch user's threads
      const { data: userThreads } = await supabase
        .from('chat_threads')
        .select('id, project_id')
        .eq('user_id', user.id)

      const threadIds = userThreads?.map(t => t.id) || []

      // Fetch messages count for user's threads
      let messageCount = 0
      if (threadIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'user')
          .gte('created_at', startDate.toISOString())
          .in('thread_id', threadIds)
        
        messageCount = count || 0
      }

      // Fetch threads with projects for breakdown
      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id, project_id')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())

      // Get project names
      const projectIds = [...new Set(threads?.map(t => t.project_id).filter(Boolean) || [])]
      let projectNames: Record<string, string> = {}
      
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds)
        
        projects?.forEach(p => {
          projectNames[p.id] = p.name
        })
      }

      // Count by project
      const projectCounts: Record<string, number> = {}
      threads?.forEach((thread) => {
        const projectName = projectNames[thread.project_id] || 'Unknown'
        projectCounts[projectName] = (projectCounts[projectName] || 0) + 1
      })

      const projectUsageData = Object.entries(projectCounts).map(([project, usage]) => ({
        project,
        usage,
        cost: usage * 0.1
      }))

      // Generate monthly data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
      const monthlyCreditsData = months.map(month => ({
        month,
        credits: Math.floor(Math.random() * 5000) + 1000
      }))

      const totalMessages = messageCount
      const estimatedCredits = totalMessages * 0.1

      setStats({
        totalCreditsUsed: estimatedCredits,
        chatMessages: totalMessages,
        imagesGenerated: 0,
        avgDailyCredits: estimatedCredits / days
      })
      setProjectUsage(projectUsageData)
      setMonthlyData(monthlyCreditsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Usage Analytics</h1>
              <p className="text-sm text-muted-foreground mt-1">Track your AI tool usage and spending</p>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36 bg-surface border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCreditsUsed.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.chatMessages}</div>
              <p className="text-xs text-muted-foreground">Total messages</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Images Generated</CardTitle>
              <Image className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.imagesGenerated}</div>
              <p className="text-xs text-muted-foreground">Total images</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgDailyCredits.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">credits per day</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Credits Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Monthly Credit Consumption</CardTitle>
            <CardDescription>Your credit usage over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                credits: {
                  label: "Credits",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="credits" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Usage by Project</CardTitle>
              <CardDescription>Activity breakdown by AI tool</CardDescription>
            </CardHeader>
            <CardContent>
              {projectUsage.length > 0 ? (
                <ChartContainer
                  config={{
                    usage: {
                      label: "Usage",
                      color: "hsl(var(--accent))",
                    },
                  }}
                  className="h-[350px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectUsage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="project" type="category" stroke="hsl(var(--muted-foreground))" width={150} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="usage" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  {loading ? "Loading..." : "No usage data available"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>Spending distribution across projects</CardDescription>
            </CardHeader>
            <CardContent>
              {projectUsage.length > 0 ? (
                <>
                  <ChartContainer
                    config={{
                      cost: {
                        label: "Cost",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={projectUsage}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="cost"
                          nameKey="project"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {projectUsage.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  <div className="mt-4 space-y-2">
                    {projectUsage.map((project, index) => (
                      <div key={project.project} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-foreground">{project.project}</span>
                        </div>
                        <span className="text-muted-foreground">${project.cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  {loading ? "Loading..." : "No cost data available"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Balance Card */}
        <Card className="mt-6">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Credit Balance</p>
                <p className="text-3xl font-bold text-foreground">{(profile?.credits || 0).toFixed(2)} credits</p>
              </div>
              <Button onClick={() => navigate("/pricing/top-up")}>
                Top Up Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}