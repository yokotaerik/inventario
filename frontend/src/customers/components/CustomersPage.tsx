import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Search, Building2, FolderKanban, Package,
  Plus, Pencil, Trash2, Loader2, X, ChevronRight,
} from 'lucide-react'
import { useCustomerStore, type Customer, type CustomerStatus } from '../store/useCustomerStore'
import { useProjectStore, type Project } from '../../projects/store/useProjectStore'
import { useStockStore, type StockItem } from '../../stock/store/useStockStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type PageView = 'list' | 'customer' | 'project'

const customerStatusLabel: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  completed: 'Concluído',
}

const projectStatusLabel: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  completed: 'Concluído',
}

// ─── List ─────────────────────────────────────────────────────────────────────

function CustomersList({
  customers,
  projects,
  onSelect,
  onNew,
  loading,
}: {
  customers: Customer[]
  projects: Project[]
  onSelect: (c: Customer) => void
  onNew: () => void
  loading: boolean
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q),
    )
  }, [customers, search])

  const projectCountFor = (customerId: number) =>
    projects.filter((p) => p.customer_id === customerId).length

  return (
    <>
      <div className="page-section-header">
        <div>
          <h2 className="page-section-title">Clientes</h2>
          <p className="page-section-sub">
            {customers.length} cliente{customers.length !== 1 ? 's' : ''} cadastrado{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar cliente por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && customers.length === 0 ? (
        <div className="empty-state">
          <Loader2 size={20} className="spin" style={{ marginBottom: 8 }} />
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          {search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="project-card"
              onClick={() => onSelect(c)}
              style={{ cursor: 'pointer' }}
            >
              <div className="project-card-header">
                <div className="project-card-icon">
                  <Building2 size={20} />
                </div>
                <div className="project-card-info">
                  <h3>{c.name}</h3>
                  <code className="project-card-code">{c.code}</code>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-project-${c.status}`}>
                    {customerStatusLabel[c.status] ?? c.status}
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--ink-secondary)' }} />
                </div>
              </div>
              {c.description && <p className="project-card-desc">{c.description}</p>}
              <div className="project-card-footer">
                <span className="project-card-stat">
                  <FolderKanban size={13} /> {projectCountFor(c.id)}{' '}
                  {projectCountFor(c.id) === 1 ? 'projeto' : 'projetos'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Customer detail ──────────────────────────────────────────────────────────

function CustomerDetail({
  customer,
  projects,
  onBack,
  onSelectProject,
  onDeleted,
}: {
  customer: Customer
  projects: Project[]
  onBack: () => void
  onSelectProject: (p: Project) => void
  onDeleted: () => void
}) {
  const { updateCustomer, deleteCustomer, loading } = useCustomerStore()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: customer.name,
    code: customer.code,
    description: customer.description || '',
    status: customer.status,
  })
  const [showNewProject, setShowNewProject] = useState(false)

  const customerProjects = useMemo(
    () => projects.filter((p) => p.customer_id === customer.id),
    [projects, customer.id],
  )

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await updateCustomer(customer.id, {
      name: editForm.name.trim() || undefined,
      code: editForm.code.trim() || undefined,
      description: editForm.description.trim() || null,
      status: editForm.status,
    })
    if (ok) setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm(`Excluir o cliente "${customer.name}"?`)) return
    const ok = await deleteCustomer(customer.id)
    if (ok) onDeleted()
  }

  return (
    <div className="detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={onBack}>
          Clientes
        </button>
        <ChevronRight size={14} className="breadcrumb-sep" />
        <span className="breadcrumb-current">{customer.name}</span>
      </div>

      {/* Header */}
      <div className="detail-page-header">
        <div className="project-card-icon" style={{ width: 52, height: 52, flexShrink: 0 }}>
          <Building2 size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{customer.name}</h2>
            <span className={`badge badge-project-${customer.status}`}>
              {customerStatusLabel[customer.status] ?? customer.status}
            </span>
          </div>
          <code className="project-card-code" style={{ marginTop: 4, display: 'inline-block' }}>
            {customer.code}
          </code>
          {customer.description && (
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
              {customer.description}
            </p>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setEditForm({
                name: customer.name,
                code: customer.code,
                description: customer.description || '',
                status: customer.status,
              })
              setEditing(true)
            }}
          >
            <Pencil size={14} /> Editar
          </button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <div className="detail-section">
          <h3 className="detail-section-title">Editar Cliente</h3>
          <form onSubmit={handleSave} className="detail-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                <label>Código</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm((c) => ({ ...c, code: e.target.value }))}
                  required
                />
              </div>
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
                onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value as CustomerStatus }))}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                {loading ? <Loader2 size={14} className="spin" /> : null} Salvar
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects */}
      <div className="detail-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 className="detail-section-title" style={{ margin: 0 }}>
            <FolderKanban size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Projetos ({customerProjects.length})
          </h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowNewProject((v) => !v)}
          >
            <Plus size={14} /> Novo Projeto
          </button>
        </div>

        {showNewProject && (
          <NewProjectInline
            customerId={customer.id}
            onDone={() => setShowNewProject(false)}
          />
        )}

        {customerProjects.length === 0 && !showNewProject ? (
          <p style={{ color: 'var(--ink-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>
            Nenhum projeto associado.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {customerProjects.map((p) => (
              <button
                key={p.id}
                type="button"
                className="project-row-btn"
                onClick={() => onSelectProject(p)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <FolderKanban size={15} style={{ flexShrink: 0, color: 'var(--brand)' }} />
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code className="project-card-code">{p.code}</code>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginTop: 2 }}>
                      <Package size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />
                      {p.stock_count} {p.stock_count === 1 ? 'item' : 'itens'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className={`badge badge-project-${p.status}`}>
                    {projectStatusLabel[p.status]}
                  </span>
                  <ChevronRight size={15} style={{ color: 'var(--ink-secondary)' }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Danger */}
      <div className="detail-section detail-danger-zone">
        <h3 className="detail-section-title" style={{ color: 'var(--danger)' }}>Zona de risco</h3>
        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
          <Trash2 size={14} /> Excluir cliente
        </button>
      </div>
    </div>
  )
}

// ─── Inline new-project form ──────────────────────────────────────────────────

function NewProjectInline({ customerId, onDone }: { customerId: number; onDone: () => void }) {
  const { createProject, loading } = useProjectStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await createProject({
      customer_id: customerId,
      name: name.trim(),
      description: description.trim() || null,
      status: 'active',
    })
    if (ok) onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form" style={{ marginBottom: 12 }}>
      <input
        type="text"
        className="location-input"
        placeholder="Nome do projeto *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus
        style={{ flex: 2 }}
      />
      <input
        type="text"
        className="location-input"
        placeholder="Descrição (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{ flex: 3 }}
      />
      <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
        {loading ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Criar
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Cancelar</button>
    </form>
  )
}

// ─── Project detail (dentro de clientes) ─────────────────────────────────────

function ProjectDetail({
  project,
  customer,
  onBack,
  onDeleted,
}: {
  project: Project
  customer: Customer
  onBack: () => void
  onDeleted: () => void
}) {
  const { updateProject, deleteProject, loading } = useProjectStore()
  const { stockItems, fetchStockItems } = useStockStore()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: project.name,
    description: project.description || '',
    status: project.status,
  })

  useEffect(() => {
    fetchStockItems()
  }, [fetchStockItems])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await updateProject(project.id, {
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

  const projectStockItems = useMemo(
    () => stockItems.filter((i) => i.project_id === project.id),
    [stockItems, project.id],
  )



  return (
    <div className="detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={() => onBack()}>
          Clientes
        </button>
        <ChevronRight size={14} className="breadcrumb-sep" />
        <button type="button" className="breadcrumb-link" onClick={onBack}>
          {customer.name}
        </button>
        <ChevronRight size={14} className="breadcrumb-sep" />
        <span className="breadcrumb-current">{project.name}</span>
      </div>

      {/* Header */}
      <div className="detail-page-header">
        <div className="project-card-icon" style={{ width: 52, height: 52, flexShrink: 0 }}>
          <FolderKanban size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>{project.name}</h2>
            <span className={`badge badge-project-${project.status}`}>
              {projectStatusLabel[project.status]}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
            <code className="project-card-code" style={{ fontSize: '1rem' }}>{project.code}</code>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 size={13} /> {customer.code} — {customer.name}
            </span>
          </div>
          {project.description && (
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--ink-secondary)' }}>
              {project.description}
            </p>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setEditForm({ name: project.name, description: project.description || '', status: project.status })
              setEditing(true)
            }}
          >
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
                onChange={(e) => setEditForm((c) => ({ ...c, status: e.target.value as typeof project.status }))}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="completed">Concluído</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                {loading ? <Loader2 size={14} className="spin" /> : null} Salvar
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>

        <div className="stat-chip">
          <Package size={13} /> {projectStockItems.length} {projectStockItems.length === 1 ? 'item' : 'itens'}
        </div>
      </div>

      {/* Items */}
      {projectStockItems.length === 0 ? (
        <div className="empty-state" style={{ margin: '16px 0' }}>
          Nenhum item cadastrado neste projeto.
        </div>
      ) : (
        <div className="detail-section">
          <h3 className="detail-section-title">
            <Package size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Itens do Projeto ({projectStockItems.length})
          </h3>
          <ItemTable items={projectStockItems} />
        </div>
      )}

      {/* Danger */}
      <div className="detail-section detail-danger-zone">
        <h3 className="detail-section-title" style={{ color: 'var(--danger)' }}>Zona de risco</h3>
        <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
          <Trash2 size={14} /> Excluir projeto
        </button>
      </div>
    </div>
  )
}

// ─── Item table (reusável) ────────────────────────────────────────────────────

function ItemTable({ items }: { items: StockItem[] }) {
  return (
    <div className="item-table">
      <div className="item-table-header">
        <span>Item</span>
        <span>Categoria</span>
        <span style={{ textAlign: 'right' }}>Qtd.</span>
      </div>
      {items.map((item) => (
        <div key={item.id} className="item-table-row">
          <div>
            <span style={{ fontWeight: 500 }}>{item.name}</span>
            {item.product_code && (
              <code className="project-card-code" style={{ marginLeft: 6, fontSize: '0.7rem' }}>
                {item.product_code}
              </code>
            )}
          </div>
          <span style={{ color: 'var(--ink-secondary)', fontSize: '0.82rem' }}>{item.category}</span>
          <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--ink)' }}>{item.quantity}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Create customer form (modal-like inline) ─────────────────────────────────

function NewCustomerInline({ onDone }: { onDone: () => void }) {
  const { createCustomer, loading } = useCustomerStore()
  const [form, setForm] = useState({ code: '', name: '', description: '' })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const ok = await createCustomer({
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
    })
    if (ok) onDone()
  }

  return (
    <div className="create-card" style={{ marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 600 }}>Novo Cliente</h3>
      <form onSubmit={handleSubmit} className="detail-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div className="form-field">
            <label>Código *</label>
            <input
              type="text"
              placeholder="Ex.: MC001"
              value={form.code}
              onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))}
              required
            />
          </div>
          <div className="form-field">
            <label>Nome *</label>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              required
            />
          </div>
        </div>
        <div className="form-field">
          <label>Descrição</label>
          <input
            type="text"
            placeholder="Descrição opcional"
            value={form.description}
            onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            {loading ? <Loader2 size={14} className="spin" /> : <Plus size={14} />} Criar
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const { customers, fetchCustomers, error, clearError, loading } = useCustomerStore()
  const { projects, fetchProjects } = useProjectStore()

  const [view, setView] = useState<PageView>('list')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  useEffect(() => {
    fetchCustomers()
    fetchProjects()
  }, [fetchCustomers, fetchProjects])

  // Keep selection in sync with store updates
  const syncedCustomer = useMemo(
    () => (selectedCustomer ? (customers.find((c) => c.id === selectedCustomer.id) ?? null) : null),
    [customers, selectedCustomer],
  )
  const syncedProject = useMemo(
    () => (selectedProject ? (projects.find((p) => p.id === selectedProject.id) ?? null) : null),
    [projects, selectedProject],
  )

  const goList = () => {
    setView('list')
    setSelectedCustomer(null)
    setSelectedProject(null)
    setShowNewCustomer(false)
  }

  const goCustomer = () => {
    setView('customer')
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
        <>
          {showNewCustomer && (
            <NewCustomerInline onDone={() => setShowNewCustomer(false)} />
          )}
          <CustomersList
            customers={customers}
            projects={projects}
            onSelect={(c) => {
              setSelectedCustomer(c)
              setView('customer')
            }}
            onNew={() => setShowNewCustomer((v) => !v)}
            loading={loading}
          />
        </>
      )}

      {view === 'customer' && syncedCustomer && (
        <CustomerDetail
          customer={syncedCustomer}
          projects={projects}
          onBack={goList}
          onSelectProject={(p) => {
            setSelectedProject(p)
            setView('project')
          }}
          onDeleted={goList}
        />
      )}

      {view === 'project' && syncedProject && syncedCustomer && (
        <ProjectDetail
          project={syncedProject}
          customer={syncedCustomer}
          onBack={goCustomer}
          onDeleted={goCustomer}
        />
      )}
    </div>
  )
}
