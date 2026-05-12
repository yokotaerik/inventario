import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Search, FolderKanban, MapPin, Package, Plus, ArrowLeft,
  Pencil, Trash2, Loader2, X, Building2,
} from 'lucide-react'
import { useProjectStore, type Project, type ProjectStatus } from '../store/useProjectStore'
import { useCustomerStore } from '../../customers/store/useCustomerStore'

type PageView = 'list' | 'create' | 'detail'

const statusLabel: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  completed: 'Concluído',
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function ListView({
  projects,
  customers,
  onSelect,
  onNew,
}: {
  projects: Project[]
  customers: ReturnType<typeof useCustomerStore>['customers']
  onSelect: (p: Project) => void
  onNew: () => void
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCustomer, setFilterCustomer] = useState(0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return projects.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (filterCustomer && p.customer_id !== filterCustomer) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q)
      )
    })
  }, [projects, search, filterStatus, filterCustomer])

  return (
    <>
      <div className="page-section-header">
        <div>
          <h2 className="page-section-title">Projetos</h2>
          <p className="page-section-sub">{projects.length} projeto{projects.length !== 1 ? 's' : ''} cadastrado{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <Plus size={16} /> Novo Projeto
        </button>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nome, código ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="completed">Concluído</option>
        </select>
        <select
          className="filter-select"
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(Number(e.target.value))}
        >
          <option value={0}>Todos clientes</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="projects-grid">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="project-card"
              onClick={() => onSelect(p)}
              style={{ cursor: 'pointer' }}
            >
              <div className="project-card-header">
                <div className="project-card-icon">
                  <FolderKanban size={20} />
                </div>
                <div className="project-card-info">
                  <h3>{p.name}</h3>
                  <code className="project-card-code">{p.code}</code>
                </div>
                <span className={`badge badge-project-${p.status}`}>
                  {statusLabel[p.status]}
                </span>
              </div>

              {p.customer_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--ink-secondary)', marginTop: 6 }}>
                  <Building2 size={12} />
                  <span>{p.customer_code} — {p.customer_name}</span>
                </div>
              )}

              {p.description && (
                <p className="project-card-desc">{p.description}</p>
              )}

              <div className="project-card-footer">
                <span className="project-card-stat">
                  <MapPin size={13} /> {p.locations.length} {p.locations.length === 1 ? 'local' : 'locais'}
                </span>
                <span className="project-card-stat">
                  <Package size={13} /> {p.stock_count} {p.stock_count === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {search || filterStatus !== 'all' || filterCustomer
            ? 'Nenhum projeto encontrado.'
            : 'Nenhum projeto cadastrado. Crie o primeiro!'}
        </div>
      )}
    </>
  )
}

// ─── Create view ──────────────────────────────────────────────────────────────

