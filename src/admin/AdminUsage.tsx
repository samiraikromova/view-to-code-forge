import { useEffect, useState } from "react"
import { AdminLayout } from "./AdminLayout"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, MessageSquare, Image, Clock } from "lucide-react"

interface UsageRecord {
  id: string
  user_id: string
  type: string
  credits_used: number
  created_at: string
  user_email?: string
}

export default function AdminUsage() {
  const [usage, setUsage] = useState<UsageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")
  const [stats, setStats] = useState({
    totalCreditsUsed: 0,
    chatMessages: 0,
    imagesGenerated: 0
  })

  useEffect(() => {
    fetchUsage()
  }, [timeRange])

  async function fetchUsage() {
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
      // Fetch messages as usage proxy
      const { data: messages, count: messageCount } = await supabase
        .from('messages')
        .select('id, thread_id, role, created_at', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(100)

      // Get unique threads for user info
      const threadIds = [...new Set(messages?.map(m => m.thread_id) || [])]
      
      let userMap: Record<string, string> = {}
      if (threadIds.length > 0) {
        const { data: threads } = await supabase
          .from('chat_threads')
          .select('id, user_id')
          .in('id', threadIds)

        const userIds = [...new Set(threads?.map(t => t.user_id) || [])]
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds)

          const threadToUser: Record<string, string> = {}
          threads?.forEach(t => {
            const user = users?.find(u => u.id === t.user_id)
            if (user) threadToUser[t.id] = user.email
          })
          userMap = threadToUser
        }
      }

      // Transform to usage records
      const usageRecords: UsageRecord[] = (messages || []).map(m => ({
        id: m.id,
        user_id: m.thread_id,
        type: 'chat',
        credits_used: 0.1, // Approximate
        created_at: m.created_at,
        user_email: userMap[m.thread_id] || 'Unknown'
      }))

      setUsage(usageRecords)
      setStats({
        totalCreditsUsed: usageRecords.reduce((sum, u) => sum + u.credits_used, 0),
        chatMessages: messageCount || 0,
        imagesGenerated: 0 // Would need separate tracking
      })
    } catch (error) {
      console.error('Error fetching usage:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AdminLayout currentPage="usage">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Usage Analytics</h1>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36 bg-surface border-border text-foreground">
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Credits Used
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalCreditsUsed.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Chat Messages
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.chatMessages}</div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Images Generated
              </CardTitle>
              <Image className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.imagesGenerated}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Credits</TableHead>
                  <TableHead className="text-muted-foreground">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={4}>
                        <div className="h-8 bg-muted rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : usage.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No activity in this time period
                    </TableCell>
                  </TableRow>
                ) : (
                  usage.slice(0, 20).map((record) => (
                    <TableRow key={record.id} className="border-border hover:bg-surface-hover">
                      <TableCell className="text-foreground">{record.user_email}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">{record.type}</TableCell>
                      <TableCell className="text-foreground font-mono">{record.credits_used.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(record.created_at)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
