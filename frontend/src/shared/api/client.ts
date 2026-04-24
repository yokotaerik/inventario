import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim() || '/',
})

const TOKEN_KEY = 'inventory_admin_token'

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export const persistToken = (token: string | null) => {
  if (typeof window === 'undefined') return
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

export const getErrorMessage = (fallback: string, err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string' && detail.trim().length > 0) return detail
  }
  return fallback
}

export const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
})
