import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  useInventoryStore,
  type BatchOperationResult,
  type Employee,
  type Item,
  type ItemStatus,
  type StatusItem,
  type TransactionHistory,
} from './store/useInventoryStore'
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
} from 'lucide-react'
import BottomNav from './components/BottomNav.tsx'
import './App.css'

type TabKey = 'status' | 'scanner' | 'history' | 'admin-list' | 'admin-create' | 'admin-employees'

const tabs = [
  { key: 'scanner', label: 'Scanner', icon: ScanLine },
  { key: 'history', label: 'Histórico', icon: ClipboardList },
  { key: 'admin-list', label: 'Admin', icon: Shield },
] as const

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

type HistoryEntry =
  | {
      kind: 'single'
      key: string
      transaction: TransactionHistory
      checkoutTs: number
    }
  | {
      kind: 'batch'
      key: string
      batchCode: string
      batchRootName: string
      transactions: TransactionHistory[]
      checkoutTs: number
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
  } catch {
    // Value is not a URL, keep original raw hash.
  }

  return value
}

function buildHistoryEntries(transactions: TransactionHistory[]): HistoryEntry[] {
  const batchMap = new Map<string, TransactionHistory[]>()
  const singles: HistoryEntry[] = []

  for (const transaction of transactions) {
    const checkoutTs = transaction.checkout_time ? new Date(transaction.checkout_time).getTime() : 0
    if (!transaction.batch_code) {
      singles.push({
        kind: 'single',
        key: `single-${transaction.id}`,
        transaction,
        checkoutTs,
      })
      continue
    }

    const list = batchMap.get(transaction.batch_code) || []
    list.push(transaction)
    batchMap.set(transaction.batch_code, list)
  }

  const batches: HistoryEntry[] = Array.from(batchMap.entries()).map(([batchCode, batchTransactions]) => {
    const orderedTransactions = [...batchTransactions].sort((a, b) => a.item_name.localeCompare(b.item_name))
    const first = orderedTransactions[0]
    const checkoutTs = first?.checkout_time ? new Date(first.checkout_time).getTime() : 0
    return {
      kind: 'batch',
      key: `batch-${batchCode}`,
      batchCode,
      batchRootName: first?.batch_root_item_name || first?.item_name || 'Maleta',
      transactions: orderedTransactions,
      checkoutTs,
    }
  })

  return [...singles, ...batches].sort((a, b) => b.checkoutTs - a.checkoutTs)
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
    checkoutContainer,
    checkinContainer,
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
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<number>>(new Set())
  // Scanner checkout fields
  const [checkoutDestino, setCheckoutDestino] = useState('')
  const [checkoutObs, setCheckoutObs] = useState('')
  // Scanner checkin field
  const [checkinObs, setCheckinObs] = useState('')
  const [checkoutMode, setCheckoutMode] = useState<'full_available' | 'single_child'>('full_available')
  const [selectedChildId, setSelectedChildId] = useState<number>(0)
  const [checkinMode, setCheckinMode] = useState<'all_lent' | 'single_lent'>('all_lent')
  const [selectedLentItemId, setSelectedLentItemId] = useState<number>(0)
  const [selectedLentEmployeeId, setSelectedLentEmployeeId] = useState<number>(0)
  const [containerAction, setContainerAction] = useState<'checkout' | 'checkin'>('checkout')
  const [batchSummary, setBatchSummary] = useState<BatchOperationResult | null>(null)
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

  const handleScan = useCallback((qrHash: string) => {
    const normalized = normalizeScannedValue(qrHash)
    if (!normalized) return
    scanItem(normalized)
  }, [scanItem])

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
    setBatchSummary(null)
    setSelectedEmployee(0)
    setCheckoutDestino('')
    setCheckoutObs('')
    setCheckinObs('')
    setCheckoutMode('full_available')
    setSelectedChildId(0)
    setCheckinMode('all_lent')
    setSelectedLentItemId(0)
    setSelectedLentEmployeeId(0)
    setContainerAction('checkout')
  }

  useEffect(() => {
    if (!currentItem) return

    const firstAvailableChild = currentItem.family_children.find((child) => child.status === 'available')
    const firstLentItem = currentItem.family_lent_items[0]
    const hasCheckoutCandidates = currentItem.item.status === 'available' || Boolean(firstAvailableChild)
    const lentEmployeeIds = Array.from(
      new Set(
        currentItem.family_lent_items
          .map((item) => item.current_transaction?.employee?.id)
          .filter((employeeId): employeeId is number => Boolean(employeeId)),
      ),
    )

    setBatchSummary(null)
    setCheckoutMode('full_available')
    setSelectedChildId(firstAvailableChild?.id || 0)
    setCheckinMode('all_lent')
    setSelectedLentItemId(firstLentItem?.id || 0)
    setSelectedLentEmployeeId(lentEmployeeIds.length === 1 ? lentEmployeeIds[0] : 0)
    setContainerAction(hasCheckoutCandidates ? 'checkout' : 'checkin')
  }, [currentItem])

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

  const historyEntries = useMemo(() => buildHistoryEntries(transactions), [transactions])

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

  useEffect(() => {
    const validNodeIds = new Set<number>()
    const collectIds = (nodes: ItemTreeNode[]) => {
      for (const node of nodes) {
        validNodeIds.add(node.id)
        if (node.children.length > 0) {
          collectIds(node.children)
        }
      }
    }

    collectIds(adminTree)

    setExpandedTreeNodes((previous) => {
      const next = new Set<number>()
      for (const nodeId of previous) {
        if (validNodeIds.has(nodeId)) {
          next.add(nodeId)
        }
      }

      if (previous.size === 0) {
        for (const rootNode of adminTree) {
          if (rootNode.children.length > 0) {
            next.add(rootNode.id)
          }
        }
      }

      return next
    })
  }, [adminTree])

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

  const toggleTreeNode = (id: number) => {
    setExpandedTreeNodes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
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
  }, [handleScan])

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
    const describeSkipReason = (reason?: string) => {
      if (!reason) return 'Ignorado'
      if (reason === 'item_indisponivel') return 'Item indisponível'
      if (reason === 'transacao_ativa') return 'Já possui empréstimo ativo'
      if (reason === 'sem_emprestimo_ativo') return 'Sem empréstimo ativo'
      if (reason === 'emprestado_por_outro_funcionario') return 'Emprestado por outro funcionário'
      return reason
    }

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
          {batchSummary && (
            <div className="action-card batch-summary-card">
              <p className="info-text">
                <strong>{batchSummary.message}</strong>
              </p>
              <p className="info-text">
                Processados: <strong>{batchSummary.processed_count}</strong> • Ignorados: <strong>{batchSummary.skipped_count}</strong>
              </p>
            </div>
          )}
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

    const isContainerScan = currentItem.is_container_scan
    const availableChildren = currentItem.family_children.filter((child) => child.status === 'available')
    const lentFamilyItems = currentItem.family_lent_items
    const skippedBatchItems = batchSummary?.skipped_items ?? []
    const lentEmployees = Array.from(
      lentFamilyItems.reduce((acc, item) => {
        const employee = item.current_transaction?.employee
        if (employee) {
          acc.set(employee.id, employee.name)
        }
        return acc
      }, new Map<number, string>()),
    ).map(([id, name]) => ({ id, name }))

    const hasContainerLentItems = isContainerScan && lentFamilyItems.length > 0
    const canContainerCheckout = isContainerScan && (currentItem.item.status === 'available' || availableChildren.length > 0)
    const canContainerCheckin = isContainerScan && hasContainerLentItems
    const effectiveContainerAction = containerAction === 'checkout' && !canContainerCheckout
      ? 'checkin'
      : containerAction === 'checkin' && !canContainerCheckin
        ? 'checkout'
        : containerAction
    const shouldRenderCheckout = isContainerScan
      ? effectiveContainerAction === 'checkout'
      : currentItem.item.status === 'available'

    return (
      <section className="scan-result">
        <div className="scan-item-card">
          <div className="scan-icon">
            <Package size={24} />
          </div>
          <h2>{currentItem.item.name}</h2>
          <p>{currentItem.item.category} • {statusLabelMap[currentItem.item.status]}</p>
        </div>

        {isContainerScan && (
          <div className="action-card">
            <div className="form-field">
              <label htmlFor="container-action-select">Ação</label>
              <select
                id="container-action-select"
                value={effectiveContainerAction}
                onChange={(e) => setContainerAction(e.target.value as 'checkout' | 'checkin')}
              >
                <option value="checkout" disabled={!canContainerCheckout}>Emprestar</option>
                <option value="checkin" disabled={!canContainerCheckin}>Devolver</option>
              </select>
            </div>
            {!canContainerCheckout && (
              <p className="mode-warning">
                Nenhum item disponível para nova retirada nesta maleta.
              </p>
            )}
            {canContainerCheckout && hasContainerLentItems && (
              <p className="info-text">
                Já existem itens emprestados nesta maleta. No modo "maleta inteira", os itens já emprestados serão ignorados.
              </p>
            )}
          </div>
        )}

        {shouldRenderCheckout ? (
          <div className="action-card">
            {isContainerScan && (
              <div className="scan-mode-card">
                <p className="info-text">
                  Esta maleta possui <strong>{currentItem.family_children.length}</strong> subitens.
                </p>
                <div className="scan-mode-grid">
                  <button
                    type="button"
                    className={`btn ${checkoutMode === 'full_available' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCheckoutMode('full_available')}
                  >
                    Emprestar maleta inteira
                  </button>
                  <button
                    type="button"
                    className={`btn ${checkoutMode === 'single_child' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCheckoutMode('single_child')}
                  >
                    Emprestar só um item
                  </button>
                </div>

                {checkoutMode === 'single_child' && (
                  <div className="form-field">
                    <label htmlFor="single-child-select">Subitem disponível</label>
                    <select
                      id="single-child-select"
                      value={selectedChildId}
                      onChange={(e) => setSelectedChildId(Number(e.target.value))}
                    >
                      <option value={0}>Selecione um subitem</option>
                      {availableChildren.map((child) => (
                        <option key={child.id} value={child.id}>{child.name}</option>
                      ))}
                    </select>
                    {availableChildren.length === 0 && (
                      <p className="mode-warning">Nenhum subitem disponível para retirada individual.</p>
                    )}
                  </div>
                )}
              </div>
            )}

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
              disabled={
                selectedEmployee === 0
                || (isContainerScan && checkoutMode === 'single_child' && selectedChildId === 0)
                || (isContainerScan && checkoutMode === 'single_child' && availableChildren.length === 0)
              }
              onClick={async () => {
                if (isContainerScan) {
                  const result = await checkoutContainer(
                    currentItem.family_container_id,
                    selectedEmployee,
                    checkoutMode,
                    {
                      targetChildId: checkoutMode === 'single_child' ? selectedChildId : undefined,
                      destino: checkoutDestino.trim() || undefined,
                      observacao: checkoutObs.trim() || undefined,
                    },
                  )

                  if (result) {
                    setBatchSummary(result)
                  }
                } else {
                  await checkout(currentItem.item.id, selectedEmployee, {
                    destino: checkoutDestino.trim() || undefined,
                    observacao: checkoutObs.trim() || undefined,
                  })
                }

                setSelectedEmployee(0)
                setCheckoutDestino('')
                setCheckoutObs('')
              }}
            >
              <LogOut size={16} /> {isContainerScan ? 'Confirmar retirada da maleta' : 'Confirmar retirada'}
            </button>

            {isContainerScan && skippedBatchItems.length > 0 && (
              <div className="mode-info-box">
                <p className="mode-info-title">Itens ignorados na última operação</p>
                {skippedBatchItems.map((item) => (
                  <p className="mode-info-line" key={`skip-${item.id}`}>
                    {item.name}: {describeSkipReason(item.reason)}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="action-card">
            {isContainerScan ? (
              <div className="scan-mode-card">
                <p className="info-text">
                  Itens emprestados nesta maleta: <strong>{lentFamilyItems.length}</strong>
                </p>

                <div className="scan-mode-grid">
                  <button
                    type="button"
                    className={`btn ${checkinMode === 'all_lent' ? 'btn-success' : 'btn-ghost'}`}
                    onClick={() => setCheckinMode('all_lent')}
                  >
                    Devolver tudo emprestado
                  </button>
                  <button
                    type="button"
                    className={`btn ${checkinMode === 'single_lent' ? 'btn-success' : 'btn-ghost'}`}
                    onClick={() => setCheckinMode('single_lent')}
                  >
                    Devolver item específico
                  </button>
                </div>

                {checkinMode === 'single_lent' && (
                  <div className="form-field">
                    <label htmlFor="single-lent-select">Item emprestado</label>
                    <select
                      id="single-lent-select"
                      value={selectedLentItemId}
                      onChange={(e) => setSelectedLentItemId(Number(e.target.value))}
                    >
                      <option value={0}>Selecione um item</option>
                      {lentFamilyItems.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {checkinMode === 'all_lent' && lentEmployees.length > 1 && (
                  <div className="form-field">
                    <label htmlFor="lent-employee-select">Devolver itens de qual funcionário</label>
                    <select
                      id="lent-employee-select"
                      value={selectedLentEmployeeId}
                      onChange={(e) => setSelectedLentEmployeeId(Number(e.target.value))}
                    >
                      <option value={0}>Selecione um funcionário</option>
                      {lentEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <p className="info-text">
                Retirado por: <strong>{currentItem.current_transaction?.employee?.name || 'Sem registro'}</strong>
              </p>
            )}

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
              disabled={
                (isContainerScan && !canContainerCheckin)
                || (isContainerScan && checkinMode === 'all_lent' && lentEmployees.length > 1 && selectedLentEmployeeId === 0)
                || (isContainerScan && checkinMode === 'single_lent' && selectedLentItemId === 0)
              }
              onClick={async () => {
                if (isContainerScan) {
                  const result = await checkinContainer(currentItem.family_container_id, checkinMode, {
                    targetItemId: checkinMode === 'single_lent' ? selectedLentItemId : undefined,
                    employeeId: checkinMode === 'all_lent' ? (selectedLentEmployeeId || undefined) : undefined,
                    observacao: checkinObs.trim() || undefined,
                  })
                  if (result) {
                    setBatchSummary(result)
                  }
                } else {
                  await checkin(currentItem.item.id, {
                    observacao: checkinObs.trim() || undefined,
                  })
                }

                setCheckinObs('')
              }}
            >
              <CheckCircle2 size={16} /> {isContainerScan ? 'Confirmar devolução da maleta' : 'Confirmar devolução'}
            </button>

            {isContainerScan && skippedBatchItems.length > 0 && (
              <div className="mode-info-box">
                <p className="mode-info-title">Itens não devolvidos na última operação</p>
                {skippedBatchItems.map((item) => (
                  <p className="mode-info-line" key={`checkin-skip-${item.id}`}>
                    {item.name}: {describeSkipReason(item.reason)}
                  </p>
                ))}
              </div>
            )}
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

      {historyEntries.length === 0 ? (
        <div className="empty-state">Nenhuma movimentação registrada.</div>
      ) : (
        <div className="history-list">
          {historyEntries.map((entry) => {
            if (entry.kind === 'single') {
              const t = entry.transaction
              const isOpen = t.checkin_time === null
              return (
                <div className={`history-card ${isOpen ? 'history-open' : 'history-closed'}`} key={entry.key}>
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
            }

            const openCount = entry.transactions.filter((t) => t.checkin_time === null).length
            const closedCount = entry.transactions.length - openCount
            const isOpen = openCount > 0
            const first = entry.transactions[0]
            const latestCheckinTime = entry.transactions
              .map((t) => t.checkin_time)
              .filter((value): value is string => Boolean(value))
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null

            return (
              <div className={`history-card ${isOpen ? 'history-open' : 'history-closed'}`} key={entry.key}>
                <div className="history-header">
                  <div className="history-item-info">
                    <span className="history-item-name">{entry.batchRootName}</span>
                    <span className="history-item-cat">Lote ({entry.transactions.length})</span>
                  </div>
                  <span className={`badge ${isOpen ? 'badge-lent' : 'badge-available'}`}>
                    {isOpen ? `Em uso (${openCount})` : 'Devolvido'}
                  </span>
                </div>

                <div className="history-body">
                  <div className="history-row">
                    <ArrowUpRight size={14} className="history-icon-out" />
                    <div className="history-row-content">
                      <span className="history-row-label">Retirada</span>
                      <span className="history-row-value">{formatDate(first.checkout_time)}</span>
                      <span className="history-row-detail">
                        <User size={12} /> {first.employee_name}
                      </span>
                      {first.destino && (
                        <span className="history-row-detail">
                          <MapPin size={12} /> {first.destino}
                        </span>
                      )}
                      {first.observacao && (
                        <span className="history-row-obs">{first.observacao}</span>
                      )}
                    </div>
                  </div>

                  {latestCheckinTime && (
                    <div className="history-row">
                      <ArrowDownLeft size={14} className="history-icon-in" />
                      <div className="history-row-content">
                        <span className="history-row-label">Devolução</span>
                        <span className="history-row-value">{formatDate(latestCheckinTime)}</span>
                        <span className="history-row-detail">{closedCount}/{entry.transactions.length} itens devolvidos</span>
                      </div>
                    </div>
                  )}

                  <details className="history-batch-details">
                    <summary>
                      <span>Ver itens do lote</span>
                      <ChevronDown size={14} />
                    </summary>
                    <div className="history-batch-items">
                      {entry.transactions.map((t) => {
                        const itemIsOpen = t.checkin_time === null
                        return (
                          <div className="history-batch-item" key={t.id}>
                            <span className="history-batch-item-name">{t.item_name}</span>
                            <span className={`badge ${itemIsOpen ? 'badge-lent' : 'badge-available'}`}>
                              {itemIsOpen ? 'Em uso' : 'Devolvido'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </details>
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

    const renderAdminTabs = () => (
      <div className="admin-subnav" role="tablist" aria-label="Menu do admin">
        <button
          type="button"
          className={`admin-subnav-btn ${activeTab === 'admin-list' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin-list')}
        >
          Inventário
        </button>
        <button
          type="button"
          className={`admin-subnav-btn ${activeTab === 'admin-create' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin-create')}
        >
          Novo Item
        </button>
        <button
          type="button"
          className={`admin-subnav-btn ${activeTab === 'admin-employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin-employees')}
        >
          Equipe
        </button>
      </div>
    )

    const createHashValue = createItemForm.qr_code_hash.trim() || 'SEM-CODIGO'
    const createPreviewValue = buildItemDeepLink(createHashValue)
    const editHashValue = editItemForm.qr_code_hash.trim() || 'SEM-CODIGO'
    const editPreviewValue = buildItemDeepLink(editHashValue)

    const renderTreeNodes = (nodes: ItemTreeNode[], depth = 0) =>
      nodes.map((node) => (
        <li key={node.id}>
          <div className="tree-node" style={{ paddingLeft: `${depth * 20 + 16}px` }}>
            {node.children.length > 0 ? (
              <button
                type="button"
                className="tree-node-toggle"
                onClick={() => toggleTreeNode(node.id)}
                aria-label={expandedTreeNodes.has(node.id) ? 'Recolher subitens' : 'Expandir subitens'}
              >
                <ChevronDown size={14} className={`tree-node-chevron ${expandedTreeNodes.has(node.id) ? 'open' : ''}`} />
              </button>
            ) : (
              <span className="tree-node-spacer" aria-hidden="true" />
            )}
            <span className="tree-name">{node.name}</span>
            <span className="tree-meta">{node.category}</span>
            <span className={`badge badge-${node.status}`}>{statusLabelMap[node.status]}</span>
          </div>
          {node.children.length > 0 && expandedTreeNodes.has(node.id) && (
            <ul className="tree-list tree-children">{renderTreeNodes(node.children, depth + 1)}</ul>
          )}
        </li>
      ))

    if (activeTab === 'admin-create') {
      return (
        <section className="admin-section">
          {renderAdminTabs()}
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
        </section>
      )
    }

    if (activeTab === 'admin-employees') {
      return (
        <section className="admin-section">
          {renderAdminTabs()}
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
        {renderAdminTabs()}
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

      <BottomNav
        tabs={tabs}
        activeTab={activeTab}
        isAuthenticated={isAuthenticated}
        onNavigate={navigate}
      />
    </div>
  )
}

export default App
