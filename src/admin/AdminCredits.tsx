import { useEffect, useState } from "react"
import { AdminLayout } from "./AdminLayout"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Search, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface UserCredits {
  id: string
  email: string
  full_name: string | null
  credits: number
  subscription_tier: string
}

export default function AdminCredits() {
  const [users, setUsers] = useState<UserCredits[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<UserCredits | null>(null)
  const [creditAmount, setCreditAmount] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, credits, subscription_tier')
      .order('credits', { ascending: false })

    if (data) setUsers(data)
    setLoading(false)
  }

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreditChange = async () => {
    if (!selectedUser || !creditAmount) return

    const amount = parseFloat(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const newCredits = isAdding 
      ? (selectedUser.credits || 0) + amount 
      : Math.max(0, (selectedUser.credits || 0) - amount)

    const { error } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', selectedUser.id)

    if (error) {
      toast.error('Failed to update credits')
    } else {
      setUsers(users.map(u => 
        u.id === selectedUser.id ? { ...u, credits: newCredits } : u
      ))
      toast.success(`Credits ${isAdding ? 'added' : 'deducted'} successfully`)
      setDialogOpen(false)
      setCreditAmount("")
      setSelectedUser(null)
    }
  }

  const openDialog = (user: UserCredits, adding: boolean) => {
    setSelectedUser(user)
    setIsAdding(adding)
    setCreditAmount("")
    setDialogOpen(true)
  }

  const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0)

  return (
    <AdminLayout currentPage="credits">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Credits Management</h1>
        </div>

        {/* Summary Card */}
        <Card className="bg-surface border-border mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits in System</p>
                <p className="text-3xl font-bold text-foreground">{totalCredits.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-foreground">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface border-border text-foreground"
          />
        </div>

        {/* Credits Table */}
        <Card className="bg-surface border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Tier</TableHead>
                  <TableHead className="text-muted-foreground text-right">Credits</TableHead>
                  <TableHead className="text-muted-foreground w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={5}>
                        <div className="h-8 bg-muted rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-border hover:bg-surface-hover">
                      <TableCell className="text-foreground font-medium">
                        {user.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {user.subscription_tier || 'free'}
                      </TableCell>
                      <TableCell className="text-foreground text-right font-mono">
                        {(user.credits || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                            onClick={() => openDialog(user, true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDialog(user, false)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Credit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {isAdding ? 'Add Credits' : 'Deduct Credits'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">User</p>
                <p className="text-foreground font-medium">{selectedUser?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                <p className="text-foreground font-medium">{(selectedUser?.credits || 0).toFixed(2)} credits</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-foreground">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount..."
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <Button onClick={handleCreditChange} className="w-full">
                {isAdding ? 'Add Credits' : 'Deduct Credits'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
