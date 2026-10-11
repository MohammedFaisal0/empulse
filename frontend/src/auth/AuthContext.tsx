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

import {
  fetchMe,
  homePathForRole,
  loginRequest,
  logoutLocal,
  type MeResponse,
} from '../api/auth'
import { getAccessToken } from '../api/client'

type AuthContextValue = {
  user: MeResponse | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<MeResponse>
  logout: () => void
  homePath: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [hasToken, setHasToken] = useState(() => Boolean(getAccessToken()))

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: hasToken,
    retry: false,
  })

  useEffect(() => {
    if (meQuery.isError) {
      logoutLocal()
      setHasToken(false)
    }
  }, [meQuery.isError])

  const login = useCallback(
    async (email: string, password: string) => {
      await loginRequest(email, password)
      setHasToken(true)
      const me = await queryClient.fetchQuery({ queryKey: ['me'], queryFn: fetchMe })
      return me
    },
    [queryClient],
  )

  const logout = useCallback(() => {
    logoutLocal()
    setHasToken(false)
    queryClient.clear()
  }, [queryClient])

  const user = hasToken && meQuery.data ? meQuery.data : null
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: hasToken && meQuery.isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      homePath: user ? homePathForRole(user.role) : '/login',
    }),
    [user, hasToken, meQuery.isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
