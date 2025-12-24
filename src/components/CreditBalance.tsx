import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { ChevronDown, CreditCard, TrendingUp } from "lucide-react"

interface CreditBalanceProps {
  userId: string
}

export function CreditBalance({ userId }: CreditBalanceProps) {
  const [credits, setCredits] = useState<number>(0)
  const [tier, setTier] = useState<string>('free')
  const [monthlyAllowance, setMonthlyAllowance] = useState<number>(0)
  const [renewalDate, setRenewalDate] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBalance()
    const interval = setInterval(fetchBalance, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchBalance() {
    const { data: user } = await supabase
      .from('users')
      .select('credits, subscription_tier')
      .eq('id', userId)
      .single()

    if (user) {
      setCredits(Number(user.credits) || 0)
      setTier(user.subscription_tier || 'free')
    }

    const { data: creditData } = await supabase
      .from('user_credits')
      .select('monthly_allowance, renewal_date')
      .eq('user_id', userId)
      .single()

    if (creditData) {
      setMonthlyAllowance(Number(creditData.monthly_allowance) || 0)
      setRenewalDate(creditData.renewal_date)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'tier1': return 'Starter'
      case 'tier2': return 'Pro'
      default: return 'Free'
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity text-foreground"
      >
        <span className="text-sm font-medium">
          {credits.toFixed(2)} credits
        </span>
        <ChevronDown 
          className={`h-3 w-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-lg shadow-lg py-2 z-50">
          {/* Current Balance */}
          <div className="px-4 py-3 border-b border-border">
            <div className="text-xs text-muted-foreground mb-1">Current Balance</div>
            <div className="text-2xl font-bold text-foreground">
              {credits.toFixed(2)} credits
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                {getTierLabel(tier)}
              </div>
            </div>
          </div>

          {/* Monthly Allowance */}
          {tier !== 'free' && (
            <div className="px-4 py-3 border-b border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Monthly Allowance</span>
                <span className="text-sm font-semibold text-foreground">
                  {monthlyAllowance.toFixed(2)} credits
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Renews</span>
                <span className="text-sm text-foreground">
                  {formatDate(renewalDate)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-2 space-y-1">
            <button
              onClick={() => {
                navigate('/pricing/top-up')
                setDropdownOpen(false)
              }}
              className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Top Up Credits
            </button>

            {tier === 'free' && (
              <button
                onClick={() => {
                  navigate('/pricing')
                  setDropdownOpen(false)
                }}
                className="w-full px-4 py-2 border border-border hover:bg-surface-hover text-foreground rounded-lg text-sm font-medium transition-colors"
              >
                Upgrade Plan
              </button>
            )}

            <button
              onClick={() => {
                navigate('/admin/usage')
                setDropdownOpen(false)
              }}
              className="w-full px-4 py-2 text-left text-sm text-muted-foreground hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              View Usage History
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
