import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { isAdminEmail } from "@/lib/adminList"
import { supabase } from "@/lib/supabase"
import { 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
  Home,
  Shield,
  Ticket,
  FolderKanban,
  MessageSquare,
  Video,
  PanelLeftClose,
  PanelLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface AdminLayoutProps {
  children: React.ReactNode
  currentPage: string
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Home, path: "/admin" },
  { id: "users", label: "Users", icon: Users, path: "/admin/users" },
  { id: "credits", label: "Credits", icon: CreditCard, path: "/admin/credits" },
  { id: "usage", label: "Usage Analytics", icon: BarChart3, path: "/admin/usage" },
  { id: "coupons", label: "Coupons", icon: Ticket, path: "/admin/coupons" },
  { id: "projects", label: "Projects", icon: FolderKanban, path: "/admin/projects" },
  { id: "prompts", label: "System Prompts", icon: MessageSquare, path: "/admin/prompts" },
  { id: "videos", label: "Videos", icon: Video, path: "/admin/videos" },
  { id: "settings", label: "Settings", icon: Settings, path: "/admin/settings" },
]

export function AdminLayout({ children, currentPage }: AdminLayoutProps) {
  const navigate = useNavigate()
  const { user, profile, signOut, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      if (!user?.email) {
        setIsAdmin(false)
        setChecking(false)
        return
      }
      const admin = await isAdminEmail(user.email)
      setIsAdmin(admin)
      setChecking(false)
    }
    if (!loading) {
      checkAdmin()
    }
  }, [user, loading])

  if (loading || checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background gap-4">
        <Shield className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
        <Button onClick={() => navigate("/chat")}>
          Return to Chat
        </Button>
      </div>
    )
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/auth/login")
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "border-r border-border bg-surface flex flex-col theme-light-purple transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className={cn("flex items-center gap-2", isCollapsed && "justify-center w-full")}>
            <Shield className="h-6 w-6 text-primary flex-shrink-0" />
            {!isCollapsed && <span className="font-bold text-foreground">Admin Panel</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("h-8 w-8 flex-shrink-0", isCollapsed && "hidden")}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        
        {isCollapsed && (
          <div className="p-2 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="w-full h-8"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isCollapsed && "justify-center px-2",
                  currentPage === item.id 
                    ? "bg-primary/20 text-primary" 
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && item.label}
              </button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          {!isCollapsed && (
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary-foreground">
                  {profile?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.name || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            className={cn(
              "w-full text-destructive hover:text-destructive hover:bg-destructive/10",
              isCollapsed ? "justify-center px-2" : "justify-start"
            )}
            onClick={handleSignOut}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
