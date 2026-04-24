import { create } from 'zustand'
import { api, getStoredToken, getErrorMessage, authHeaders } from '../../shared/api/client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProjectLocation {
  id: number
  project_id: number
  name: string
  description: string | null
}

export type ProjectStatus = 'active' | 'inactive' | 'completed'

export interface Project {
  id: number
  code: string
  name: string
  description: string | null
  status: ProjectStatus
  created_at: string | null
  locations: ProjectLocation[]
  item_count: number
}

interface CreateProjectPayload {
  code: string
  name: string
  description?: string | null
  status?: ProjectStatus
}

interface UpdateProjectPayload {
  code: string
  name: string
  description?: string | null
  status: ProjectStatus
}

interface CreateLocationPayload {
  name: string
  description?: string | null
}

interface UpdateLocationPayload {
  name: string
  description?: string | null
}

// ── Store ────────────────────────────────────────────────────────────────────

interface ProjectState {
  projects: Project[]
  loading: boolean
  error: string | null

  fetchProjects: () => Promise<void>
  createProject: (payload: CreateProjectPayload) => Promise<boolean>
  updateProject: (id: number, payload: UpdateProjectPayload) => Promise<boolean>
  deleteProject: (id: number) => Promise<boolean>

  createLocation: (projectId: number, payload: CreateLocationPayload) => Promise<boolean>
  updateLocation: (locationId: number, payload: UpdateLocationPayload) => Promise<boolean>
  deleteLocation: (locationId: number) => Promise<boolean>

  clearError: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
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

  createLocation: async (projectId, payload) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.post(`/projects/${projectId}/locations`, payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchProjects()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao criar local', err) })
      return false
    }
  },

  updateLocation: async (locationId, payload) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.put(`/projects/locations/${locationId}`, payload, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchProjects()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao atualizar local', err) })
      return false
    }
  },

  deleteLocation: async (locationId) => {
    const token = getStoredToken()
    if (!token) { set({ error: 'Login necessário' }); return false }
    set({ loading: true, error: null })
    try {
      await api.delete(`/projects/locations/${locationId}`, { headers: authHeaders(token) })
      set({ loading: false })
      await get().fetchProjects()
      return true
    } catch (err) {
      set({ loading: false, error: getErrorMessage('Erro ao excluir local', err) })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))
