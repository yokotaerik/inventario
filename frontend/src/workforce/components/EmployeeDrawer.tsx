import { useMemo } from 'react'
import { Package, Clock, ArrowUpRight, ArrowDownLeft, PowerOff, MapPin } from 'lucide-react'
import Drawer from '../../shared/components/Drawer'
import EmployeeForm from './EmployeeForm'
import { useEmployeeStore, type Employee } from '../store/useEmployeeStore'
import { useLoanStore } from '../../loans/store/useLoanStore'
import { formatDate } from '../../shared/utils/formatters'
import { getInitials, stringToHslColor } from '../../shared/utils/qr'

interface EmployeeDrawerProps {
  employee: Employee | null
  onClose: () => void
}

export default function EmployeeDrawer({ employee, onClose }: EmployeeDrawerProps) {
  const { updateEmployee, deleteEmployee, adminLoading } = useEmployeeStore()
  const { transactions } = useLoanStore()

  const activeLoans = useMemo(() => {
    if (!employee) return []
    return transactions.filter(
      (t) => t.checkin_time === null && t.employee_name === employee.name,
    )
  }, [transactions, employee])

  const recentHistory = useMemo(() => {
    if (!employee) return []
    return transactions
      .filter((t) => t.employee_name === employee.name)
      .sort((a, b) => {
        const ta = a.checkout_time ? new Date(a.checkout_time).getTime() : 0
        const tb = b.checkout_time ? new Date(b.checkout_time).getTime() : 0
        return tb - ta
      })
      .slice(0, 8)
  }, [transactions, employee])

  const handleToggleStatus = async () => {
    if (!employee) return
    await updateEmployee(employee.id, {
      name: employee.name,
      department: employee.department || '',
      is_active: !employee.is_active,
      project_id: employee.project_id,
    })
  }

  const handleDelete = async () => {
    if (!employee) return
    const confirmed = window.confirm(`Excluir funcionário "${employee.name}"?`)
    if (!confirmed) return
    const success = await deleteEmployee(employee.id)
    if (success) onClose()
  }

  return (
    <Drawer
      open={Boolean(employee)}
      onClose={onClose}
      title="Perfil do Funcionário"
      width="520px"
    >
      {employee && (
        <div className="employee-drawer-content">
          {/* Avatar header */}
          <div className="employee-drawer-hero">
            <div
              className="employee-avatar-lg"
              style={{ background: stringToHslColor(employee.name) }}
            >
              {getInitials(employee.name)}
            </div>
            <div>
              <div className="employee-drawer-name">{employee.name}</div>
              {employee.department && (
                <div className="employee-drawer-dept">{employee.department}</div>
              )}
              {employee.project_name && (
                <div className="employee-drawer-location" style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <MapPin size={13} />
                  {employee.project_name}
                </div>
              )}
              <span
                className={`badge ${employee.is_active ? 'badge-available' : 'badge-maintenance'}`}
              >
                {employee.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          {/* Active loans */}
          {activeLoans.length > 0 && (
            <div className="drawer-section">
              <h3 className="drawer-section-title">
                <Package size={15} /> Itens em posse ({activeLoans.length})
              </h3>
              <div className="drawer-sub-items">
                {activeLoans.map((loan) => (
                  <div key={loan.id} className="drawer-sub-item">
                    <div>
                      <div style={{ fontWeight: 600 }}>{loan.item_name}</div>
                      {loan.destino && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-tertiary)' }}>
                          📍 {loan.destino}
                        </div>
                      )}
                    </div>
                    <span className="badge badge-lent">Em uso</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <hr className="drawer-divider" />

          {/* Edit form */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Editar dados</h3>
            <EmployeeForm
              mode="edit"
              employee={employee}
              onSuccess={onClose}
              onCancel={onClose}
            />
          </div>

          {/* Recent history */}
          {recentHistory.length > 0 && (
            <>
              <hr className="drawer-divider" />
              <div className="drawer-section">
                <h3 className="drawer-section-title">
                  <Clock size={15} /> Histórico recente
                </h3>
                <div className="drawer-history">
                  {recentHistory.map((t) => (
                    <div key={t.id} className="drawer-history-item">
                      <div className="drawer-history-row">
                        <ArrowUpRight size={13} className="history-icon-out" />
                        <span style={{ fontWeight: 600 }}>{t.item_name}</span>
                        <span className="drawer-history-date">{formatDate(t.checkout_time)}</span>
                      </div>
                      {t.checkin_time ? (
                        <div className="drawer-history-row">
                          <ArrowDownLeft size={13} className="history-icon-in" />
                          <span>Devolvido</span>
                          <span className="drawer-history-date">{formatDate(t.checkin_time)}</span>
                        </div>
                      ) : (
                        <span className="badge badge-lent" style={{ marginLeft: 18, marginTop: 2 }}>
                          Em uso
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <hr className="drawer-divider" />
          <div className="drawer-section drawer-actions-row">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleToggleStatus}
              disabled={adminLoading}
            >
              <PowerOff size={14} />
              {employee.is_active ? 'Desativar' : 'Ativar'}
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={adminLoading}
            >
              Excluir
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
