const TOKEN_KEY = 'empulse.access'
const REFRESH_KEY = 'empulse.refresh'

export type ApiErrorBody = {
  code?: string
  detail?: string
}

export class ApiRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function setTokens(access: string, refresh?: string): void {
  localStorage.setItem(TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(path, { ...init, headers })
  if (!response.ok) {
    let code = 'error.unknown'
    try {
      const body = (await response.json()) as ApiErrorBody
      if (body.code) code = body.code
    } catch {
      /* ignore */
    }
    throw new ApiRequestError(response.status, code)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
