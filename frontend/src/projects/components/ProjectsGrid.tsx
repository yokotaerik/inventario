import { useEffect, useMemo, useState } from 'react'
import { Search, FolderKanban, MapPin, Package, Plus } from 'lucide-react'
import { useProjectStore, type Project } from '../store/useProjectStore'
import ProjectDrawer from './ProjectDrawer'
import ProjectForm from './ProjectForm'

const statusLabelMap = {
  active: 'Ativo',
  inactive: 'Inativo',
  completed: 'Concluído',
} as const

type StatusFilter = 'all' | 'active' | 'inactive' | 'completed'

export default function ProjectsGrid() {
  const { projects, fetchProjects } = useProjectStore()
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return projects.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    })
  }, [projects, search, filterStatus])

  // Sync selected project with updated data
  const syncedProject = useMemo(() => {
    if (!selectedProject) return null
    return projects.find((p) => p.id === selectedProject.id) || null
  }, [projects, selectedProject])

  return (
    <>
      {/* Search & filter bar */}
      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            id="projects-search"
            type="text"
            placeholder="Buscar projeto por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="completed">Concluído</option>
        </select>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setShowCreateForm((v) => !v)}
        >
          <Plus size={14} /> Novo
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="create-card" style={{ marginBottom: 16 }}>
          <h3>Novo Projeto</h3>
          <ProjectForm
            mode="create"
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <div className="table-count">
        {filtered.length} {filtered.length === 1 ? 'projeto' : 'projetos'}
        {search || filterStatus !== 'all' ? ' (filtrado)' : ''}
      </div>

      {/* Grid */}
      <div className="projects-grid">
        {filtered.map((project) => (
          <div
            key={project.id}
            className="project-card"
            onClick={() => setSelectedProject(project)}
          >
            <div className="project-card-header">
              <div className="project-card-icon">
                <FolderKanban size={20} />
              </div>
              <div className="project-card-info">
                <h3>{project.name}</h3>
                <code className="project-card-code">{project.code}</code>
              </div>
              <span className={`badge badge-project-${project.status}`}>
                {statusLabelMap[project.status]}
              </span>
            </div>

            {project.description && (
              <p className="project-card-desc">{project.description}</p>
            )}

            <div className="project-card-footer">
              <span className="project-card-stat">
                <MapPin size={13} /> {project.locations.length}{' '}
                {project.locations.length === 1 ? 'local' : 'locais'}
              </span>
              <span className="project-card-stat">
                <Package size={13} /> {project.stock_count}{' '}
                {project.stock_count === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">Nenhum projeto encontrado.</div>
      )}

      <ProjectDrawer
        project={syncedProject}
        onClose={() => setSelectedProject(null)}
      />
    </>
  )
}
