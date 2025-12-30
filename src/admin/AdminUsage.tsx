import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { AdminLayout } from "./AdminLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Download, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'all'

export default function AdminUsage() {
  const [logs, setLogs] = useState<any[]>([])
  const [filteredLogs, setFilteredLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState<string>("")
  const [users, setUsers] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [searchQuery, setSearchQuery] = useState("")
  const [totalCost, setTotalCost] = useState(0)
  const logsPerPage = 20

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true)

      const { data: usageData, error: usageError } = await supabase
        .from("usage_logs")
        .select(`
          *,
          users (
            id,
            name,
            email
          )
        `)
        .order("created_at", { ascending: false })

      if (usageError) throw usageError

      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name", { ascending: true })

      setUsers(usersData || [])
      setLogs(usageData || [])
      setFilteredLogs(usageData || [])

      const cost = (usageData || []).reduce((sum: number, log: any) =>
        sum + (parseFloat(log.estimated_cost) || 0), 0)
      setTotalCost(cost)

    } catch (err: any) {
      console.error('Error fetching usage:', err)
      setError(err.message)
      toast.error('Failed to load usage logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  useEffect(() => {
    let filtered = [...logs]

    if (timeFilter !== 'all') {
      const now = new Date()
      const filterDate = new Date()

      if (timeFilter === 'daily') {
        filterDate.setDate(now.getDate() - 1)
      } else if (timeFilter === 'weekly') {
        filterDate.setDate(now.getDate() - 7)
      } else if (timeFilter === 'monthly') {
        filterDate.setMonth(now.getMonth() - 1)
      }

      filtered = filtered.filter(log => new Date(log.created_at) >= filterDate)
    }

    if (userFilter) {
      filtered = filtered.filter(log => log.users?.email === userFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.users?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.model?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredLogs(filtered)
    setCurrentPage(1)

    const cost = filtered.reduce((sum: number, log: any) =>
      sum + (parseFloat(log.estimated_cost) || 0), 0)
    setTotalCost(cost)
  }, [logs, timeFilter, userFilter, searchQuery])

  const exportToCSV = () => {
    const csvData = [
      ['User', 'Email', 'Model', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost ($)', 'Type', 'Date'],
      ...filteredLogs.map(log => {
        const isImageGen = log.model?.includes('Ideogram')
        return [
          log.users?.name || 'Unknown',
          log.users?.email || '—',
          log.model || '—',
          isImageGen ? 'N/A' : (log.tokens_input || '—'),
          isImageGen ? 'N/A' : (log.tokens_output || '—'),
          isImageGen ? 'N/A' : ((log.tokens_input || 0) + (log.tokens_output || 0)),
          log.estimated_cost ? Number(log.estimated_cost).toFixed(6) : '—',
          isImageGen ? 'Image Generation' : 'Text Chat',
          new Date(log.created_at).toLocaleString()
        ]
      })
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usage-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const indexOfLastLog = currentPage * logsPerPage
  const indexOfFirstLog = indexOfLastLog - logsPerPage
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog)
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage)

  if (loading) {
    return (
      <AdminLayout currentPage="usage">
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading usage logs...</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout currentPage="usage">
        <div className="p-6 text-center">
          <p className="text-destructive mb-4">Error: {error}</p>
          <Button onClick={fetchUsage}>Retry</Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout currentPage="usage">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Usage Analytics</h1>
          <div className="flex items-center gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Cost</div>
                <div className="text-2xl font-bold text-primary">${totalCost.toFixed(4)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Requests</div>
                <div className="text-2xl font-bold text-foreground">{filteredLogs.length}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Time Period</label>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  {(['daily', 'weekly', 'monthly', 'all'] as TimeFilter[]).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setTimeFilter(filter)}
                      className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        timeFilter === filter
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Filter by User</label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.email}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Search</label>
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, email, model..."
                />
              </div>

              <div className="flex items-end">
                <Button onClick={exportToCSV} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Model / Type</TableHead>
                <TableHead className="text-right">Input Tokens</TableHead>
                <TableHead className="text-right">Output Tokens</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Cost ($)</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No usage logs found
                  </TableCell>
                </TableRow>
              ) : (
                currentLogs.map((log, i) => {
                  const isImageGen = log.model?.includes('Ideogram')

                  return (
                    <TableRow key={log.id || i}>
                      <TableCell className="font-medium">{log.users?.name || "Unknown"}</TableCell>
                      <TableCell className="text-muted-foreground">{log.users?.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={isImageGen ? "secondary" : "outline"}>
                          {isImageGen && '🎨 '}
                          {log.model || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isImageGen ? (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        ) : (
                          (log.tokens_input || 0).toLocaleString()
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isImageGen ? (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        ) : (
                          (log.tokens_output || 0).toLocaleString()
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {isImageGen ? (
                          <span className="text-muted-foreground text-xs">Image Gen</span>
                        ) : (
                          ((log.tokens_input || 0) + (log.tokens_output || 0)).toLocaleString()
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {log.estimated_cost ? Number(log.estimated_cost).toFixed(6) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {filteredLogs.length > logsPerPage && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