function CreateView({
  customers,
  onBack,
  onCreated,
}: {
  customers: ReturnType<typeof useCustomerStore>['customers']
  onBack: () => void
  onCreated: (p: Project) => void
}) {
  const { createProject, loading, error, clearError } = useProjectStore()
  const [form, setForm] = useState({
    customer_id: 0,
    name: '',
    description: '',
    status: 'active' as ProjectStatus,
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await createProject({
      customer_id: form.customer_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
    })
    if (ok) {
      const created = useProjectStore.getState().projects.at(-1)
      if (created) onCreated(created)
      else onBack()
    }
  }

  return (
    <div className="detail-page">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} /> Voltar
      </button>

      <div className="detail-page-header">
        <div className="project-card-icon" style={{ width: 48, height: 48 }}>
          <FolderKanban size={22} />
        </div>
        <div>
          <h2>Novo Projeto</h2>
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem' }}>
            O código é gerado automaticamente no formato <code>70XXXX</code>
          </p>
        </div>
      </div>

      {error && (
        <div className="alert" style={{ marginBottom: 16 }}>
          <span>{error}</span>
          <button type="button" className="alert-close" onClick={clearError}><X size={14} /></button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="detail-form">
        <div className="form-field">
          <label>Cliente *</label>
          <select
            value={form.customer_id}
            onChange={(e) => setForm((c) => ({ ...c, customer_id: Number(e.target.value) }))}
            required
          >
            <option value={0}>Selecione um cliente...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label>Nome *</label>
          <input
            type="text"
            placeholder="Ex.: Implantação Filial Norte"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            required
          />
        </div>

        <div className="form-field">
          <label>Descrição</label>
          <textarea
            className="form-textarea"
            placeholder="Descrição opcional do projeto..."
            value={form.description}
            onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="form-field">
          <label>Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as ProjectStatus }))}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="completed">Concluído</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
            Criar Projeto
          </button>
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function DetailView({
  project,
  customers,
  onBack,
  onDeleted,
}: {
  project: Project
  customers: ReturnType<typeof useCustomerStore>['customers']
  onBack: () => void
  onDeleted: () => void
}) {
  const { updateProject, deleteProject, createLocation, updateLocation, deleteLocation, loading } = useProjectStore()

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    customer_id: project.customer_id,
    name: project.name,
    description: project.description || '',
    status: project.status,
  })

  // Location state
  const [locForm, setLocForm] = useState<{ name: string; description: string } | null>(null)
  const [editingLocId, setEditingLocId] = useState<number | null>(null)
  const [editLocForm, setEditLocForm] = useState({ name: '', description: '' })


  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await updateProject(project.id, {
      customer_id: editForm.customer_id,
      name: editForm.name.trim() || undefined,
      description: editForm.description.trim() || null,
      status: editForm.status,
    })
    if (ok) setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Excluir o projeto "${project.name}"?`)) return
    const ok = await deleteProject(project.id)
    if (ok) onDeleted()
  }

  const handleAddLoc = async (e: FormEvent) => {
    e.preventDefault()
    if (!locForm) return
    const ok = await createLocation(project.id, {
      name: locForm.name.trim(),
      description: locForm.description.trim() || null,
    })
    if (ok) setLocForm(null)
  }

  const handleUpdateLoc = async (e: FormEvent) => {
    e.preventDefault()
    if (editingLocId === null) return
    const ok = await updateLocation(editingLocId, {
      name: editLocForm.name.trim(),
      description: editLocForm.description.trim() || null,
    })
    if (ok) setEditingLocId(null)
  }

  const handleDeleteLoc = async (locId: number) => {
    if (!window.confirm('Excluir este local?')) return
    await deleteLocation(locId)
  }

  const startEditLoc = (loc: { id: number; name: string; description: string | null }) => {
    setEditingLocId(loc.id)
    setEditLocForm({ name: loc.name, description: loc.description || '' })
    setLocForm(null)
  }

  return (
    <div className="detail-page">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 16 }}>
        <ArrowLeft size={15} /> Todos os Projetos
      </button>

      {/* Header */}
      <div className="detail-page-header">
        <div className="project-card-icon" style={{ width: 52, height: 52, flexShrink: 0 }}>
          <FolderKanban size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{project.name}</h2>
            <span className={`badge badge-project-${project.status}`}>
              {statusLabel[project.status]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            <code className="project-card-code" style={{ fontSize: '1rem' }}>{project.code}</code>
            {project.customer_name && (
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Building2 size={13} />
                {project.customer_code} — {project.customer_name}
              </span>
            )}
          </div>
        </div>
        {!editing && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditForm({ customer_id: project.customer_id, name: project.name, description: project.description || '', status: project.status }); setEditing(true) }}>
            <Pencil size={14} /> Editar
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="detail-section">
          <h3 className="detail-section-title">Editar Projeto</h3>
          <form onSubmit={handleSave} className="detail-form">
            <div className="form-field">
              <label>Cliente</label>
              <select
                value={editForm.customer_id}
                onChange={(e) => setEditForm((c) => ({ ...c, customer_id: Number(e.target.value) }))}
                required
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Nome</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label>Descrição</label>
              <textarea
                className="form-textarea"
                value={editForm.description}
                onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="form-field">
              <label>Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value as ProjectStatus }))}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                {loading ? <Loader2 size={14} className="spin" /> : null}
                Salvar
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations */}
      <div className="detail-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="detail-section-title" style={{ margin: 0 }}>
            <MapPin size={15} style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Locais ({project.locations.length})
          </h3>
          {!locForm && editingLocId === null && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setLocForm({ name: '', description: '' })}
            >
              <Plus size={14} /> Novo local
            </button>
          )}
        </div>

        {project.locations.length > 0 && (
          <div className="locations-list">
            {project.locations.map((loc) => (
              <div key={loc.id} className="location-row">
                {editingLocId === loc.id ? (
                  <form onSubmit={handleUpdateLoc} style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                    <input
                      className="location-input"
                      type="text"
                      value={editLocForm.name}
                      onChange={(e) => setEditLocForm((c) => ({ ...c, name: e.target.value }))}
                      placeholder="Nome do local"
                      required
                      autoFocus
                    />
                    <input
                      className="location-input"
                      type="text"
                      value={editLocForm.description}
                      onChange={(e) => setEditLocForm((c) => ({ ...c, description: e.target.value }))}
                      placeholder="Descrição (opcional)"
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>Salvar</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingLocId(null)}>Cancelar</button>
                  </form>
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {loc.code && <code className="project-card-code" style={{ fontSize: '0.75rem' }}>{loc.code}</code>}
                        <span style={{ fontWeight: 500 }}>{loc.name}</span>
                      </div>
                      {loc.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: 2 }}>{loc.description}</div>
                      )}
                    </div>
                    <div className="row-actions">
                      <button type="button" className="btn-icon" title="Editar" onClick={() => startEditLoc(loc)}>
                        <Pencil size={13} />
                      </button>
                      <button type="button" className="btn-icon" title="Excluir" onClick={() => handleDeleteLoc(loc.id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {project.locations.length === 0 && !locForm && (
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.875rem', fontStyle: 'italic', margin: '8px 0' }}>
            Nenhum local cadastrado.
          </p>
        )}

        {locForm && (
          <form onSubmit={handleAddLoc} style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <input
              className="location-input"
              type="text"
              value={locForm.name}
              onChange={(e) => setLocForm((c) => c ? { ...c, name: e.target.value } : null)}
              placeholder="Nome do local *"
              required
              autoFocus
            />
            <input
              className="location-input"
              type="text"
              value={locForm.description}
              onChange={(e) => setLocForm((c) => c ? { ...c, description: e.target.value } : null)}
              placeholder="Descrição (opcional)"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              <Plus size={14} /> Adicionar
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLocForm(null)}>
              Cancelar
            </button>
          </form>
        )}
      </div>

      {/* Stats */}
      <div className="detail-section">
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="stat-chip">
            <MapPin size={14} /> {project.locations.length} {project.locations.length === 1 ? 'local' : 'locais'}
          </div>
          <div className="stat-chip">
            <Package size={14} /> {project.stock_count} {project.stock_count === 1 ? 'item de estoque' : 'itens de estoque'}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="detail-section detail-danger-zone">
        <h3 className="detail-section-title" style={{ color: 'var(--danger)' }}>Zona de risco</h3>
        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
          <Trash2 size={14} /> Excluir projeto
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { projects, fetchProjects, error, clearError } = useProjectStore()
  const { customers, fetchCustomers } = useCustomerStore()
  const [view, setView] = useState<PageView>('list')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  useEffect(() => {
    fetchProjects()
    fetchCustomers()
  }, [fetchProjects, fetchCustomers])

  const syncedProject = useMemo(
    () => (selectedProject ? (projects.find((p) => p.id === selectedProject.id) ?? null) : null),
    [projects, selectedProject],
  )

  const openDetail = (p: Project) => {
    setSelectedProject(p)
    setView('detail')
  }

  const goList = () => {
    setView('list')
    setSelectedProject(null)
  }

  return (
    <div>
      {error && (
        <div className="alert-bar" style={{ marginBottom: 8 }}>
          <div className="alert">
            <span>{error}</span>
            <button type="button" className="alert-close" onClick={clearError}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {view === 'list' && (
        <ListView
          projects={projects}
          customers={customers}
          onSelect={openDetail}
          onNew={() => setView('create')}
        />
      )}

      {view === 'create' && (
        <CreateView
          customers={customers}
          onBack={goList}
          onCreated={(p) => {
            setSelectedProject(p)
            setView('detail')
          }}
        />
      )}

      {view === 'detail' && syncedProject && (
        <DetailView
          project={syncedProject}
          customers={customers}
          onBack={goList}
          onDeleted={goList}
        />
      )}
    </div>
  )
}
