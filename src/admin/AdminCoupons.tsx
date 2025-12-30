import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { AdminLayout } from "./AdminLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Coupon {
  code: string
  type: 'trial' | 'discount'
  months: number | null
  discount_percent: number | null
  max_uses: number | null
  uses: number
  expires_at: string | null
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newCoupon, setNewCoupon] = useState<Partial<Coupon>>({
    code: '',
    type: 'trial',
    months: 3,
    discount_percent: null,
    max_uses: null,
    uses: 0,
    expires_at: null
  })

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('code', { ascending: true })
    
    if (error) {
      toast.error('Failed to load coupons')
    } else {
      setCoupons(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const generateCode = () => {
    const code = `TRIAL${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    setNewCoupon({ ...newCoupon, code })
  }

  const createCoupon = async () => {
    if (!newCoupon.code) {
      toast.error('Code is required')
      return
    }

    const { error } = await supabase.from('coupons').insert({
      code: newCoupon.code,
      type: newCoupon.type,
      months: newCoupon.type === 'trial' ? newCoupon.months : null,
      discount_percent: newCoupon.type === 'discount' ? newCoupon.discount_percent : null,
      max_uses: newCoupon.max_uses,
      uses: 0,
      expires_at: newCoupon.expires_at
    })

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Coupon created')
      setShowModal(false)
      setNewCoupon({
        code: '',
        type: 'trial',
        months: 3,
        discount_percent: null,
        max_uses: null,
        uses: 0,
        expires_at: null
      })
      load()
    }
  }

  const deleteCoupon = async (code: string) => {
    if (confirm(`Delete coupon ${code}?`)) {
      const { error } = await supabase.from('coupons').delete().eq('code', code)
      if (error) {
        toast.error('Failed to delete coupon')
      } else {
        toast.success('Coupon deleted')
        load()
      }
    }
  }

  return (
    <AdminLayout currentPage="coupons">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Coupon Management</h1>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Coupon
          </Button>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No coupons found
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map(c => (
                  <TableRow key={c.code}>
                    <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                    <TableCell>
                      <Badge variant={c.type === 'trial' ? 'secondary' : 'default'}>
                        {c.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.type === 'trial' ? `${c.months} months` : `${c.discount_percent}% off`}
                    </TableCell>
                    <TableCell>
                      {c.uses} {c.max_uses ? `/ ${c.max_uses}` : ''}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCoupon(c.code)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Coupon</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Coupon Code</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                    placeholder="COUPONCODE"
                  />
                  <Button variant="outline" onClick={generateCode}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Type</Label>
                <Select
                  value={newCoupon.type}
                  onValueChange={(v) => setNewCoupon({...newCoupon, type: v as 'trial' | 'discount'})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial (Free Months)</SelectItem>
                    <SelectItem value="discount">Discount (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newCoupon.type === 'trial' && (
                <div>
                  <Label>Trial Duration (Months)</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={newCoupon.months || 3}
                    onChange={(e) => setNewCoupon({...newCoupon, months: parseInt(e.target.value)})}
                  />
                </div>
              )}

              {newCoupon.type === 'discount' && (
                <div>
                  <Label>Discount Percent</Label>
                  <Input
                    type="number"
                    className="mt-1"
                    value={newCoupon.discount_percent || 0}
                    onChange={(e) => setNewCoupon({...newCoupon, discount_percent: parseInt(e.target.value)})}
                  />
                </div>
              )}

              <div>
                <Label>Max Uses (optional)</Label>
                <Input
                  type="number"
                  className="mt-1"
                  placeholder="Unlimited"
                  value={newCoupon.max_uses || ''}
                  onChange={(e) => setNewCoupon({...newCoupon, max_uses: e.target.value ? parseInt(e.target.value) : null})}
                />
              </div>

              <div>
                <Label>Expiration Date (optional)</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={newCoupon.expires_at || ''}
                  onChange={(e) => setNewCoupon({...newCoupon, expires_at: e.target.value || null})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={createCoupon} className="flex-1">
                  Create
                </Button>
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
