import { create } from 'zustand'
import { api, getStoredToken, getErrorMessage, authHeaders } from '../../shared/api/client'

export interface StockItem {
  id: number
  name: string
  category: string
  quantity: number
  product_code: string | null
  qr_code_hash: string | null
  project_id: number | null
  project_name: string | null
  project_code: string | null
  location_id: number | null
  location_name: string | null
  purchase_code: string | null
  purchase_info: string | null
  created_at: string | null
}

interface CreateStockItemPayload {
  name: string
  category: string
  units: number
  quantity?: number | null
  qr_code_hash: string | null
  product_code: string | null
  project_id: number | null
  location_id: number | null
  purchase_code: string | null
  purchase_info: string | null
}

interface UpdateStockItemPayload {
  name: string
  category: string
  project_id: number | null
  location_id: number | null
  purchase_code: string | null
  purchase_info: string | null
}

interface StockState {
  stockItems: StockItem[]
  loading: boolean
  error: string | null

  fetchStockItems: () => Promise<void>
  createStockItem: (payload: CreateStockItemPayload) => Promise<boolean>
  updateStockItem: (id: number, payload: UpdateStockItemPayload) => Promise<boolean>
  deleteStockItem: (id: number) => Promise<boolean>

  clearError: () => void
}

export const useStockStore = create<StockState>((set, get) => ({
  stockItems: [],
  loading: false,
  error: null,

  fetchStockItems: async () => {
    try {
      const res = await api.get<StockItem[]>('/stock')
      set({ stockItems: res.data })
    } catch {
      set({ error: 'Erro ao buscar itens de estoque' })
    }
  },

  createStockItem: async (payload) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.post('/stock', payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchStockItems()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao criar item de estoque', err) })
      return false
    }
  },

  updateStockItem: async (id, payload) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.put(`/stock/${id}`, payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchStockItems()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao atualizar item de estoque', err) })
      return false
    }
  },

  deleteStockItem: async (id) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.delete(`/stock/${id}`, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchStockItems()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao excluir item de estoque', err) })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))
