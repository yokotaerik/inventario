import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useInventoryStore, type Employee, type Item, type ItemStatus, type StatusItem } from './store/useInventoryStore'
import { QRCodeCanvas } from 'qrcode.react'
import QRScanner from './components/QRScanner'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  Shield,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import './App.css'

type TabKey = 'status' | 'scanner' | 'history' | 'admin-list' | 'admin-create' | 'admin-employees'

interface TabOption {
  key: TabKey
  label: string
  icon: LucideIcon
  requiresLogin?: boolean
}

const tabs: TabOption[] = [
  { key: 'status', label: 'Status', icon: Eye },
  { key: 'scanner', label: 'Scanner', icon: ScanLine },
  { key: 'history', label: 'Histórico', icon: ClipboardList },
  { key: 'admin-list', label: 'Itens', icon: Package, requiresLogin: true },
  { key: 'admin-create', label: 'Criar', icon: Plus, requiresLogin: true },
  { key: 'admin-employees', label: 'Equipe', icon: Users, requiresLogin: true },
]

const statusLabelMap: Record<ItemStatus, string> = {
  available: 'Disponível',
  lent: 'Emprestado',
  maintenance: 'Manutenção',
}

const defaultCreateItem = {
  name: '',
  category: '',
  qr_code_hash: '',
  status: 'available' as ItemStatus,
  parent_item_id: null as number | null,
}

const defaultEmployeeForm = {
  name: '',
  department: '',
  is_active: true,
}

const PULL_TRIGGER = 72
const PULL_MAX = 120
const ITEMS_PER_PAGE = 10
const EMPLOYEES_PER_PAGE = 10

interface ItemTreeNode extends Item {
  children: ItemTreeNode[]
}

/* helpers */

interface StatusGroup {
  parent: StatusItem
  children: StatusItem[]
}

function buildStatusGroups(items: StatusItem[]): { groups: StatusGroup[]; standalone: StatusItem[] } {
  const parentMap = new Map<number, StatusGroup>()
  const standalone: StatusItem[] = []
  const childIds = new Set<number>()

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
    if (!parentMap.has(item.id) && !childIds.has(item.id)) {
      standalone.push(item)
    }
  }

  const groups = Array.from(parentMap.values()).sort((a, b) =>
    a.parent.name.localeCompare(b.parent.name),
  )
  standalone.sort((a, b) => a.name.localeCompare(b.name))

  return { groups, standalone }
}

