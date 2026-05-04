import { useState, type FormEvent } from 'react'
import { MapPin, Plus, Pencil, Trash2, Package, ChevronDown, FolderOpen } from 'lucide-react'
import Drawer from '../../shared/components/Drawer'
import ProjectForm from './ProjectForm'
import AnyDeskTable from './AnyDeskTable'
import { useProjectStore, type Project } from '../store/useProjectStore'
import { useStockStore } from '../../stock/store/useStockStore'

const statusLabelMap = {
  active: 'Ativo',
  inactive: 'Inativo',
  completed: 'Concluído',
} as const

interface ProjectDrawerProps {
  project: Project | null
  onClose: () => void
}

export default function ProjectDrawer({ project, onClose }: ProjectDrawerProps) {
  const { createLocation, updateLocation, deleteLocation, deleteProject } = useProjectStore()
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null)
  const [locName, setLocName] = useState('')
  const [locDesc, setLocDesc] = useState('')
  const [showLocations, setShowLocations] = useState(true)
  const [expandedLocs, setExpandedLocs] = useState<Set<number>>(new Set())

  const { stockItems } = useStockStore()
  const projectItems = project ? stockItems.filter(i => i.project_id === project.id) : []

  const toggleLoc = (id: number) => {
    setExpandedLocs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddLocation = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!project) return
    const success = await createLocation(project.id, {
      name: locName.trim(),
      description: locDesc.trim() || null,
    })
    if (success) {
      setLocName('')
      setLocDesc('')
      setShowLocationForm(false)
    }
  }

  const handleUpdateLocation = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (editingLocationId === null) return
    const success = await updateLocation(editingLocationId, {
      name: locName.trim(),
      description: locDesc.trim() || null,
    })
    if (success) {
      setEditingLocationId(null)
      setLocName('')
      setLocDesc('')
    }
  }

  const handleDeleteLocation = async (locationId: number) => {
    if (!window.confirm('Excluir este local?')) return
    await deleteLocation(locationId)
  }

  const handleDeleteProject = async () => {
    if (!project) return
    if (!window.confirm(`Excluir o projeto "${project.name}"?`)) return
    const success = await deleteProject(project.id)
    if (success) onClose()
  }

  const startEditLocation = (loc: { id: number; name: string; description: string | null }) => {
    setEditingLocationId(loc.id)
    setLocName(loc.name)
    setLocDesc(loc.description || '')
    setShowLocationForm(false)
  }

  return (
    <Drawer open={Boolean(project)} onClose={onClose} title={project?.name ?? ''} width="520px">
      {project && (
        <div className="item-drawer-content">
          {/* Meta */}
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Código</span>
            <code className="drawer-meta-code">{project.code}</code>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Status</span>
            <span className={`badge badge-project-${project.status}`}>
              {statusLabelMap[project.status]}
            </span>
          </div>
          {project.description && (
            <div className="drawer-meta-row">
              <span className="drawer-meta-label">Descrição</span>
              <span className="drawer-meta-value">{project.description}</span>
            </div>
          )}
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Estoque alocado</span>
            <span className="drawer-meta-value">
              <Package size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
              {project.stock_count}
            </span>
          </div>

          <hr className="drawer-divider" />

          {/* Edit form */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Editar Projeto</h3>
            <ProjectForm
              mode="edit"
              project={project}
              onSuccess={onClose}
              onCancel={onClose}
            />
          </div>

          <hr className="drawer-divider" />

          {/* Locations */}
          <div className="drawer-section">
            <div
              className="drawer-section-title"
              onClick={() => setShowLocations((v) => !v)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <MapPin size={15} />
              Locais ({project.locations.length})
              <ChevronDown
                size={14}
                style={{
                  transform: showLocations ? 'rotate(0)' : 'rotate(-90deg)',
                  transition: '0.2s',
                  marginLeft: 'auto',
                }}
              />
            </div>

            {showLocations && (
              <>
                {project.locations.length > 0 && (
                  <div className="drawer-sub-items">
                    {project.locations.map((loc) => (
                      <div key={loc.id} className="drawer-sub-item">
                        {editingLocationId === loc.id ? (
                          <form onSubmit={handleUpdateLocation} className="location-edit-form">
                            <div className="form-field">
                              <input
                                type="text"
                                value={locName}
                                onChange={(e) => setLocName(e.target.value)}
                                placeholder="Nome do local"
                                required
                                autoFocus
                              />
                            </div>
                            <div className="form-field">
                              <input
                                type="text"
                                value={locDesc}
                                onChange={(e) => setLocDesc(e.target.value)}
                                placeholder="Descrição (opcional)"
                              />
                            </div>
                            <div className="location-edit-actions">
                              <button type="submit" className="btn btn-primary btn-sm">
                                Salvar
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setEditingLocationId(null)}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div>
                              <div
                                className="child-name"
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onClick={() => toggleLoc(loc.id)}
                              >
                                <ChevronDown
                                  size={13}
                                  style={{
                                    marginRight: 4,
                                    transform: expandedLocs.has(loc.id) ? 'rotate(0)' : 'rotate(-90deg)',
                                    transition: '0.2s',
                                  }}
                                />
                                <FolderOpen size={13} style={{ marginRight: 4 }} />
                                {loc.code && <code className="drawer-meta-code" style={{ marginRight: 6 }}>{loc.code}</code>}
                                {loc.name}
                              </div>
                              {loc.description && (
                                <div className="child-cat" style={{ marginLeft: 22 }}>{loc.description}</div>
                              )}
                            </div>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="btn-icon"
                                title="Editar"
                                onClick={() => startEditLocation(loc)}
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Excluir"
                                onClick={() => handleDeleteLocation(loc.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                        
                        {/* Items under this location */}
                        {expandedLocs.has(loc.id) && (
                          <div style={{ marginLeft: 20, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {projectItems.filter(i => i.location_id === loc.id).map(item => (
                              <div key={item.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', padding: '4px 8px', backgroundColor: 'var(--bg-elevated)', borderRadius: 4, gap: 8 }}>
                                <Package size={12} className="text-muted" />
                                <span style={{ flex: 1 }}>{item.name}</span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    Qtd: {item.quantity}
                                  </span>
                              </div>
                            ))}
                            {projectItems.filter(i => i.location_id === loc.id).length === 0 && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 4 }}>
                                Nenhum item alocado aqui.
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {project.locations.length === 0 && !showLocationForm && (
                  <p className="empty-state" style={{ padding: '8px 0', fontSize: '0.85rem' }}>
                    Nenhum local cadastrado.
                  </p>
                )}

                {showLocationForm ? (
                  <form onSubmit={handleAddLocation} className="location-add-form">
                    <div className="form-field">
                      <input
                        type="text"
                        value={locName}
                        onChange={(e) => setLocName(e.target.value)}
                        placeholder="Nome do local"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="form-field">
                      <input
                        type="text"
                        value={locDesc}
                        onChange={(e) => setLocDesc(e.target.value)}
                        placeholder="Descrição (opcional)"
                      />
                    </div>
                    <div className="location-edit-actions">
                      <button type="submit" className="btn btn-primary btn-sm">
                        <Plus size={14} /> Adicionar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setShowLocationForm(false)
                          setLocName('')
                          setLocDesc('')
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      setShowLocationForm(true)
                      setEditingLocationId(null)
                      setLocName('')
                      setLocDesc('')
                    }}
                  >
                    <Plus size={14} /> Novo local
                  </button>
                )}
              </>
            )}
            
            {/* Items without specific location */}
            {project && projectItems.filter(i => i.location_id === null).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>
                  Itens sem local específico ({projectItems.filter(i => i.location_id === null).length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {projectItems.filter(i => i.location_id === null).map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', padding: '6px 10px', backgroundColor: 'var(--bg-elevated)', borderRadius: 6, gap: 8 }}>
                      <Package size={14} className="text-muted" />
                      <span style={{ flex: 1 }}>{item.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Qtd: {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AnyDesk */}
          <hr className="drawer-divider" />
          <AnyDeskTable projectId={project.id} />

          {/* Danger zone */}
          <hr className="drawer-divider" />
          <div className="drawer-section">
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteProject}>
              Excluir projeto
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
