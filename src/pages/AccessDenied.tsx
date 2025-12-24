import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { Lock, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"

const AccessDenied = () => {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        
        <p className="text-muted-foreground">
          Your account is not on the allowed users list. Please contact support or 
          complete your subscription to gain access.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          <Button onClick={handleSignOut} variant="destructive">
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AccessDenied
