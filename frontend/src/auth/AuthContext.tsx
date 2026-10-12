import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import {
  fetchMe,
  homePathForRole,
  loginRequest,
  logoutLocal,
  type MeResponse,
} from '../api/auth'
import { getAccessToken } from '../api/client'
import { setUnauthorizedHandler } from '../api/session'

export type LogoutOptions = {
  /** Destination after clearing session. Default `/login`. */
  redirectTo?: '/login' | '/role'
}

type AuthContextValue = {
  user: MeResponse | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<MeResponse>
  logout: (options?: LogoutOptions) => void
  /** Where RequireAuth sends an unauthenticated user (avoids race with logout). */
  sessionExitTo: '/login' | '/role'
  homePath: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [hasToken, setHasToken] = useState(() => Boolean(getAccessToken()))
  const [sessionExitTo, setSessionExitTo] = useState<'/login' | '/role'>(
    '/login',
  )

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: hasToken,
    retry: false,
  })

  const clearSession = useCallback(
    (redirectTo: '/login' | '/role') => {
      setSessionExitTo(redirectTo)
      logoutLocal()
      setHasToken(false)
      queryClient.clear()
      navigate(redirectTo, { replace: true })
    },
    [navigate, queryClient],
  )

  const logout = useCallback(
    (options?: LogoutOptions) => {
      clearSession(options?.redirectTo ?? '/login')
    },
    [clearSession],
  )

  useEffect(() => {
    if (meQuery.isError) {
      clearSession('/login')
    }
  }, [meQuery.isError, clearSession])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession('/login')
    })
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  const login = useCallback(
    async (email: string, password: string) => {
      setSessionExitTo('/login')
      await loginRequest(email, password)
      setHasToken(true)
      const me = await queryClient.fetchQuery({
        queryKey: ['me'],
        queryFn: fetchMe,
      })
      return me
    },
    [queryClient],
  )

  const user = hasToken && meQuery.data ? meQuery.data : null
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: hasToken && meQuery.isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      sessionExitTo,
      homePath: user ? homePathForRole(user.role) : '/login',
    }),
    [user, hasToken, meQuery.isLoading, login, logout, sessionExitTo],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
