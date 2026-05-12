import { useState } from 'react'
import { FolderKanban, Trash2, ChevronDown, Plus } from 'lucide-react'
import Drawer from '../../shared/components/Drawer'
import CustomerForm from './CustomerForm'
import ProjectForm from '../../projects/components/ProjectForm'
import { useCustomerStore, type Customer } from '../store/useCustomerStore'
import { useProjectStore } from '../../projects/store/useProjectStore'

interface CustomerDrawerProps {
  customer: Customer | null
  onClose: () => void
}

export default function CustomerDrawer({ customer, onClose }: CustomerDrawerProps) {
  const { deleteCustomer } = useCustomerStore()
  const { projects } = useProjectStore()
  const [showProjects, setShowProjects] = useState(true)
  const [showCreateProjectForm, setShowCreateProjectForm] = useState(false)

  const customerProjects = customer
    ? projects.filter((p) => p.customer_id === customer.id)
    : []

  const handleDeleteCustomer = async () => {
    if (!customer) return
    if (!window.confirm(`Excluir o cliente "${customer.name}"?`)) return
    const success = await deleteCustomer(customer.id)
    if (success) onClose()
  }

  return (
    <Drawer
      open={Boolean(customer)}
      onClose={onClose}
      title={customer?.name ?? ''}
      width="520px"
    >
      {customer && (
        <div className="item-drawer-content">
          {/* Meta */}
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Código</span>
            <code className="drawer-meta-code">{customer.code}</code>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Status</span>
            <span className={`badge badge-project-${customer.status}`}>
              {customer.status === 'active' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {customer.description && (
            <div className="drawer-meta-row">
              <span className="drawer-meta-label">Descrição</span>
              <span className="drawer-meta-value">{customer.description}</span>
            </div>
          )}
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Projetos</span>
            <span className="drawer-meta-value">
              <FolderKanban size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
              {customerProjects.length}
            </span>
          </div>

          <hr className="drawer-divider" />

          {/* Edit form */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Editar Cliente</h3>
            <CustomerForm
              mode="edit"
              customer={customer}
              onSuccess={onClose}
              onCancel={onClose}
            />
          </div>

          <hr className="drawer-divider" />

          {/* Create project form */}
          {showCreateProjectForm && (
            <div className="drawer-section">
              <h3 className="drawer-section-title">Novo Projeto</h3>
              <ProjectForm
                mode="create"
                customerId={customer.id}
                onSuccess={() => {
                  setShowCreateProjectForm(false)
                }}
                onCancel={() => setShowCreateProjectForm(false)}
              />
            </div>
          )}

          {!showCreateProjectForm && (
            <div className="drawer-section" style={{ paddingBottom: 0 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateProjectForm(true)}
                style={{ width: '100%' }}
              >
                <Plus size={14} /> Novo Projeto
              </button>
            </div>
          )}

          {showCreateProjectForm && <hr className="drawer-divider" />}

          {/* Projects list */}
          <div className="drawer-section">
            <div
              className="drawer-section-title"
              onClick={() => setShowProjects((v) => !v)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FolderKanban size={15} />
              Projetos ({customerProjects.length})
              <ChevronDown
                size={14}
                style={{
                  transform: showProjects ? 'rotate(0)' : 'rotate(-90deg)',
                  transition: '0.2s',
                  marginLeft: 'auto',
                }}
              />
            </div>

            {showProjects && (
              <>
                {customerProjects.length > 0 ? (
                  <div className="drawer-sub-items">
                    {customerProjects.map((proj) => (
                      <div key={proj.id} className="drawer-sub-item">
                        <div>
                          <div className="child-name">
                            <FolderKanban size={13} style={{ marginRight: 4 }} />
                            {proj.code && (
                              <code className="drawer-meta-code" style={{ marginRight: 6 }}>
                                {proj.code}
                              </code>
                            )}
                            {proj.name}
                          </div>
                          {proj.description && (
                            <div className="child-cat" style={{ marginLeft: 22 }}>
                              {proj.description}
                            </div>
                          )}
                          <div
                            className="child-cat"
                            style={{ marginLeft: 22, fontSize: '0.8rem', color: 'var(--text-muted)' }}
                          >
                            {proj.stock_count}{' '}
                            {proj.stock_count === 1 ? 'item' : 'itens'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      padding: '8px 0',
                    }}
                  >
                    Nenhum projeto associado a este cliente.
                  </p>
                )}
              </>
            )}
          </div>

          <hr className="drawer-divider" />

          {/* Danger zone */}
          <div className="drawer-section" style={{ paddingTop: 0 }}>
            <h3 className="drawer-section-title" style={{ color: 'var(--text-danger)' }}>
              Zona de Risco
            </h3>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteCustomer}
              style={{ width: '100%' }}
            >
              <Trash2 size={14} /> Excluir cliente
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
