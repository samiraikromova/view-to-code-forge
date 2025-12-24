import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isUserAllowed } from '@/lib/allowList'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAllowList?: boolean
}

export function ProtectedRoute({ children, requireAllowList = true }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [checkingAllowList, setCheckingAllowList] = useState(requireAllowList)
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkAllowList() {
      if (!user?.email || !requireAllowList) {
        setCheckingAllowList(false)
        setIsAllowed(true)
        return
      }

      const allowed = await isUserAllowed(user.email)
      setIsAllowed(allowed)
      setCheckingAllowList(false)
    }

    if (user && requireAllowList) {
      checkAllowList()
    } else if (user && !requireAllowList) {
      setCheckingAllowList(false)
      setIsAllowed(true)
    }
  }, [user, requireAllowList])

  // Show loading while checking auth
  if (loading || checkingAllowList) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // User not on allow list - redirect to access denied
  if (requireAllowList && isAllowed === false) {
    return <Navigate to="/auth/access-denied" replace />
  }

  return <>{children}</>
}
