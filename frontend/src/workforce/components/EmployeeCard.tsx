import { Package, MapPin } from 'lucide-react'
import { type Employee } from '../store/useEmployeeStore'
import { getInitials, stringToHslColor } from '../../shared/utils/qr'

interface EmployeeCardProps {
  employee: Employee
  activeItemCount: number
  onClick: () => void
}

export default function EmployeeCard({ employee, activeItemCount, onClick }: EmployeeCardProps) {
  const initials = getInitials(employee.name)
  const avatarColor = stringToHslColor(employee.name)

  return (
    <button
      type="button"
      className={`employee-card ${!employee.is_active ? 'employee-card-inactive' : ''}`}
      onClick={onClick}
      aria-label={`Ver perfil de ${employee.name}`}
    >
      <div className="employee-card-header">
        <div
          className="employee-avatar"
          style={{ background: avatarColor }}
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="employee-card-status">
          <span
            className={`badge ${employee.is_active ? 'badge-available' : 'badge-maintenance'}`}
          >
            {employee.is_active ? 'Ativo' : 'Inativo'}
          </span>
          {employee.is_admin && <span className="badge badge-project-active">ADMIN</span>}
        </div>
      </div>

      <div className="employee-card-body">
        <div className="employee-name">{employee.name}</div>
        {employee.email && (
          <div className="employee-dept" style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)' }}>
            {employee.email}
          </div>
        )}
        {employee.department && (
          <div className="employee-dept">{employee.department}</div>
        )}
        {employee.location_name && (
          <div className="employee-location-tag">
            <MapPin size={11} />
            <span>{employee.location_name}</span>
            {employee.project_name && (
              <span className="employee-location-project"> • {employee.project_name}</span>
            )}
          </div>
        )}
      </div>

      <div className="employee-card-footer">
        {activeItemCount > 0 ? (
          <div className="employee-items-badge">
            <Package size={13} />
            <span>
              {activeItemCount} {activeItemCount === 1 ? 'item' : 'itens'} em posse
            </span>
          </div>
        ) : (
          <div className="employee-items-empty">Nenhum item em posse</div>
        )}
      </div>
    </button>
  )
}

