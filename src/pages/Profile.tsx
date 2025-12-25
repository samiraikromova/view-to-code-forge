import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Mail, Calendar, CreditCard, Save } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState("")
  const [credits, setCredits] = useState(0)
  const [tier, setTier] = useState("free")
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "")
      setCredits(profile.credits || 0)
      setTier(profile.subscription_tier || "free")
    }
    if (user) {
      setCreatedAt(user.created_at || null)
    }
  }, [profile, user])

  const handleSaveProfile = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) throw error

      toast.success("Profile updated successfully")
      refreshProfile()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "tier1":
      case "starter":
        return "Starter"
      case "tier2":
      case "pro":
        return "Pro"
      default:
        return "Free"
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "tier1":
      case "starter":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "tier2":
      case "pro":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your account information</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your personal details and account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar and basic info */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {fullName || "User"}
                </h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="outline" className={`mt-2 ${getTierColor(tier)}`}>
                  {getTierLabel(tier)} Plan
                </Badge>
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-surface border-border"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{user?.email}</span>
                </div>
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={loading}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription & Credits */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription & Credits
            </CardTitle>
            <CardDescription>Your current plan and credit balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-xl font-semibold text-foreground">{getTierLabel(tier)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Credits Balance</p>
                <p className="text-xl font-semibold text-foreground">{credits.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={() => navigate("/settings")} variant="outline">
                Manage Subscription
              </Button>
              <Button onClick={() => navigate("/pricing/top-up")}>
                Top Up Credits
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Member since</span>
                <span className="text-sm text-foreground">{formatDate(createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="text-xs text-muted-foreground font-mono">{user?.id?.slice(0, 8)}...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
