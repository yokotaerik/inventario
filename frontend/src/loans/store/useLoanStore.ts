import { create } from 'zustand'
import { api, getErrorMessage } from '../../shared/api/client'
import type { TransactionHistory } from '../../shared/utils/formatters'

export type { TransactionHistory }

interface TransactionEmployee {
  id: number
  name: string
}

interface TransactionInfo {
  id: number
  employee: TransactionEmployee | null
}

interface BatchItemSummary {
  id: number
  name: string
  reason?: string
}

export interface BatchOperationResult {
  message: string
  mode: string
  container_item_id: number
  processed_items: BatchItemSummary[]
  processed_count: number
  skipped_items: BatchItemSummary[]
  skipped_count: number
}

export interface ScanResponse {
  item: {
    id: number
    name: string
    category: string
    status: 'available' | 'lent' | 'maintenance'
    parent_item_id: number | null
    has_sub_items: boolean
    qr_code_hash: string
  }
  current_transaction: TransactionInfo | null
  family_container_id: number
  family_children: Array<{
    id: number
    name: string
    status: 'available' | 'lent' | 'maintenance'
    current_transaction: TransactionInfo | null
  }>
  family_lent_items: Array<{
    id: number
    name: string
    status: 'available' | 'lent' | 'maintenance'
    current_transaction: TransactionInfo | null
  }>
  is_container_scan: boolean
}

interface CheckoutOptions {
  destino?: string
  observacao?: string
}

interface CheckinOptions {
  observacao?: string
}

interface LoanState {
  transactions: TransactionHistory[]
  currentItem: ScanResponse | null
  loading: boolean
  error: string | null
  fetchTransactions: () => Promise<void>
  scanItem: (qrHash: string) => Promise<void>
  checkout: (itemId: number, options?: CheckoutOptions) => Promise<void>
  checkin: (itemId: number, options?: CheckinOptions) => Promise<void>
  checkoutContainer: (
    containerItemId: number,
    mode: 'full_available' | 'single_child',
    options?: CheckoutOptions & { targetChildId?: number },
  ) => Promise<BatchOperationResult | null>
  checkinContainer: (
    containerItemId: number,
    mode: 'all_lent' | 'single_lent',
    options?: CheckinOptions & { targetItemId?: number; employeeId?: number },
  ) => Promise<BatchOperationResult | null>
  clearCurrentItem: () => void
  clearError: () => void
}

export const useLoanStore = create<LoanState>((set) => ({
  transactions: [],
  currentItem: null,
  loading: false,
  error: null,

  fetchTransactions: async () => {
    try {
      const res = await api.get<TransactionHistory[]>('/transactions/history')
      set({ transactions: res.data })
    } catch {
      set({ error: 'Erro ao buscar histórico' })
    }
  },

  scanItem: async (qrHash) => {
    set({ loading: true, error: null })
    try {
      const res = await api.get<ScanResponse>(`/items/qr/${qrHash}`)
      set({ currentItem: res.data, loading: false })
    } catch {
      set({ error: 'Item não encontrado', loading: false })
    }
  },

  checkout: async (itemId, options) => {
    try {
      await api.post('/transactions/checkout', null, {
        params: {
          item_id: itemId,
          destino: options?.destino || undefined,
          observacao: options?.observacao || undefined,
        },
      })
      set({ currentItem: null, error: null })
    } catch {
      set({ error: 'Erro ao realizar retirada' })
    }
  },

  checkoutContainer: async (containerItemId, mode, options) => {
    try {
      const res = await api.post<BatchOperationResult>('/transactions/checkout/container', null, {
        params: {
          container_item_id: containerItemId,
          mode,
          target_child_id: options?.targetChildId || undefined,
          destino: options?.destino || undefined,
          observacao: options?.observacao || undefined,
        },
      })
      set({ currentItem: null, error: null })
      return res.data
    } catch (err) {
      set({ error: getErrorMessage('Erro ao realizar retirada da maleta', err) })
      return null
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
    } catch {
      set({ error: 'Erro ao realizar devolução' })
    }
  },

  checkinContainer: async (containerItemId, mode, options) => {
    try {
      const res = await api.post<BatchOperationResult>('/transactions/checkin/container', null, {
        params: {
          container_item_id: containerItemId,
          mode,
          target_item_id: options?.targetItemId || undefined,
          employee_id: options?.employeeId || undefined,
          observacao: options?.observacao || undefined,
        },
      })
      set({ currentItem: null, error: null })
      return res.data
    } catch (err) {
      set({ error: getErrorMessage('Erro ao realizar devolução da maleta', err) })
      return null
    }
  },

  clearCurrentItem: () => set({ currentItem: null }),
  clearError: () => set({ error: null }),
}))
