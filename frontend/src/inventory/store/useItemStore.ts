import { create } from 'zustand'
import { api, getStoredToken, persistToken, getErrorMessage, authHeaders } from '../../shared/api/client'

export type ItemStatus = 'available' | 'lent' | 'maintenance'

export interface Item {
  id: number
  name: string
  category: string
  qr_code_hash: string
  status: ItemStatus
  parent_item_id: number | null
  parent_item_name: string | null
  has_sub_items: boolean
  product_code: string | null
  purchase_code: string | null
  purchase_info: string | null
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

interface CreateItemPayload {
  name: string
  category: string
  qr_code_hash: string
  status: ItemStatus
  parent_item_id: number | null
  product_code: string | null
  purchase_code: string | null
  purchase_info: string | null
}

interface UpdateItemPayload {
  name: string
  category: string
  qr_code_hash: string
  status: ItemStatus
  parent_item_id: number | null
  product_code: string | null
  purchase_code: string | null
  purchase_info: string | null
}

type DeleteMode = 'move_children' | 'delete_children'

interface ItemState {
  allItems: Item[]
  statusItems: StatusItem[]
  adminLoading: boolean
  error: string | null
  authError: string | null
  fetchAllItems: () => Promise<void>
  fetchStatusItems: () => Promise<void>
  createItem: (payload: CreateItemPayload) => Promise<boolean>
  updateItem: (itemId: number, payload: UpdateItemPayload) => Promise<boolean>
  deleteItem: (itemId: number, mode: DeleteMode) => Promise<boolean>
  clearError: () => void
}

export const useItemStore = create<ItemState>((set) => ({
  allItems: [],
  statusItems: [],
  adminLoading: false,
  error: null,
  authError: null,

  fetchStatusItems: async () => {
    try {
      const res = await api.get<StatusItem[]>('/items/status')
      set({ statusItems: res.data })
    } catch {
      set({ error: 'Erro ao buscar status dos itens' })
    }
  },

  fetchAllItems: async () => {
    const token = getStoredToken()
    if (!token) { set({ allItems: [] }); return }
    set({ adminLoading: true, authError: null })
    try {
      const res = await api.get<Item[]>('/items', { headers: authHeaders(token) })
      set({ allItems: res.data, adminLoading: false })
    } catch {
      persistToken(null)
      set({ adminLoading: false, allItems: [], authError: 'Sessão expirada. Faça login novamente.' })
    }
  },

  createItem: async (payload) => {
    const token = getStoredToken()
    if (!token) { set({ authError: 'Você precisa fazer login para criar itens.' }); return false }
    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.post('/items', payload, { headers: authHeaders(token) })
      set({ adminLoading: false })
      const res = await api.get<Item[]>('/items', { headers: authHeaders(token) })
      const statusRes = await api.get<StatusItem[]>('/items/status')
      set({ allItems: res.data, statusItems: statusRes.data })
      return true
    } catch (err) {
      set({ adminLoading: false, authError: getErrorMessage('Erro ao criar item', err) })
      return false
    }
  },

  updateItem: async (itemId, payload) => {
    const token = getStoredToken()
    if (!token) { set({ authError: 'Você precisa fazer login para editar itens.' }); return false }
    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.put(`/items/${itemId}`, payload, { headers: authHeaders(token) })
      set({ adminLoading: false })
      const res = await api.get<Item[]>('/items', { headers: authHeaders(token) })
      const statusRes = await api.get<StatusItem[]>('/items/status')
      set({ allItems: res.data, statusItems: statusRes.data })
      return true
    } catch (err) {
      set({ adminLoading: false, authError: getErrorMessage('Erro ao editar item', err) })
      return false
    }
  },

  deleteItem: async (itemId, mode) => {
    const token = getStoredToken()
    if (!token) { set({ authError: 'Você precisa fazer login para excluir itens.' }); return false }
    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.delete(`/items/${itemId}`, { headers: authHeaders(token), params: { delete_mode: mode } })
      set({ adminLoading: false })
      const res = await api.get<Item[]>('/items', { headers: authHeaders(token) })
      const statusRes = await api.get<StatusItem[]>('/items/status')
      set({ allItems: res.data, statusItems: statusRes.data })
      return true
    } catch (err) {
      set({ adminLoading: false, authError: getErrorMessage('Erro ao excluir item', err) })
      return false
    }
  },

  clearError: () => set({ error: null, authError: null }),
}))
