import { useEffect, useState } from "react"
import { AdminLayout } from "./AdminLayout"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Search, UserPlus, MoreVertical, Mail, Check, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  full_name: string | null
  credits: number
  subscription_tier: string
  created_at: string
}

interface AllowedUser {
  email: string
  is_active: boolean
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [allowedEmails, setAllowedEmails] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [newEmail, setNewEmail] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [usersRes, allowedRes] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('allowed_users').select('email, is_active').eq('is_active', true)
      ])

      if (usersRes.data) setUsers(usersRes.data)
      if (allowedRes.data) {
        setAllowedEmails(new Set(allowedRes.data.map(u => u.email.toLowerCase())))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddToAllowList = async (email: string) => {
    const { error } = await supabase
      .from('allowed_users')
      .upsert({ 
        email: email.toLowerCase(), 
        is_active: true,
        reason: 'admin_added',
        updated_at: new Date().toISOString()
      })

    if (error) {
      toast.error('Failed to add user')
    } else {
      setAllowedEmails(prev => new Set([...prev, email.toLowerCase()]))
      toast.success('User added to allow list')
    }
  }

  const handleRemoveFromAllowList = async (email: string) => {
    const { error } = await supabase
      .from('allowed_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('email', email.toLowerCase())

    if (error) {
      toast.error('Failed to remove user')
    } else {
      setAllowedEmails(prev => {
        const newSet = new Set(prev)
        newSet.delete(email.toLowerCase())
        return newSet
      })
      toast.success('User removed from allow list')
    }
  }

  const handleAddNewUser = async () => {
    if (!newEmail.trim()) return
    
    await handleAddToAllowList(newEmail.trim())
    setNewEmail("")
  }

  const getTierBadge = (tier: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      'tier2': 'default',
      'tier1': 'secondary',
      'free': 'outline'
    }
    const labels: Record<string, string> = {
      'tier2': 'Pro',
      'tier1': 'Starter',
      'free': 'Free'
    }
    return (
      <Badge variant={variants[tier] || 'outline'}>
        {labels[tier] || tier}
      </Badge>
    )
  }

  return (
    <AdminLayout currentPage="users">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
        </div>

        {/* Add user to allow list */}
        <Card className="bg-surface border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">Add User to Allow List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-background border-border text-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewUser()}
              />
              <Button onClick={handleAddNewUser}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
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

        {/* Users Table */}
        <Card className="bg-surface border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Credits</TableHead>
                  <TableHead className="text-muted-foreground">Tier</TableHead>
                  <TableHead className="text-muted-foreground">Allowed</TableHead>
                  <TableHead className="text-muted-foreground w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell colSpan={6}>
                        <div className="h-8 bg-muted rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-border hover:bg-surface-hover">
                      <TableCell className="text-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{user.full_name || '-'}</TableCell>
                      <TableCell className="text-foreground">{Number(user.credits || 0).toFixed(2)}</TableCell>
                      <TableCell>{getTierBadge(user.subscription_tier || 'free')}</TableCell>
                      <TableCell>
                        {allowedEmails.has(user.email?.toLowerCase()) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {allowedEmails.has(user.email?.toLowerCase()) ? (
                              <DropdownMenuItem 
                                onClick={() => handleRemoveFromAllowList(user.email)}
                                className="text-destructive focus:text-destructive"
                              >
                                Remove from Allow List
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleAddToAllowList(user.email)}>
                                Add to Allow List
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
