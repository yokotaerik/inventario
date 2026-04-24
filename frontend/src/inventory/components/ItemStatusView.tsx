import { useMemo, useState } from 'react'
import { ChevronDown, Package } from 'lucide-react'
import { useItemStore, type StatusItem } from '../store/useItemStore'

const statusLabelMap = {
  available: 'Disponível',
  lent: 'Emprestado',
  maintenance: 'Manutenção',
} as const

type Status = keyof typeof statusLabelMap

interface StatusGroup {
  parent: StatusItem
  children: StatusItem[]
}

function buildStatusGroups(items: StatusItem[]): { groups: StatusGroup[]; standalone: StatusItem[] } {
  const parentMap = new Map<number, StatusGroup>()
  const childIds = new Set<number>()
  const standalone: StatusItem[] = []

  for (const item of items) {
    if (item.has_sub_items && item.parent_item_id === null) {
      parentMap.set(item.id, { parent: item, children: [] })
    }
  }
  for (const item of items) {
    if (item.parent_item_id !== null && parentMap.has(item.parent_item_id)) {
      parentMap.get(item.parent_item_id)!.children.push(item)
      childIds.add(item.id)
    }
  }
  for (const item of items) {
    if (!parentMap.has(item.id) && !childIds.has(item.id)) standalone.push(item)
  }

  const groups = Array.from(parentMap.values()).sort((a, b) =>
    a.parent.name.localeCompare(b.parent.name),
  )
  standalone.sort((a, b) => a.name.localeCompare(b.name))
  return { groups, standalone }
}

function ChildSummaryBadges({ children }: { children: StatusItem[] }) {
  const avail = children.filter((c) => c.status === 'available').length
  const lent = children.filter((c) => c.status === 'lent').length
  const maint = children.filter((c) => c.status === 'maintenance').length
  return (
    <div className="child-summary-badges">
      {avail > 0 && <span className="badge badge-available badge-mini">{avail} disp.</span>}
      {lent > 0 && <span className="badge badge-lent badge-mini">{lent} emp.</span>}
      {maint > 0 && <span className="badge badge-maintenance badge-mini">{maint} man.</span>}
    </div>
  )
}

export default function ItemStatusView() {
  const { statusItems } = useItemStore()
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const filtered = useMemo<StatusItem[]>(() => {
    return statusItems.filter((i) => {
      if (filterStatus !== 'all' && i.status !== filterStatus) return false
      return true
    })
  }, [statusItems, filterStatus])

  const { groups, standalone } = useMemo(() => buildStatusGroups(filtered), [filtered])

  const summary = useMemo(
    () =>
      statusItems.reduce(
        (acc, item) => {
          acc.total++
          if (item.status === 'available') acc.available++
          if (item.status === 'lent') acc.lent++
          if (item.status === 'maintenance') acc.maintenance++
          return acc
        },
        { total: 0, available: 0, lent: 0, maintenance: 0 },
      ),
    [statusItems],
  )

  const utilization = summary.total > 0 ? Math.round((summary.lent / summary.total) * 100) : 0

  const toggleGroup = (id: number) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{summary.total}</div>
        </div>
        <div className="kpi-card kpi-available">
          <div className="kpi-label">Disponíveis</div>
          <div className="kpi-value">{summary.available}</div>
        </div>
        <div className="kpi-card kpi-lent">
          <div className="kpi-label">Emprestados</div>
          <div className="kpi-value">{summary.lent}</div>
        </div>
        <div className="kpi-card kpi-maintenance">
          <div className="kpi-label">Manutenção</div>
          <div className="kpi-value">{summary.maintenance}</div>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="utilization-bar-wrap">
        <div className="utilization-label">
          <span>Taxa de uso</span>
          <strong>{utilization}%</strong>
        </div>
        <div className="utilization-track">
          <div className="utilization-fill" style={{ width: `${utilization}%` }} />
        </div>
        {summary.maintenance > 0 && (
          <div className="utilization-alert">
            ⚠️ {summary.maintenance} {summary.maintenance === 1 ? 'item' : 'itens'} em manutenção
          </div>
        )}
      </div>

      {/* Filter pills + project filter */}
      <div className="filter-pills">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'available', label: 'Disponíveis' },
          { key: 'lent', label: 'Emprestados' },
          { key: 'maintenance', label: 'Manutenção' },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`filter-pill ${filterStatus === opt.key ? 'active' : ''} ${opt.key !== 'all' ? `pill-${opt.key}` : ''}`}
            onClick={() => setFilterStatus(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Groups */}
      {groups.map((group) => {
        const isOpen = expandedGroups.has(group.parent.id)
        const parentStatus = group.parent.status as Status
        return (
          <div className="group-card" key={group.parent.id}>
            <div
              className="group-header"
              onClick={() => toggleGroup(group.parent.id)}
            >
              <div className="group-title">
                <Package size={16} />
                {group.parent.name}
                <span className="group-category">{group.parent.category}</span>
              </div>
              <div className="group-right">
                <span className={`badge badge-${parentStatus}`}>
                  {statusLabelMap[parentStatus]}
                </span>
                <span className="badge-count">{group.children.length} sub</span>
                <ChevronDown size={16} className={`group-chevron ${isOpen ? 'open' : ''}`} />
              </div>
            </div>

            {/* Child summary (always visible) */}
            {!isOpen && group.children.length > 0 && (
              <div className="group-summary-bar">
                <ChildSummaryBadges children={group.children} />
              </div>
            )}

            {isOpen && group.children.length > 0 && (
              <div className="group-children">
                {group.children.map((child) => {
                  const childStatus = child.status as Status
                  return (
                    <div className="child-item child-item-enhanced" key={child.id}>
                      <div className="child-item-left">
                        <div className="child-connector" />
                        <div>
                          <div className="child-name">{child.name}</div>
                          <div className="child-cat">{child.category}</div>
                          {child.status === 'lent' && (
                            <div className="holder-tag">Com: {child.holder || '—'}</div>
                          )}
                        </div>
                      </div>
                      <span className={`badge badge-${childStatus}`}>
                        {statusLabelMap[childStatus]}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Standalone */}
      {standalone.map((item) => {
        const itemStatus = item.status as Status
        return (
          <div className="standalone-item" key={item.id}>
            <div className="item-info">
              <h3>{item.name}</h3>
              <p>{item.category}</p>
              {item.status === 'lent' && (
                <div className="holder-tag">Com: {item.holder || '—'}</div>
              )}
            </div>
            <span className={`badge badge-${itemStatus}`}>{statusLabelMap[itemStatus]}</span>
          </div>
        )
      })}

      {statusItems.length === 0 && (
        <div className="empty-state">Nenhum item cadastrado.</div>
      )}
    </section>
  )
}
