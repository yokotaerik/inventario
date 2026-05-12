import { create } from 'zustand'
import { api, getStoredToken, getErrorMessage, authHeaders } from '../../shared/api/client'

// ── Types ────────────────────────────────────────────────────────────────────

export type CustomerStatus = 'active' | 'inactive' | 'completed'

export interface Customer {
  id: number
  code: string
  name: string
  description: string | null
  status: CustomerStatus
  created_at: string | null
  project_count: number
}

interface CreateCustomerPayload {
  code: string
  name: string
  description?: string | null
}

interface UpdateCustomerPayload {
  code?: string
  name?: string
  description?: string | null
  status?: CustomerStatus
}

// ── Store ────────────────────────────────────────────────────────────────────

interface CustomerState {
  customers: Customer[]
  loading: boolean
  error: string | null

  fetchCustomers: () => Promise<void>
  createCustomer: (payload: CreateCustomerPayload) => Promise<boolean>
  updateCustomer: (id: number, payload: UpdateCustomerPayload) => Promise<boolean>
  deleteCustomer: (id: number) => Promise<boolean>

  clearError: () => void
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    try {
      const res = await api.get<Customer[]>('/customers')
      set({ customers: Array.isArray(res.data) ? res.data : [] })
    } catch {
      set({ error: 'Erro ao buscar clientes' })
    }
  },

  createCustomer: async (payload) => {
    const token = getStoredToken()
    if (!token) {
      set({ error: 'Login necessário' })
      return false
    }
    set({ loading: true, error: null })
    try {
      await api.post('/customers', payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchCustomers()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao criar cliente', err) })
      return false
    }
  },

  updateCustomer: async (id, payload) => {
    const token = getStoredToken()
    if (!token) {
      set({ error: 'Login necessário' })
      return false
    }
    set({ loading: true, error: null })
    try {
      await api.put(`/customers/${id}`, payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchCustomers()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao atualizar cliente', err) })
      return false
    }
  },

  deleteCustomer: async (id) => {
    const token = getStoredToken()
    if (!token) {
      set({ error: 'Login necessário' })
      return false
    }
    set({ loading: true, error: null })
    try {
      await api.delete(`/customers/${id}`, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchCustomers()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao excluir cliente', err) })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))
