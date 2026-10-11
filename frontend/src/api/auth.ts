import { apiFetch, clearTokens, setTokens } from './client'

export type LoginResponse = {
  access: string
  refresh: string
}

export type MeResponse = {
  role: 'employee' | 'manager' | 'hr' | 'executive' | 'admin'
  employee_id: number | null
  name: string | null
  team: string | null
  email: string
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setTokens(data.access, data.refresh)
  return data
}

export async function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/api/users/me/')
}

export function logoutLocal(): void {
  clearTokens()
}

export function homePathForRole(role: MeResponse['role']): string {
  switch (role) {
    case 'manager':
      return '/manager/overview'
    case 'hr':
    case 'executive':
    case 'admin':
      return '/hr/executive'
    case 'employee':
    default:
      return '/employee/overview'
  }
}
