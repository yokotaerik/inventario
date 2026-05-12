import { Package, FolderKanban } from 'lucide-react'
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
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        padding: '20px', 
        textAlign: 'left'
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div
          className="employee-avatar"
          style={{ background: avatarColor, width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0, fontSize: '1.15rem' }}
          aria-hidden="true"
        >
          {initials}
        </div>
        
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
             <h3 className="employee-name" style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
               {employee.name}
             </h3>
             <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
               <span className={`badge ${employee.is_active ? 'badge-available' : 'badge-maintenance'}`}>
                 {employee.is_active ? 'Ativo' : 'Inativo'}
               </span>
               {employee.is_admin && <span className="badge badge-project-active">Admin</span>}
             </div>
          </div>
          
          {(employee.department || employee.email) && (
            <div className="employee-dept" style={{ color: 'var(--ink-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee.department ? employee.department : employee.email}
              {employee.department && employee.email ? ` • ${employee.email}` : ''}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
        {employee.project_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--ink-secondary)', background: 'var(--bg-card-hover)', padding: '8px 12px', borderRadius: '8px' }}>
            <FolderKanban size={15} style={{ color: 'var(--brand)', flexShrink: 0 }} />
            <span style={{ fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee.project_name}
            </span>
          </div>
        )}

        <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeItemCount > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Package size={14} />
              <span>{activeItemCount} {activeItemCount === 1 ? 'item' : 'itens'} em posse</span>
            </div>
          ) : (
            <div style={{ fontSize: '0.85rem', color: 'var(--ink-tertiary)' }}>Nenhum item em posse</div>
          )}
        </div>
      </div>
    </button>
  )
}

