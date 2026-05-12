import { useMemo, useState } from 'react'
import { RefreshCw, Search, UserPlus } from 'lucide-react'
import { useEmployeeStore, type Employee } from '../store/useEmployeeStore'
import { useLoanStore } from '../../loans/store/useLoanStore'
import EmployeeCard from './EmployeeCard'
import EmployeeDrawer from './EmployeeDrawer'
import EmployeeForm from './EmployeeForm'
import { useIsAdmin } from '../../shared/hooks/useIsAdmin'

export default function EmployeeGrid() {
  const isAdmin = useIsAdmin()
  const { allEmployees, adminLoading, fetchAllEmployees } = useEmployeeStore()
  const { transactions } = useLoanStore()
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // count active items per employee (employee_name match, no checkin)
  const activeItemCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of transactions) {
      if (t.checkin_time === null) {
        counts[t.employee_name] = (counts[t.employee_name] || 0) + 1
      }
    }
    return counts
  }, [transactions])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allEmployees
      .filter((emp) => {
        if (filterStatus === 'active' && !emp.is_active) return false
        if (filterStatus === 'inactive' && emp.is_active) return false
        if (!q) return true
        return (
          emp.name.toLowerCase().includes(q) ||
          (emp.department || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allEmployees, search, filterStatus])

  return (
    <div>
      {/* Toolbar */}
      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            id="employees-search"
            type="text"
            placeholder="Buscar por nome ou departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void fetchAllEmployees()}
          disabled={adminLoading}
          title="Atualizar"
        >
          <RefreshCw size={14} className={adminLoading ? 'spin' : ''} />
        </button>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateForm((v) => !v)}
          >
            <UserPlus size={14} /> Novo
          </button>
        )}
      </div>

      {/* Create form (collapsible) */}
      {isAdmin && showCreateForm && (
        <div className="create-card" style={{ marginBottom: 20 }}>
          <h2>Novo Funcionário</h2>
          <p>Cadastre colaboradores para controle de retirada e devolução.</p>
          <EmployeeForm
            mode="create"
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <div className="table-count">
        {filtered.length} {filtered.length === 1 ? 'funcionário' : 'funcionários'}
        {search || filterStatus !== 'all' ? ' (filtrado)' : ''}
      </div>

      {/* Grid */}
      {filtered.length === 0 && !adminLoading ? (
        <div className="empty-state">Nenhum funcionário encontrado.</div>
      ) : (
        <div className="employee-grid">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              activeItemCount={activeItemCounts[emp.name] || 0}
              onClick={() => setSelectedEmployee(emp)}
            />
          ))}
        </div>
      )}

      {isAdmin && (
        <EmployeeDrawer
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  )
}
