import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { homePathForRole } from '../api/auth'
import { useAuth } from './AuthContext'

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode
  roles?: Array<'employee' | 'manager' | 'hr' | 'executive' | 'admin'>
}) {
  const { isAuthenticated, isLoading, user, sessionExitTo } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        …
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate to={sessionExitTo} replace state={{ from: location }} />
    )
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return children
}
