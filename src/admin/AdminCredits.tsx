import { useEffect, useState } from "react"
import { AdminLayout } from "./AdminLayout"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search } from "lucide-react"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  name: string
  credits: number
  subscription_tier: string
}

export default function AdminCredits() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [creditAmount, setCreditAmount] = useState<number>(0)
  const [reason, setReason] = useState("")

  const load = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('users')
        .select('id, email, name, credits, subscription_tier')
        .order('created_at', { ascending: false })

      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query
      if (error) throw error
      setUsers(data || [])
    } catch (error: any) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    load() 
  }, [searchQuery])

  const grantCredits = async () => {
    if (!selectedUser || creditAmount === 0) return

    const newTotal = Number(selectedUser.credits) + creditAmount

    const { error } = await supabase
      .from('users')
      .update({ credits: newTotal })
      .eq('id', selectedUser.id)

    if (!error) {
      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: selectedUser.id,
        amount: creditAmount,
        type: 'manual_grant',
        payment_method: 'admin',
        metadata: { reason, admin_action: true }
      })

      toast.success(`Credits ${creditAmount > 0 ? 'added' : 'deducted'} successfully`)
      setShowModal(false)
      setSelectedUser(null)
      setCreditAmount(0)
      setReason("")
      load()
    } else {
      toast.error('Error: ' + error.message)
    }
  }

  const getTierLabel = (tier: string) => {
    if (tier === 'tier2') return 'Pro'
    if (tier === 'tier1') return 'Starter'
    return 'Free'
  }

  const getTierVariant = (tier: string): "default" | "secondary" | "outline" => {
    if (tier === 'tier2') return 'default'
    if (tier === 'tier1') return 'secondary'
    return 'outline'
  }

  const totalCredits = users.reduce((sum, u) => sum + (Number(u.credits) || 0), 0)

  return (
    <AdminLayout currentPage="credits">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Credit Management</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-surface border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Credits in System</p>
              <p className="text-3xl font-bold text-foreground">${totalCredits.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Users</p>
              <p className="text-3xl font-bold text-foreground">{users.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface border-border text-foreground"
          />
        </div>

        {/* Users Table */}
        <Card className="bg-surface border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Tier</TableHead>
                  <TableHead className="text-muted-foreground text-right">Credits</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
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
                ) : users.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => (
                    <TableRow key={user.id} className="border-border hover:bg-surface-hover">
                      <TableCell className="text-foreground font-medium">
                        {user.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getTierVariant(user.subscription_tier)}>
                          {getTierLabel(user.subscription_tier)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground text-right font-mono font-semibold">
                        ${Number(user.credits).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto hover:opacity-80"
                          style={{ color: '#874893' }}
                          onClick={() => {
                            setSelectedUser(user)
                            setShowModal(true)
                          }}
                        >
                          Grant Credits
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Grant Credits Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Grant Credits</DialogTitle>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4 py-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">User</p>
                  <p className="text-foreground font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                  <p className="text-foreground font-medium">${Number(selectedUser.credits).toFixed(2)}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-foreground">Credit Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount (positive or negative)"
                    className="bg-background border-border text-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    New balance will be: ${(Number(selectedUser.credits) + creditAmount).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-foreground">Reason</Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are you granting/removing credits?"
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={grantCredits} className="flex-1">
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowModal(false)
                      setSelectedUser(null)
                      setCreditAmount(0)
                      setReason("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}