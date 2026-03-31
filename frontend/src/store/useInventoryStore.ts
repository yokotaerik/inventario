import { create } from 'zustand'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
})

const TOKEN_KEY = 'inventory_admin_token'

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(TOKEN_KEY)
}

const persistToken = (token: string | null) => {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_KEY)
  }
}

const getErrorMessage = (fallbackMessage: string, err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return detail
    }
  }
  return fallbackMessage
}

export type ItemStatus = 'available' | 'lent' | 'maintenance'

export interface Employee {
  id: number
  name: string
  department: string
  is_active: boolean
}

export interface Item {
  id: number
  name: string
  category: string
  qr_code_hash: string
  status: ItemStatus
  parent_item_id: number | null
  parent_item_name: string | null
  has_sub_items: boolean
}

export interface StatusItem {
  id: number
  name: string
  category: string
  status: ItemStatus
  holder: string | null
  parent_item_id: number | null
  parent_item_name: string | null
  has_sub_items: boolean
}

interface TransactionEmployee {
  id: number
  name: string
}

interface TransactionInfo {
  id: number
  employee: TransactionEmployee | null
}

interface ScanResponse {
  item: Item
  current_transaction: TransactionInfo | null
}

export interface TransactionHistory {
  id: number
  item_name: string
  item_category: string
  employee_name: string
  destino: string | null
  observacao: string | null
  observacao_checkin: string | null
  checkout_time: string | null
  checkin_time: string | null
}

interface CreateItemPayload {
  name: string
  category: string
  qr_code_hash: string
  status: ItemStatus
  parent_item_id: number | null
}

interface UpdateItemPayload {
  name: string
  category: string
  qr_code_hash: string
  status: ItemStatus
  parent_item_id: number | null
}

interface CheckoutOptions {
  destino?: string
  observacao?: string
}

interface CheckinOptions {
  observacao?: string
}

type DeleteMode = 'move_children' | 'delete_children'

interface InventoryState {
  employees: Employee[]
  currentItem: ScanResponse | null
  statusItems: StatusItem[]
  allItems: Item[]
  transactions: TransactionHistory[]
  loading: boolean
  adminLoading: boolean
  error: string | null
  authError: string | null
  authToken: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  fetchEmployees: () => Promise<void>
  fetchStatusItems: () => Promise<void>
  fetchAllItems: () => Promise<void>
  fetchTransactions: () => Promise<void>
  scanItem: (qrHash: string) => Promise<void>
  checkout: (itemId: number, employeeId: number, options?: CheckoutOptions) => Promise<void>
  checkin: (itemId: number, options?: CheckinOptions) => Promise<void>
  createItem: (payload: CreateItemPayload) => Promise<boolean>
  updateItem: (itemId: number, payload: UpdateItemPayload) => Promise<boolean>
  deleteItem: (itemId: number, mode: DeleteMode) => Promise<boolean>
  clearError: () => void
  clearCurrentItem: () => void
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  employees: [],
  currentItem: null,
  statusItems: [],
  allItems: [],
  transactions: [],
  loading: false,
  adminLoading: false,
  error: null,
  authError: null,
  authToken: getStoredToken(),
  isAuthenticated: Boolean(getStoredToken()),

  login: async (username, password) => {
    set({ adminLoading: true, authError: null })
    try {
      const response = await api.post<{ token: string }>('/auth/login', { username, password })
      const token = response.data.token
      persistToken(token)
      set({
        authToken: token,
        isAuthenticated: true,
        adminLoading: false,
        authError: null,
      })
      await get().fetchAllItems()
      return true
    } catch (err) {
      persistToken(null)
      set({
        adminLoading: false,
        authToken: null,
        isAuthenticated: false,
        authError: getErrorMessage('Login inválido', err),
      })
      return false
    }
  },

  logout: () => {
    persistToken(null)
    set({
      authToken: null,
      isAuthenticated: false,
      allItems: [],
      authError: null,
    })
  },

