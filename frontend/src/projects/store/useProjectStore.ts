import { create } from 'zustand'
import { api, getStoredToken, getErrorMessage, authHeaders } from '../../shared/api/client'

// ── Types ────────────────────────────────────────────────────────────────────


export interface AnyDeskEntry {
  id: number
  project_id: number
  machine_name: string
  anydesk_id: string
  password: string | null
  description: string | null
  created_at: string | null
}

export type ProjectStatus = 'active' | 'inactive' | 'completed'

export interface Project {
  id: number
  code: string
  name: string
  description: string | null
  status: ProjectStatus
  created_at: string | null
  customer_id: number
  customer_code: string | null
  customer_name: string | null
  stock_count: number
}

interface CreateProjectPayload {
  customer_id: number
  code?: string
  name: string
  description?: string | null
  status?: ProjectStatus
}

interface UpdateProjectPayload {
  customer_id?: number
  code?: string
  name?: string
  description?: string | null
  status?: ProjectStatus
}


interface CreateAnyDeskPayload {
  machine_name: string
  anydesk_id: string
  password?: string | null
  description?: string | null
}

interface UpdateAnyDeskPayload {
  machine_name: string
  anydesk_id: string
  password?: string | null
  description?: string | null
}

// ── Store ────────────────────────────────────────────────────────────────────

interface ProjectState {
  projects: Project[]
  anyDeskEntries: Record<number, AnyDeskEntry[]>
  loading: boolean
  error: string | null

  fetchProjects: () => Promise<void>
  createProject: (payload: CreateProjectPayload) => Promise<boolean>
  updateProject: (id: number, payload: UpdateProjectPayload) => Promise<boolean>
  deleteProject: (id: number) => Promise<boolean>


  fetchAnyDeskEntries: (projectId: number) => Promise<void>
  createAnyDeskEntry: (projectId: number, payload: CreateAnyDeskPayload) => Promise<boolean>
  updateAnyDeskEntry: (entryId: number, projectId: number, payload: UpdateAnyDeskPayload) => Promise<boolean>
  deleteAnyDeskEntry: (entryId: number, projectId: number) => Promise<boolean>

  clearError: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  anyDeskEntries: {},
  loading: false,
  error: null,

  fetchProjects: async () => {
    try {
      const res = await api.get<Project[]>('/projects')
      set({ projects: res.data })
    } catch {
      set({ error: 'Erro ao buscar projetos' })
    }
  },

  createProject: async (payload) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.post('/projects', payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchProjects()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao criar projeto', err) })
      return false
    }
  },

  updateProject: async (id, payload) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.put(`/projects/${id}`, payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchProjects()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao atualizar projeto', err) })
      return false
    }
  },

  deleteProject: async (id) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.delete(`/projects/${id}`, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchProjects()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao excluir projeto', err) })
      return false
    }
  },


  fetchAnyDeskEntries: async (projectId) => {
    try {
      const res = await api.get<AnyDeskEntry[]>(`/projects/${projectId}/anydesk`)
      set(state => ({ anyDeskEntries: { ...state.anyDeskEntries, [projectId]: res.data } }))
    } catch {
      set({ error: 'Erro ao buscar entradas AnyDesk' })
    }
  },

  createAnyDeskEntry: async (projectId, payload) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.post(`/projects/${projectId}/anydesk`, payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchAnyDeskEntries(projectId)
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao criar entrada AnyDesk', err) })
      return false
    }
  },

  updateAnyDeskEntry: async (entryId, projectId, payload) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.put(`/projects/anydesk/${entryId}`, payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchAnyDeskEntries(projectId)
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao atualizar entrada AnyDesk', err) })
      return false
    }
  },

  deleteAnyDeskEntry: async (entryId, projectId) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.delete(`/projects/anydesk/${entryId}`, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchAnyDeskEntries(projectId)
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao excluir entrada AnyDesk', err) })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))
