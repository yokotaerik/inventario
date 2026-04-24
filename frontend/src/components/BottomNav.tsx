import type { LucideIcon } from 'lucide-react'

// Generic tab key — accepts any string so it works with any routing setup
interface BottomNavTab {
  key: string
  label: string
  icon: LucideIcon
}

interface BottomNavProps {
  tabs: readonly BottomNavTab[]
  activeTab: string
  isAuthenticated: boolean
  onNavigate: (tab: string) => void
}

function BottomNav({ tabs, activeTab, isAuthenticated, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegação principal">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.key
        const isAdminTab = tab.key === 'admin'
        const isLocked = isAdminTab && !isAuthenticated

        return (
          <button
            key={tab.key}
            type="button"
            className={`nav-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
            onClick={() => onNavigate(tab.key)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`${tab.label}${isLocked ? ' (requer login)' : ''}`}
          >
            <span className="nav-icon">
              <Icon size={20} />
            </span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
