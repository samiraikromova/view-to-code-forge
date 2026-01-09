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

// Lighter, more visible colors for pie chart
const COLORS = ['#a78bfa', '#60a5fa', '#4ade80', '#f472b6', '#facc15', '#fb923c', '#c084fc']

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
      // Fetch usage logs for this user in the time range
      const { data: usageLogs, error: logsError } = await supabase
        .from('usage_logs')
        .select('id, thread_id, model, tokens, tokens_input, tokens_output, cost, estimated_cost, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())

      if (logsError) {
        console.error('Error fetching usage logs:', logsError)
      }

      // Get thread -> project mapping
      const threadIds = [...new Set(usageLogs?.map(l => l.thread_id).filter(Boolean) || [])]
      let threadProjectMap: Record<string, string> = {}
      let projectNames: Record<string, string> = {}

      if (threadIds.length > 0) {
        const { data: threads } = await supabase
          .from('chat_threads')
          .select('id, project_id')
          .in('id', threadIds)

        const projectIds = [...new Set(threads?.map(t => t.project_id).filter(Boolean) || [])]
        
        if (projectIds.length > 0) {
          const { data: projects } = await supabase
            .from('projects')
            .select('id, name')
            .in('id', projectIds)
          
          projects?.forEach(p => {
            projectNames[p.id] = p.name
          })
        }

        threads?.forEach(t => {
          threadProjectMap[t.id] = projectNames[t.project_id] || 'Image Generator'
        })
      }

      // Calculate stats from usage_logs - use estimated_cost or cost column
      let totalCost = 0
      let chatMessages = 0
      let imagesGenerated = 0
      const projectCosts: Record<string, { usage: number; cost: number }> = {}

      usageLogs?.forEach(log => {
        // Use estimated_cost first, fallback to cost
        const cost = Number(log.estimated_cost) || Number(log.cost) || 0
        totalCost += cost
        
        const isImage = log.model?.toLowerCase().includes('ideogram') || log.model?.toLowerCase().includes('image')
        if (isImage) {
          imagesGenerated += 1
        } else {
          chatMessages += 1
        }

        // If no thread_id, it's likely an image generation
        const projectName = log.thread_id 
          ? (threadProjectMap[log.thread_id] || 'Image Generator')
          : 'Image Generator'
          
        if (!projectCosts[projectName]) {
          projectCosts[projectName] = { usage: 0, cost: 0 }
        }
        projectCosts[projectName].usage += 1
        projectCosts[projectName].cost += cost
      })

      const projectUsageData = Object.entries(projectCosts).map(([project, data]) => ({
        project,
        usage: data.usage,
        cost: data.cost
      })).sort((a, b) => b.cost - a.cost)

      // Generate real monthly data from usage_logs using estimated_cost
      const { data: allUsageLogs } = await supabase
        .from('usage_logs')
        .select('estimated_cost, cost, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      // Group by month
      const monthlyMap: Record<string, number> = {}
      allUsageLogs?.forEach(log => {
        const date = new Date(log.created_at)
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        // Use estimated_cost first, fallback to cost
        const logCost = Number(log.estimated_cost) || Number(log.cost) || 0
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + logCost
      })

      // Convert to array, show last 6 months with data
      const monthlyCreditsData = Object.entries(monthlyMap)
        .map(([month, credits]) => ({ month, credits }))
        .slice(-6)

      // If no data, show current month with 0
      if (monthlyCreditsData.length === 0) {
        monthlyCreditsData.push({ month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), credits: 0 })
      }

      setStats({
        totalCreditsUsed: totalCost,
        chatMessages,
        imagesGenerated,
        avgDailyCredits: totalCost / days
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
                          <span className="text-white font-medium">{project.project}</span>
                        </div>
                        <span className="text-white/70">${project.cost.toFixed(2)}</span>
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