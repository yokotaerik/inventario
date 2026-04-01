import type { LucideIcon } from 'lucide-react'

type TabKey = 'status' | 'scanner' | 'history' | 'admin-list' | 'admin-create' | 'admin-employees'

interface BottomNavTab {
  key: TabKey
  label: string
  icon: LucideIcon
}

interface BottomNavProps {
  tabs: readonly BottomNavTab[]
  activeTab: TabKey
  isAuthenticated: boolean
  onNavigate: (tab: TabKey) => void
}

function BottomNav({ tabs, activeTab, isAuthenticated, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.key
        const isAdminTab = tab.key === 'admin-list'
        const isLocked = isAdminTab && !isAuthenticated

        return (
          <button
            key={tab.key}
            type="button"
            className={`nav-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
            onClick={() => onNavigate(tab.key)}
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
