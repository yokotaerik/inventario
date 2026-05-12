import { create } from 'zustand'
import { api, getStoredToken, persistToken, getErrorMessage } from '../api/client'
import { useItemStore } from '../../inventory/store/useItemStore'
import { useEmployeeStore } from '../../workforce/store/useEmployeeStore'

export interface AuthUser {
  id: number
  name: string
  email: string
  is_admin: boolean
}

interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
  adminLoading: boolean
  authError: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  hydrateUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: Boolean(getStoredToken()),
  user: null,
  adminLoading: false,
  authError: null,

  login: async (email, password) => {
    set({ adminLoading: true, authError: null })
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password })
      const token = res.data.token
      persistToken(token)
      set({
        isAuthenticated: true,
        user: res.data.user,
        adminLoading: false,
        authError: null,
      })
      await useItemStore.getState().fetchAllItems()
      await useEmployeeStore.getState().fetchAllEmployees()
      return true
    } catch (err) {
      persistToken(null)
      set({
        adminLoading: false,
        isAuthenticated: false,
        user: null,
        authError: getErrorMessage('Login inválido', err),
      })
      return false
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Logout error is not critical
    }
    persistToken(null)
    set({ isAuthenticated: false, user: null, authError: null })
    useItemStore.setState({ allItems: [] })
    useEmployeeStore.setState({ allEmployees: [] })
  },

  hydrateUser: async () => {
    const token = getStoredToken()
    if (!token) {
      set({ isAuthenticated: false, user: null })
      return
    }
    try {
      const res = await api.get<AuthUser>('/auth/me')
      set({ user: res.data, isAuthenticated: true })
    } catch {
      persistToken(null)
      set({ isAuthenticated: false, user: null })
    }
  },
}))
