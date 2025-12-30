import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, CreditCard, Download, Check, Zap } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { PLANS, SubscriptionTier } from "@/types/subscription"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import ThrivecartEmbed, { ThrivecartButton, THRIVECART_PRODUCTS } from "@/components/ThrivecartEmbed"

interface BillingRecord {
  id: string
  date: string
  amount: number
  status: string
  type: string
}

export default function Settings() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free")
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      // Map tier values
      const tierMap: Record<string, SubscriptionTier> = {
        'free': 'free',
        'tier1': 'starter',
        'starter': 'starter',
        'tier2': 'pro',
        'pro': 'pro'
      }
      setCurrentTier(tierMap[profile.subscription_tier] || 'free')
    }
    if (user) {
      fetchBillingHistory()
    }
  }, [profile, user])

  async function fetchBillingHistory() {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setBillingHistory(data.map(tx => ({
          id: tx.id,
          date: new Date(tx.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          amount: Math.abs(tx.amount || 0),
          status: 'Completed',
          type: tx.type || 'Credit'
        })))
      }
    } catch (error) {
      console.error('Error fetching billing history:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProductId = (tier: SubscriptionTier): number => {
    if (tier === 'starter') return THRIVECART_PRODUCTS.starter.productId
    if (tier === 'pro') return THRIVECART_PRODUCTS.pro.productId
    return 0
  }

  return (
    <div className="min-h-screen bg-background">
      <ThrivecartEmbed />
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your subscription and billing</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-3xl font-bold text-foreground">{(profile?.credits || 0).toFixed(2)} credits</p>
                </div>
                <Button onClick={() => navigate("/pricing/top-up")} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Top Up
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-3xl font-bold text-foreground">{PLANS[currentTier].name}</p>
                </div>
                {currentTier !== 'pro' && (
                  <ThrivecartButton productId={THRIVECART_PRODUCTS.pro.productId} variant="outline" className="gap-2">
                    Upgrade
                  </ThrivecartButton>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Plan Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>Manage your current plan and billing cycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-surface/50">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{PLANS[currentTier].name} Plan</h3>
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                      Current Plan
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">${PLANS[currentTier].price}/month</p>
                  <ul className="mt-3 space-y-2">
                    {PLANS[currentTier].features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  {currentTier !== "pro" && (
                    <ThrivecartButton productId={THRIVECART_PRODUCTS.pro.productId} className="bg-accent hover:bg-accent/90">
                      Upgrade to Pro
                    </ThrivecartButton>
                  )}
                  {currentTier !== "free" && (
                    <Button variant="outline">Cancel Subscription</Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Available Plans */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Available Plans</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(PLANS) as SubscriptionTier[]).map((tier) => {
                    const plan = PLANS[tier]
                    const isCurrent = tier === currentTier
                    return (
                      <div
                        key={tier}
                        className={`p-4 border rounded-lg ${
                          isCurrent ? "border-primary bg-primary/5" : "border-border bg-surface/30"
                        }`}
                      >
                        <h5 className="font-semibold text-foreground">{plan.name}</h5>
                        <p className="text-2xl font-bold text-foreground mt-2">${plan.price}</p>
                        <p className="text-xs text-muted-foreground">per month</p>
                        <ul className="mt-4 space-y-2">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        {!isCurrent && tier !== "free" && (
                          <ThrivecartButton
                            productId={getProductId(tier)}
                            variant={tier === "pro" ? "default" : "outline"}
                            className="w-full mt-4"
                            size="sm"
                          >
                            {tier === "pro" ? "Upgrade" : "Switch"}
                          </ThrivecartButton>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View your recent transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {billingHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingHistory.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium font-mono text-xs">
                        {record.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell className="capitalize">{record.type}</TableCell>
                      <TableCell>{record.amount.toFixed(2)} credits</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? "Loading..." : "No transactions yet"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your payment options via ThriveCart</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Payment methods are managed through ThriveCart's secure payment system.
              </p>
              <Button variant="outline" onClick={() => window.open('https://thrivecart.com/account', '_blank')}>
                Manage on ThriveCart
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}