function formatDate(isoString: string | null): string {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildItemDeepLink(qrHash: string): string {
  const normalized = qrHash.trim()
  if (!normalized) return ''

  if (typeof window === 'undefined') {
    return normalized
  }

  const configuredBase = (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined)?.trim()
  const baseUrl = configuredBase && configuredBase.length > 0
    ? configuredBase.replace(/\/$/, '')
    : window.location.origin

  return `${baseUrl}/?qr=${encodeURIComponent(normalized)}`
}

function normalizeScannedValue(rawValue: string): string {
  const value = rawValue.trim()
  if (!value) return ''

  try {
    const parsed = new URL(value)
    const queryValue = parsed.searchParams.get('qr')
    if (queryValue && queryValue.trim()) {
      return queryValue.trim()
    }

    const pathMatch = parsed.pathname.match(/\/scan\/([^/]+)/)
    if (pathMatch?.[1]) {
      return decodeURIComponent(pathMatch[1]).trim()
    }
  } catch (_err) {
    // Value is not a URL, keep original raw hash.
  }

  return value
}

/* ─────────── App ─────────── */

function App() {
  const {
    employees,
    allEmployees,
    statusItems,
    allItems,
    transactions,
    currentItem,
    loading,
    adminLoading,
    error,
    authError,
    isAuthenticated,
    login,
    logout,
    fetchEmployees,
    fetchStatusItems,
    fetchAllItems,
    fetchAllEmployees,
    fetchTransactions,
    scanItem,
    checkout,
    checkin,
    createItem,
    updateItem,
    deleteItem,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    clearError,
    clearCurrentItem,
  } = useInventoryStore()

  const [activeTab, setActiveTab] = useState<TabKey>('scanner')
  const [selectedEmployee, setSelectedEmployee] = useState<number>(0)
  const [manualCode, setManualCode] = useState('')
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [createItemForm, setCreateItemForm] = useState(defaultCreateItem)
  const [createEmployeeForm, setCreateEmployeeForm] = useState(defaultEmployeeForm)
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null)
  const [editEmployeeForm, setEditEmployeeForm] = useState(defaultEmployeeForm)
  const [itemsPage, setItemsPage] = useState(1)
  const [employeesPage, setEmployeesPage] = useState(1)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editItemForm, setEditItemForm] = useState(defaultCreateItem)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  // Scanner checkout fields
  const [checkoutDestino, setCheckoutDestino] = useState('')
  const [checkoutObs, setCheckoutObs] = useState('')
  // Scanner checkin field
  const [checkinObs, setCheckinObs] = useState('')
  const pullStartYRef = useRef<number | null>(null)

  useEffect(() => {
    fetchEmployees()
    fetchStatusItems()
  }, [fetchEmployees, fetchStatusItems])

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllItems()
      fetchAllEmployees()
    }
  }, [fetchAllEmployees, fetchAllItems, isAuthenticated])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchTransactions()
    }
  }, [activeTab, fetchTransactions])

  /* ─── actions ─── */

  const handleScan = (qrHash: string) => {
    const normalized = normalizeScannedValue(qrHash)
    if (!normalized) return
    scanItem(normalized)
  }

  const refreshData = async () => {
    await fetchStatusItems()
    if (activeTab === 'history') await fetchTransactions()
    if (isAuthenticated) {
      await fetchAllItems()
      await fetchAllEmployees()
    }
  }

  const runRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      setIsRefreshing(false)
    }
  }

  const resetScanner = () => {
    clearCurrentItem()
    clearError()
    setSelectedEmployee(0)
    setCheckoutDestino('')
    setCheckoutObs('')
    setCheckinObs('')
  }

  const statusSummary = useMemo(() => {
    return statusItems.reduce(
      (acc, item) => {
        acc.total += 1
        if (item.status === 'available') acc.available += 1
        if (item.status === 'lent') acc.lent += 1
        if (item.status === 'maintenance') acc.maintenance += 1
        return acc
      },
      { total: 0, available: 0, lent: 0, maintenance: 0 },
    )
  }, [statusItems])

  const { groups: statusGroups, standalone: statusStandalone } = useMemo(
    () => buildStatusGroups(statusItems),
    [statusItems],
  )

  const sortedAdminItems = useMemo(() => {
    const items = [...allItems]
    return items.sort((left, right) => {
      const leftGroup = left.parent_item_name || left.name
      const rightGroup = right.parent_item_name || right.name
      if (leftGroup !== rightGroup) return leftGroup.localeCompare(rightGroup)
      if (left.parent_item_id === null && right.parent_item_id !== null) return -1
      if (left.parent_item_id !== null && right.parent_item_id === null) return 1
      return left.name.localeCompare(right.name)
    })
  }, [allItems])

  const totalItemsPages = Math.max(1, Math.ceil(sortedAdminItems.length / ITEMS_PER_PAGE))
  const paginatedAdminItems = useMemo(() => {
    const start = (itemsPage - 1) * ITEMS_PER_PAGE
    return sortedAdminItems.slice(start, start + ITEMS_PER_PAGE)
  }, [itemsPage, sortedAdminItems])

  const sortedEmployees = useMemo(() => {
    return [...allEmployees].sort((left, right) => left.name.localeCompare(right.name))
  }, [allEmployees])

  const totalEmployeesPages = Math.max(1, Math.ceil(sortedEmployees.length / EMPLOYEES_PER_PAGE))
  const paginatedEmployees = useMemo(() => {
    const start = (employeesPage - 1) * EMPLOYEES_PER_PAGE
    return sortedEmployees.slice(start, start + EMPLOYEES_PER_PAGE)
  }, [employeesPage, sortedEmployees])

  const parentOptions = useMemo(() => {
    return allItems.filter((item) => item.parent_item_id === null)
  }, [allItems])

  const adminTree = useMemo(() => {
    const map = new Map<number, ItemTreeNode>()
    const roots: ItemTreeNode[] = []
    for (const item of allItems) {
      map.set(item.id, { ...item, children: [] })
    }
    for (const item of allItems) {
      const node = map.get(item.id)
      if (!node) continue
      if (item.parent_item_id && map.has(item.parent_item_id)) {
        map.get(item.parent_item_id)?.children.push(node)
      } else {
        roots.push(node)
      }
    }
    const sortNodes = (nodes: ItemTreeNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name))
      nodes.forEach((n) => sortNodes(n.children))
    }
    sortNodes(roots)
    return roots
  }, [allItems])

  const availableParentsForEdit = useMemo(() => {
    if (editingItemId === null) return parentOptions
    return parentOptions.filter((item) => item.id !== editingItemId)
  }, [editingItemId, parentOptions])

  useEffect(() => {
    setItemsPage((current) => Math.min(current, totalItemsPages))
  }, [totalItemsPages])

  useEffect(() => {
    setEmployeesPage((current) => Math.min(current, totalEmployeesPages))
  }, [totalEmployeesPages])

  /* ─── helpers ─── */

  const generateRandomCode = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `ITM-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
  }

  const applyRandomCodeToCreate = () => {
    setCreateItemForm((c) => ({ ...c, qr_code_hash: generateRandomCode() }))
  }

  const applyRandomCodeToEdit = () => {
    setEditItemForm((c) => ({ ...c, qr_code_hash: generateRandomCode() }))
  }

  const downloadQrByCanvasId = (canvasId: string, fileName: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${fileName || 'item'}.png`
    link.click()
  }

  const startEditItem = (item: Item) => {
    setEditingItemId(item.id)
    setEditItemForm({
      name: item.name,
      category: item.category,
      qr_code_hash: item.qr_code_hash,
      status: item.status,
      parent_item_id: item.parent_item_id,
    })
  }

  const cancelEdit = () => {
    setEditingItemId(null)
    setEditItemForm(defaultCreateItem)
  }

  const startEditEmployee = (employee: Employee) => {
    setEditingEmployeeId(employee.id)
    setEditEmployeeForm({
      name: employee.name,
      department: employee.department || '',
      is_active: employee.is_active,
    })
  }

  const cancelEmployeeEdit = () => {
    setEditingEmployeeId(null)
    setEditEmployeeForm(defaultEmployeeForm)
  }

  const handleDeleteEmployee = async (employee: Employee) => {
    const confirmed = window.confirm(`Excluir funcionário "${employee.name}"?`)
    if (!confirmed) return
    const success = await deleteEmployee(employee.id)
    if (success && editingEmployeeId === employee.id) {
      cancelEmployeeEdit()
    }
    if (success) {
      setEmployeesPage((current) => Math.max(1, current))
    }
  }

  const toggleEmployeeStatus = async (employee: Employee) => {
    await updateEmployee(employee.id, {
      name: employee.name,
      department: employee.department || '',
      is_active: !employee.is_active,
    })

    if (editingEmployeeId === employee.id) {
      setEditEmployeeForm((prev) => ({ ...prev, is_active: !employee.is_active }))
    }
  }

  const handleDeleteItem = async (item: Item) => {
    let mode: 'move_children' | 'delete_children' = 'move_children'
    if (item.has_sub_items) {
      const moveChildren = window.confirm(
        'Este item possui subitens. OK para mover filhos para raiz, Cancelar para excluir tudo.',
      )
      mode = moveChildren ? 'move_children' : 'delete_children'
    }
    const confirmed = window.confirm(
      mode === 'move_children'
        ? `Excluir "${item.name}" e mover filhos?`
        : `Excluir "${item.name}" e todos subitens?`,
    )
    if (!confirmed) return
    const success = await deleteItem(item.id, mode)
    if (success && editingItemId === item.id) cancelEdit()
    if (success) {
      setItemsPage((current) => Math.max(1, current))
    }
  }

  const navigate = (tab: TabKey) => {
    const selected = tabs.find((t) => t.key === tab)
    if (selected?.requiresLogin && !isAuthenticated) {
      setActiveTab('admin-list')
      return
    }
    setActiveTab(tab)
  }

  const toggleGroup = (id: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* ─── pull to refresh ─── */

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1 || window.scrollY > 0 || isRefreshing) return
    pullStartYRef.current = e.touches[0].clientY
    setIsPulling(true)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const startY = pullStartYRef.current
    if (startY === null) return
    const delta = e.touches[0].clientY - startY
    if (delta <= 0) { setPullDistance(0); return }
    e.preventDefault()
    setPullDistance(Math.min(PULL_MAX, delta * 0.45))
  }

  const releasePull = () => {
    if (pullStartYRef.current === null) return
    const shouldRefresh = pullDistance >= PULL_TRIGGER
    pullStartYRef.current = null
    setIsPulling(false)
    setPullDistance(0)
    if (shouldRefresh) void runRefresh()
  }

  const submitManualCode = () => {
    const code = manualCode.trim()
    if (!code) return
    handleScan(code)
    setManualCode('')
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const qrFromUrl = params.get('qr')
    if (!qrFromUrl || !qrFromUrl.trim()) return

    setActiveTab('scanner')
    handleScan(qrFromUrl)

    const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`
    window.history.replaceState({}, '', cleanUrl)
  }, [])

  /* ─── form handlers ─── */

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const success = await login(loginForm.username.trim(), loginForm.password)
    if (success) {
      setLoginForm({ username: '', password: '' })
      setActiveTab('admin-list')
    }
  }

  const handleCreateItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const success = await createItem({
      name: createItemForm.name.trim(),
      category: createItemForm.category.trim(),
      qr_code_hash: createItemForm.qr_code_hash.trim(),
      status: createItemForm.status,
      parent_item_id: createItemForm.parent_item_id,
    })
    if (success) {
      setCreateItemForm(defaultCreateItem)
      setActiveTab('admin-list')
    }
  }

  const handleEditItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (editingItemId === null) return
    const success = await updateItem(editingItemId, {
      name: editItemForm.name.trim(),
      category: editItemForm.category.trim(),
      qr_code_hash: editItemForm.qr_code_hash.trim(),
      status: editItemForm.status,
      parent_item_id: editItemForm.parent_item_id,
    })
    if (success) cancelEdit()
  }

  const handleCreateEmployee = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const success = await createEmployee({
      name: createEmployeeForm.name.trim(),
      department: createEmployeeForm.department.trim(),
      is_active: createEmployeeForm.is_active,
    })
    if (success) {
      setCreateEmployeeForm(defaultEmployeeForm)
    }
  }

  const handleEditEmployee = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (editingEmployeeId === null) return
    const success = await updateEmployee(editingEmployeeId, {
      name: editEmployeeForm.name.trim(),
      department: editEmployeeForm.department.trim(),
      is_active: editEmployeeForm.is_active,
    })
    if (success) {
      cancelEmployeeEdit()
    }
  }

  const handleLogout = () => {
    logout()
    setActiveTab('scanner')
  }

  /* ═══════════════════════════════════════════
     RENDER: Status Tab
     ═══════════════════════════════════════════ */

  const renderStatus = () => (
    <section>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{statusSummary.total}</div>
        </div>
        <div className="kpi-card kpi-available">
          <div className="kpi-label">Disponíveis</div>
          <div className="kpi-value">{statusSummary.available}</div>
        </div>
        <div className="kpi-card kpi-lent">
          <div className="kpi-label">Emprestados</div>
          <div className="kpi-value">{statusSummary.lent}</div>
        </div>
        <div className="kpi-card kpi-maintenance">
          <div className="kpi-label">Manutenção</div>
          <div className="kpi-value">{statusSummary.maintenance}</div>
        </div>
      </div>

      {statusGroups.map((group) => {
        const isOpen = expandedGroups.has(group.parent.id)
        return (
          <div className="group-card" key={group.parent.id}>
            <div className="group-header" onClick={() => toggleGroup(group.parent.id)}>
              <div className="group-title">
                <Package size={16} />
                {group.parent.name}
                <span className="group-category">{group.parent.category}</span>
              </div>
              <div className="group-right">
                <span className={`badge badge-${group.parent.status}`}>
                  {statusLabelMap[group.parent.status]}
                </span>
                <span className="badge-count">{group.children.length} sub</span>
                <ChevronDown size={16} className={`group-chevron ${isOpen ? 'open' : ''}`} />
              </div>
            </div>
            {isOpen && group.children.length > 0 && (
              <div className="group-children">
                {group.children.map((child) => (
                  <div className="child-item" key={child.id}>
                    <div>
                      <div className="child-name">{child.name}</div>
                      <div className="child-cat">{child.category}</div>
                      {child.status === 'lent' && (
                        <div className="holder-tag">Com: {child.holder || '—'}</div>
                      )}
                    </div>
                    <span className={`badge badge-${child.status}`}>
                      {statusLabelMap[child.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {statusStandalone.map((item) => (
        <div className="standalone-item" key={item.id}>
          <div className="item-info">
            <h3>{item.name}</h3>
            <p>{item.category}</p>
            {item.status === 'lent' && (
              <div className="holder-tag">Com: {item.holder || '—'}</div>
            )}
          </div>
          <span className={`badge badge-${item.status}`}>{statusLabelMap[item.status]}</span>
        </div>
      ))}

      {statusItems.length === 0 && (
        <div className="empty-state">Nenhum item cadastrado.</div>
      )}
    </section>
  )

  /* ═══════════════════════════════════════════
     RENDER: Scanner Tab
     ═══════════════════════════════════════════ */

  const renderScanner = () => {
    if (loading) {
      return (
        <div className="state-box">
          <Loader2 size={28} className="spin" />
          <p>Buscando informações...</p>
        </div>
      )
    }

    if (!currentItem) {
      return (
        <section className="scanner-section">
          <h2>Escanear Item</h2>
          <p>Aponte a câmera para o QR Code ou digite o código manualmente.</p>
          <div className="manual-entry">
            <label htmlFor="manual-code">Código manual</label>
            <div className="inline-group">
              <input
                id="manual-code"
                type="text"
                placeholder="Ex.: ITM-001"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitManualCode() }}
              />
              <button type="button" className="btn btn-primary" onClick={submitManualCode}>
                <Camera size={16} /> Buscar
              </button>
            </div>
          </div>
          <QRScanner onScan={handleScan} />
        </section>
      )
    }

    return (
      <section className="scan-result">
        <div className="scan-item-card">
          <div className="scan-icon">
            <Package size={24} />
          </div>
          <h2>{currentItem.item.name}</h2>
          <p>{currentItem.item.category} • {statusLabelMap[currentItem.item.status]}</p>
        </div>

        {currentItem.item.status === 'available' ? (
          <div className="action-card">
            <label htmlFor="employee-select">Funcionário responsável</label>
            <div className="select-wrap">
              <User size={16} />
              <select
                id="employee-select"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(Number(e.target.value))}
              >
                <option value={0}>Selecione um funcionário</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="checkout-destino">
                <MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Destino
              </label>
              <input
                id="checkout-destino"
                type="text"
                placeholder="Ex.: Obra Centro, Sala 3..."
                value={checkoutDestino}
                onChange={(e) => setCheckoutDestino(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="checkout-obs">
                <MessageSquare size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Observação
              </label>
              <textarea
                id="checkout-obs"
                className="form-textarea"
                placeholder="Alguma nota sobre esta retirada..."
                value={checkoutObs}
                onChange={(e) => setCheckoutObs(e.target.value)}
                rows={2}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={selectedEmployee === 0}
              onClick={async () => {
                await checkout(currentItem.item.id, selectedEmployee, {
                  destino: checkoutDestino.trim() || undefined,
                  observacao: checkoutObs.trim() || undefined,
                })
                setSelectedEmployee(0)
                setCheckoutDestino('')
                setCheckoutObs('')
              }}
            >
              <LogOut size={16} /> Confirmar retirada
            </button>
          </div>
        ) : (
          <div className="action-card">
            <p className="info-text">
              Retirado por: <strong>{currentItem.current_transaction?.employee?.name || 'Sem registro'}</strong>
            </p>

            <div className="form-field">
              <label htmlFor="checkin-obs">
                <MessageSquare size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Observação de devolução
              </label>
              <textarea
                id="checkin-obs"
                className="form-textarea"
                placeholder="Alguma nota sobre esta devolução..."
                value={checkinObs}
                onChange={(e) => setCheckinObs(e.target.value)}
                rows={2}
              />
            </div>

            <button
              type="button"
              className="btn btn-success btn-block"
              onClick={async () => {
                await checkin(currentItem.item.id, {
                  observacao: checkinObs.trim() || undefined,
                })
                setCheckinObs('')
              }}
            >
              <CheckCircle2 size={16} /> Confirmar devolução
            </button>
          </div>
        )}

        <button type="button" className="btn btn-ghost btn-block" onClick={resetScanner}>
          Cancelar
        </button>
      </section>
    )
  }

  /* ═══════════════════════════════════════════
     RENDER: History Tab
     ═══════════════════════════════════════════ */

  const renderHistory = () => (
    <section className="history-section">
      <div className="section-header">
        <h2>Movimentações</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={fetchTransactions}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">Nenhuma movimentação registrada.</div>
      ) : (
        <div className="history-list">
          {transactions.map((t) => {
            const isOpen = t.checkin_time === null
            return (
              <div className={`history-card ${isOpen ? 'history-open' : 'history-closed'}`} key={t.id}>
                <div className="history-header">
                  <div className="history-item-info">
                    <span className="history-item-name">{t.item_name}</span>
                    <span className="history-item-cat">{t.item_category}</span>
                  </div>
                  <span className={`badge ${isOpen ? 'badge-lent' : 'badge-available'}`}>
                    {isOpen ? 'Em uso' : 'Devolvido'}
                  </span>
                </div>

                <div className="history-body">
                  <div className="history-row">
                    <ArrowUpRight size={14} className="history-icon-out" />
                    <div className="history-row-content">
                      <span className="history-row-label">Retirada</span>
                      <span className="history-row-value">{formatDate(t.checkout_time)}</span>
                      <span className="history-row-detail">
                        <User size={12} /> {t.employee_name}
                      </span>
                      {t.destino && (
                        <span className="history-row-detail">
                          <MapPin size={12} /> {t.destino}
                        </span>
                      )}
                      {t.observacao && (
                        <span className="history-row-obs">{t.observacao}</span>
                      )}
                    </div>
                  </div>

                  {t.checkin_time && (
                    <div className="history-row">
                      <ArrowDownLeft size={14} className="history-icon-in" />
                      <div className="history-row-content">
                        <span className="history-row-label">Devolução</span>
                        <span className="history-row-value">{formatDate(t.checkin_time)}</span>
                        {t.observacao_checkin && (
                          <span className="history-row-obs">{t.observacao_checkin}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )

  /* ═══════════════════════════════════════════
     RENDER: Admin Content
     ═══════════════════════════════════════════ */

  const renderAdminContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="login-card">
          <div className="login-icon">
            <Shield size={26} />
          </div>
          <h2>Área Administrativa</h2>
          <p>Faça login para gerenciar o inventário.</p>
          <form onSubmit={handleLogin} className="form-stack">
            <div className="form-field">
              <label htmlFor="username">Usuário</label>
              <input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={loginForm.username}
                onChange={(e) => setLoginForm((c) => ({ ...c, username: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={loginForm.password}
                onChange={(e) => setLoginForm((c) => ({ ...c, password: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={adminLoading}>
              {adminLoading ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
              Entrar
            </button>
          </form>
        </div>
      )
    }

    const createHashValue = createItemForm.qr_code_hash.trim() || 'SEM-CODIGO'
    const createPreviewValue = buildItemDeepLink(createHashValue)
    const editHashValue = editItemForm.qr_code_hash.trim() || 'SEM-CODIGO'
    const editPreviewValue = buildItemDeepLink(editHashValue)

    const renderTreeNodes = (nodes: ItemTreeNode[], depth = 0) =>
      nodes.map((node) => (
        <li key={node.id}>
          <div className="tree-node" style={{ paddingLeft: `${depth * 20 + 16}px` }}>
            <span className="tree-name">{node.name}</span>
            <span className="tree-meta">{node.category}</span>
            <span className={`badge badge-${node.status}`}>{statusLabelMap[node.status]}</span>
          </div>
          {node.children.length > 0 && (
            <ul className="tree-list">{renderTreeNodes(node.children, depth + 1)}</ul>
          )}
        </li>
      ))

    if (activeTab === 'admin-create') {
      return (
        <div className="create-card">
          <h2>Novo Item</h2>
          <p>Cadastre um equipamento com código QR único.</p>

          <form className="create-form-grid" onSubmit={handleCreateItem}>
            <div className="form-field">
              <label htmlFor="item-name">Nome</label>
              <input
                id="item-name"
                type="text"
                placeholder="Ex.: Notebook Dell"
                value={createItemForm.name}
                onChange={(e) => setCreateItemForm((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="item-category">Categoria</label>
              <input
                id="item-category"
                type="text"
                placeholder="Ex.: TI"
                value={createItemForm.category}
                onChange={(e) => setCreateItemForm((c) => ({ ...c, category: e.target.value }))}
                required
              />
            </div>
            <div className="form-field full-width">
              <label htmlFor="item-qr">Código QR</label>
              <div className="code-input-wrap">
                <input
                  id="item-qr"
                  type="text"
                  placeholder="Digite ou gere aleatório"
                  value={createItemForm.qr_code_hash}
                  onChange={(e) => setCreateItemForm((c) => ({ ...c, qr_code_hash: e.target.value }))}
                  required
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={applyRandomCodeToCreate}>
                  <Sparkles size={14} /> Gerar
                </button>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="item-status">Status</label>
              <select
                id="item-status"
                value={createItemForm.status}
                onChange={(e) => setCreateItemForm((c) => ({ ...c, status: e.target.value as ItemStatus }))}
              >
                <option value="available">Disponível</option>
                <option value="maintenance">Manutenção</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="item-parent">Item pai</label>
              <select
                id="item-parent"
                value={createItemForm.parent_item_id === null ? '' : String(createItemForm.parent_item_id)}
                onChange={(e) => setCreateItemForm((c) => ({
                  ...c,
                  parent_item_id: e.target.value ? Number(e.target.value) : null,
                }))}
              >
                <option value="">Nenhum (raiz)</option>
                {parentOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field full-width">
              <button type="submit" className="btn btn-primary btn-block" disabled={adminLoading}>
                {adminLoading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                Criar item
              </button>
            </div>
          </form>

          <div className="qr-preview">
            <h3>Prévia QR (link público)</h3>
            <QRCodeCanvas id="create-qr-preview" value={createPreviewValue} size={140} includeMargin level="H" />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => downloadQrByCanvasId('create-qr-preview', createHashValue)}
            >
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      )
    }

    if (activeTab === 'admin-employees') {
      return (
        <section className="admin-section">
          <div className="section-header">
            <h2>Funcionários</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={fetchAllEmployees}>
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>

          <div className="create-card">
            <h2>Novo Funcionário</h2>
            <p>Cadastre colaboradores para controle de retirada e devolução.</p>

            <form className="create-form-grid" onSubmit={handleCreateEmployee}>
              <div className="form-field">
                <label htmlFor="employee-name">Nome</label>
                <input
                  id="employee-name"
                  type="text"
                  placeholder="Ex.: João Silva"
                  value={createEmployeeForm.name}
                  onChange={(e) => setCreateEmployeeForm((c) => ({ ...c, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="employee-department">Departamento</label>
                <input
                  id="employee-department"
                  type="text"
                  placeholder="Ex.: Operacional"
                  value={createEmployeeForm.department}
                  onChange={(e) => setCreateEmployeeForm((c) => ({ ...c, department: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="employee-active">Status</label>
                <select
                  id="employee-active"
                  value={createEmployeeForm.is_active ? 'true' : 'false'}
                  onChange={(e) => setCreateEmployeeForm((c) => ({ ...c, is_active: e.target.value === 'true' }))}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
              <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button type="submit" className="btn btn-primary btn-block" disabled={adminLoading}>
                  {adminLoading ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
                  Criar funcionário
                </button>
              </div>
            </form>
          </div>

          {editingEmployeeId !== null && (
            <div className="edit-panel">
              <div className="edit-panel-header">
                <h3><Pencil size={16} /> Editar Funcionário</h3>
                <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEmployeeEdit}>
                  <X size={14} /> Cancelar
                </button>
              </div>

              <form className="edit-form-grid" onSubmit={handleEditEmployee}>
                <div className="form-field">
                  <label htmlFor="edit-employee-name">Nome</label>
                  <input
                    id="edit-employee-name"
                    type="text"
                    value={editEmployeeForm.name}
                    onChange={(e) => setEditEmployeeForm((c) => ({ ...c, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="edit-employee-department">Departamento</label>
                  <input
                    id="edit-employee-department"
                    type="text"
                    value={editEmployeeForm.department}
                    onChange={(e) => setEditEmployeeForm((c) => ({ ...c, department: e.target.value }))}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="edit-employee-active">Status</label>
                  <select
                    id="edit-employee-active"
                    value={editEmployeeForm.is_active ? 'true' : 'false'}
                    onChange={(e) => setEditEmployeeForm((c) => ({ ...c, is_active: e.target.value === 'true' }))}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <div className="form-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary btn-block" disabled={adminLoading}>
                    {adminLoading ? <Loader2 size={16} className="spin" /> : <Pencil size={14} />}
                    Salvar funcionário
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Departamento</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td><span className="row-name">{employee.name}</span></td>
                      <td>{employee.department || '—'}</td>
                      <td>
                        <span className={`badge ${employee.is_active ? 'badge-available' : 'badge-maintenance'}`}>
                          {employee.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn-icon" title="Editar" onClick={() => startEditEmployee(employee)}>
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title={employee.is_active ? 'Desativar' : 'Ativar'}
                            onClick={() => void toggleEmployeeStatus(employee)}
                          >
                            <Users size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            title="Excluir"
                            onClick={() => void handleDeleteEmployee(employee)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {allEmployees.length > 0 && (
              <div className="table-pagination">
                <span>Página {employeesPage} de {totalEmployeesPages}</span>
                <div className="table-pagination-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={employeesPage === 1}
                    onClick={() => setEmployeesPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={employeesPage === totalEmployeesPages}
                    onClick={() => setEmployeesPage((current) => Math.min(totalEmployeesPages, current + 1))}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
            {allEmployees.length === 0 && !adminLoading && (
              <div className="empty-state">Nenhum funcionário cadastrado.</div>
            )}
          </div>
        </section>
      )
    }

    return (
      <section className="admin-section">
        <div className="section-header">
          <h2>Inventário</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={fetchAllItems}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        <div className="tree-card">
          <div className="tree-card-header">
            <Package size={16} /> Estrutura hierárquica
          </div>
          {adminTree.length === 0 ? (
            <div className="empty-state">Nenhum item cadastrado.</div>
          ) : (
            <ul className="tree-list">{renderTreeNodes(adminTree)}</ul>
          )}
        </div>

        {editingItemId !== null && (
          <div className="edit-panel">
            <div className="edit-panel-header">
              <h3><Pencil size={16} /> Editar Item</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                <X size={14} /> Cancelar
              </button>
            </div>

            <form className="edit-form-grid" onSubmit={handleEditItem}>
              <div className="form-field">
                <label htmlFor="edit-item-name">Nome</label>
                <input
                  id="edit-item-name"
                  type="text"
                  value={editItemForm.name}
                  onChange={(e) => setEditItemForm((c) => ({ ...c, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="edit-item-category">Categoria</label>
                <input
                  id="edit-item-category"
                  type="text"
                  value={editItemForm.category}
                  onChange={(e) => setEditItemForm((c) => ({ ...c, category: e.target.value }))}
                  required
                />
              </div>
              <div className="form-field full-width">
                <label htmlFor="edit-item-qr">Código QR</label>
                <div className="code-input-wrap">
                  <input
                    id="edit-item-qr"
                    type="text"
                    value={editItemForm.qr_code_hash}
                    onChange={(e) => setEditItemForm((c) => ({ ...c, qr_code_hash: e.target.value }))}
                    required
                  />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={applyRandomCodeToEdit}>
                    <Sparkles size={14} /> Gerar
                  </button>
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="edit-item-status">Status</label>
                <select
                  id="edit-item-status"
                  value={editItemForm.status}
                  onChange={(e) => setEditItemForm((c) => ({ ...c, status: e.target.value as ItemStatus }))}
                >
                  <option value="available">Disponível</option>
                  <option value="lent">Emprestado</option>
                  <option value="maintenance">Manutenção</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="edit-item-parent">Item pai</label>
                <select
                  id="edit-item-parent"
                  value={editItemForm.parent_item_id === null ? '' : String(editItemForm.parent_item_id)}
                  onChange={(e) => setEditItemForm((c) => ({
                    ...c,
                    parent_item_id: e.target.value ? Number(e.target.value) : null,
                  }))}
                >
                  <option value="">Nenhum (raiz)</option>
                  {availableParentsForEdit.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field full-width">
                <div className="edit-footer">
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={adminLoading}>
                    {adminLoading ? <Loader2 size={16} className="spin" /> : <Pencil size={14} />}
                    Salvar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => downloadQrByCanvasId('edit-qr-preview', editPreviewValue)}
                  >
                    <Download size={14} /> QR
                  </button>
                </div>
              </div>
            </form>

            <div className="qr-preview" style={{ marginTop: 16 }}>
              <h3>Prévia QR (link público)</h3>
              <QRCodeCanvas id="edit-qr-preview" value={editPreviewValue} size={120} includeMargin level="H" />
            </div>
          </div>
        )}

        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>QR</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAdminItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.parent_item_id ? (
                        <span className="row-child">↳ {item.name}</span>
                      ) : (
                        <span className="row-name">{item.name}</span>
                      )}
                    </td>
                    <td>{item.category}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--ink-tertiary)' }}>
                      {item.qr_code_hash.length > 12
                        ? item.qr_code_hash.slice(0, 12) + '…'
                        : item.qr_code_hash}
                    </td>
                    <td>
                      <span className={`badge badge-${item.status}`}>
                        {statusLabelMap[item.status]}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn-icon" title="Editar" onClick={() => startEditItem(item)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="btn-icon btn-icon-danger" title="Excluir" onClick={() => handleDeleteItem(item)}>
                          <Trash2 size={14} />
                        </button>
                        <button type="button" className="btn-icon" title="Download QR" onClick={() => downloadQrByCanvasId(`item-qr-${item.id}`, item.qr_code_hash)}>
                          <Download size={14} />
                        </button>
                        <QRCodeCanvas
                          id={`item-qr-${item.id}`}
                          value={buildItemDeepLink(item.qr_code_hash)}
                          size={56}
                          includeMargin
                          level="H"
                          className="row-hidden-qr"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allItems.length > 0 && (
            <div className="table-pagination">
              <span>Página {itemsPage} de {totalItemsPages}</span>
              <div className="table-pagination-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={itemsPage === 1}
                  onClick={() => setItemsPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={itemsPage === totalItemsPages}
                  onClick={() => setItemsPage((current) => Math.min(totalItemsPages, current + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
          {allItems.length === 0 && !adminLoading && (
            <div className="empty-state">Nenhum item cadastrado.</div>
          )}
        </div>
      </section>
    )
  }

  /* ═══════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════ */

  const pullIndicatorVisible = isPulling || isRefreshing
  const pullIndicatorOffset = isRefreshing ? 10 : Math.min(pullDistance - 62, 10)

  const pageTitle = activeTab === 'status' ? 'Status Geral'
    : activeTab === 'scanner' ? 'Scanner QR'
    : activeTab === 'history' ? 'Histórico'
    : activeTab === 'admin-create' ? 'Novo Item'
    : activeTab === 'admin-employees' ? 'Funcionários'
    : 'Inventário'

  return (
    <div
      className="app-shell"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={releasePull}
      onTouchCancel={releasePull}
    >
      <div
        className={`pull-indicator ${pullIndicatorVisible ? 'visible' : ''} ${pullDistance >= PULL_TRIGGER ? 'ready' : ''}`}
        style={{ transform: `translate(-50%, ${pullIndicatorOffset}px)` }}
      >
        <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
        <span>
          {isRefreshing
            ? 'Atualizando...'
            : pullDistance >= PULL_TRIGGER
              ? 'Solte para atualizar'
              : 'Puxe para atualizar'}
        </span>
      </div>

      <div className={`pull-layer ${isPulling ? 'pulling' : ''}`} style={{ transform: `translateY(${pullDistance}px)` }}>
        <header className="topbar">
          <div className="topbar-title">
            <Package size={20} />
            <span>{pageTitle}</span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className={`topbar-btn ${isRefreshing ? 'active' : ''}`}
              title="Atualizar"
              onClick={() => void runRefresh()}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
            </button>

            {isAuthenticated && (
              <button type="button" className="topbar-btn danger-btn" title="Sair" onClick={handleLogout}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        {(error || authError) && (
          <div className="alert-bar">
            <div className="alert">
              <span>{error || authError}</span>
              <button type="button" className="alert-close" onClick={clearError}>
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="content">
          {activeTab === 'status' && renderStatus()}
          {activeTab === 'scanner' && renderScanner()}
          {activeTab === 'history' && renderHistory()}
          {(activeTab === 'admin-list' || activeTab === 'admin-create' || activeTab === 'admin-employees') && renderAdminContent()}
        </div>
      </div>

      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          const isLocked = Boolean(tab.requiresLogin && !isAuthenticated)
          return (
            <button
              key={tab.key}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => navigate(tab.key)}
            >
              <span className="nav-icon">
                <Icon size={20} />
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default App
