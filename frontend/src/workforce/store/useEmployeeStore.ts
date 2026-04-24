import { create } from 'zustand'
import { api, getStoredToken, persistToken, getErrorMessage, authHeaders } from '../../shared/api/client'

export interface Employee {
  id: number
  name: string
  department: string
  is_active: boolean
  location_id: number | null
  location_name: string | null
  project_name: string | null
}

interface CreateEmployeePayload {
  name: string
  department: string
  is_active: boolean
  location_id: number | null
}

interface UpdateEmployeePayload {
  name: string
  department: string
  is_active: boolean
  location_id: number | null
}

interface EmployeeState {
  employees: Employee[]       // only active (public)
  allEmployees: Employee[]    // all (admin)
  adminLoading: boolean
  error: string | null
  authError: string | null
  fetchEmployees: () => Promise<void>
  fetchAllEmployees: () => Promise<void>
  createEmployee: (payload: CreateEmployeePayload) => Promise<boolean>
  updateEmployee: (employeeId: number, payload: UpdateEmployeePayload) => Promise<boolean>
  deleteEmployee: (employeeId: number) => Promise<boolean>
  clearError: () => void
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  allEmployees: [],
  adminLoading: false,
  error: null,
  authError: null,

  fetchEmployees: async () => {
    try {
      const res = await api.get<Employee[]>('/employees/active')
      set({ employees: res.data })
    } catch {
      set({ error: 'Erro ao buscar funcionários' })
    }
  },

  fetchAllEmployees: async () => {
    const token = getStoredToken()
    if (!token) { set({ allEmployees: [] }); return }
    set({ adminLoading: true, authError: null })
    try {
      const res = await api.get<Employee[]>('/employees', { headers: authHeaders(token) })
      set({ allEmployees: res.data, adminLoading: false })
    } catch {
      persistToken(null)
      set({ adminLoading: false, allEmployees: [], authError: 'Sessão expirada. Faça login novamente.' })
    }
  },

  createEmployee: async (payload) => {
    const token = getStoredToken()
    if (!token) { set({ authError: 'Você precisa fazer login para criar funcionários.' }); return false }
    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.post('/employees', payload, { headers: authHeaders(token) })
      set({ adminLoading: false })
      await get().fetchAllEmployees()
      await get().fetchEmployees()
      return true
    } catch (err) {
      set({ adminLoading: false, authError: getErrorMessage('Erro ao criar funcionário', err) })
      return false
    }
  },

  updateEmployee: async (employeeId, payload) => {
    const token = getStoredToken()
    if (!token) { set({ authError: 'Você precisa fazer login para editar funcionários.' }); return false }
    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.put(`/employees/${employeeId}`, payload, { headers: authHeaders(token) })
      set({ adminLoading: false })
      await get().fetchAllEmployees()
      await get().fetchEmployees()
      return true
    } catch (err) {
      set({ adminLoading: false, authError: getErrorMessage('Erro ao editar funcionário', err) })
      return false
    }
  },

  deleteEmployee: async (employeeId) => {
    const token = getStoredToken()
    if (!token) { set({ authError: 'Você precisa fazer login para excluir funcionários.' }); return false }
    set({ adminLoading: true, authError: null, error: null })
    try {
      await api.delete(`/employees/${employeeId}`, { headers: authHeaders(token) })
      set({ adminLoading: false })
      await get().fetchAllEmployees()
      await get().fetchEmployees()
      return true
    } catch (err) {
      set({ adminLoading: false, authError: getErrorMessage('Erro ao excluir funcionário', err) })
      return false
    }
  },

  clearError: () => set({ error: null, authError: null }),
}))
