import { useEffect, useMemo, useState } from 'react'
import { Search, Building2, FolderKanban, Plus } from 'lucide-react'
import { useCustomerStore, type Customer } from '../store/useCustomerStore'
import { useProjectStore } from '../../projects/store/useProjectStore'
import CustomerDrawer from './CustomerDrawer'
import CustomerForm from './CustomerForm'

export default function CustomersGrid() {
  const { customers, fetchCustomers } = useCustomerStore()
  const { fetchProjects } = useProjectStore()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchCustomers()
    fetchProjects()
  }, [fetchCustomers, fetchProjects])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return customers
    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
      )
    })
  }, [customers, search])

  // Sync selected customer with updated data
  const syncedCustomer = useMemo(() => {
    if (!selectedCustomer) return null
    return customers.find((c) => c.id === selectedCustomer.id) || null
  }, [customers, selectedCustomer])

  return (
    <>
      {/* Search bar */}
      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            id="customers-search"
            type="text"
            placeholder="Buscar cliente por nome ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
          <h3>Novo Cliente</h3>
          <CustomerForm
            mode="create"
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <div className="table-count">
        {filtered.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
        {search ? ' (filtrado)' : ''}
      </div>

      {/* Grid */}
      <div className="projects-grid">
        {filtered.map((customer) => (
          <div
            key={customer.id}
            className="project-card"
            onClick={() => setSelectedCustomer(customer)}
          >
            <div className="project-card-header">
              <div className="project-card-icon">
                <Building2 size={20} />
              </div>
              <div className="project-card-info">
                <h3>{customer.name}</h3>
                <code className="project-card-code">{customer.code}</code>
              </div>
              <span className="badge badge-project-active">
                {customer.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            {customer.description && (
              <p className="project-card-desc">{customer.description}</p>
            )}

            <div className="project-card-footer">
              <span className="project-card-stat">
                <FolderKanban size={13} /> {customer.project_count}{' '}
                {customer.project_count === 1 ? 'projeto' : 'projetos'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">Nenhum cliente encontrado.</div>
      )}

      <CustomerDrawer
        customer={syncedCustomer}
        onClose={() => setSelectedCustomer(null)}
      />
    </>
  )
}