  fetchEmployees: async () => {
    try {
      const response = await api.get<Employee[]>('/employees/active')
      set({ employees: response.data })
    } catch (_err) {
      set({ error: 'Erro ao buscar funcionários' })
    }
  },

  fetchStatusItems: async () => {
    try {
      const response = await api.get<StatusItem[]>('/items/status')
      set({ statusItems: response.data })
    } catch (_err) {
      set({ error: 'Erro ao buscar status dos itens' })
    }
  },

  fetchAllItems: async () => {
    const { authToken } = get()
    if (!authToken) {
      set({ allItems: [] })
      return
    }

    set({ adminLoading: true, authError: null })
    try {
      const response = await api.get<Item[]>('/items', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      set({ allItems: response.data, adminLoading: false })
    } catch (_err) {
      persistToken(null)
      set({
        adminLoading: false,
        isAuthenticated: false,
        authToken: null,
        allItems: [],
        authError: 'Sessão expirada. Faça login novamente.',
      })
    }
  },

  fetchTransactions: async () => {
    try {
      const response = await api.get<TransactionHistory[]>('/transactions/history')
      set({ transactions: response.data })
    } catch (_err) {
      set({ error: 'Erro ao buscar histórico' })
    }
  },

  scanItem: async (qrHash: string) => {
    set({ loading: true, error: null })
    try {
      const response = await api.get<ScanResponse>(`/items/qr/${qrHash}`)
      set({ currentItem: response.data, loading: false })
    } catch (_err) {
      set({ error: 'Item não encontrado', loading: false })
    }
  },

  checkout: async (itemId, employeeId, options) => {
    try {
      await api.post('/transactions/checkout', null, {
        params: {
          item_id: itemId,
          employee_id: employeeId,
          destino: options?.destino || undefined,
          observacao: options?.observacao || undefined,
        },
      })
      set({ currentItem: null, error: null })
      await get().fetchStatusItems()
      if (get().isAuthenticated) {
        await get().fetchAllItems()
      }
    } catch (_err) {
      set({ error: 'Erro ao realizar retirada' })
    }
  },

  checkin: async (itemId, options) => {
    try {
      await api.post('/transactions/checkin', null, {
        params: {
          item_id: itemId,
          observacao: options?.observacao || undefined,
        },
      })
      set({ currentItem: null, error: null })
      await get().fetchStatusItems()
      if (get().isAuthenticated) {
        await get().fetchAllItems()
      }
    } catch (_err) {
      set({ error: 'Erro ao realizar devolução' })
    }
  },

  createItem: async (payload) => {
    const { authToken } = get()
    if (!authToken) {
      set({ authError: 'Você precisa fazer login para criar itens.' })
      return false
    }

    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.post('/items', payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      set({ adminLoading: false })
      await get().fetchAllItems()
      await get().fetchStatusItems()
      return true
    } catch (err) {
      set({
        adminLoading: false,
        authError: getErrorMessage('Erro ao criar item', err),
      })
      return false
    }
  },

  updateItem: async (itemId, payload) => {
    const { authToken } = get()
    if (!authToken) {
      set({ authError: 'Você precisa fazer login para editar itens.' })
      return false
    }

    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.put(`/items/${itemId}`, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      set({ adminLoading: false })
      await get().fetchAllItems()
      await get().fetchStatusItems()
      return true
    } catch (err) {
      set({
        adminLoading: false,
        authError: getErrorMessage('Erro ao editar item', err),
      })
      return false
    }
  },

  deleteItem: async (itemId, mode) => {
    const { authToken } = get()
    if (!authToken) {
      set({ authError: 'Você precisa fazer login para excluir itens.' })
      return false
    }

    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.delete(`/items/${itemId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { delete_mode: mode },
      })
      set({ adminLoading: false })
      await get().fetchAllItems()
      await get().fetchStatusItems()
      return true
    } catch (err) {
      set({
        adminLoading: false,
        authError: getErrorMessage('Erro ao excluir item', err),
      })
      return false
    }
  },

  clearError: () => {
    set({ error: null, authError: null })
  },

  clearCurrentItem: () => {
    set({ currentItem: null })
  },
}))
