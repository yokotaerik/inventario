import { useCallback, useEffect } from 'react'
import { Package, RefreshCw, LogOut, X } from 'lucide-react'
import { ScanLine, ClipboardList, Shield } from 'lucide-react'
import { create } from 'zustand'

import { api, getStoredToken, persistToken, getErrorMessage } from './shared/api/client'
import { usePullToRefresh } from './shared/hooks/usePullToRefresh'
import { useItemStore } from './inventory/store/useItemStore'
import { useEmployeeStore } from './workforce/store/useEmployeeStore'
import { useLoanStore } from './loans/store/useLoanStore'

import ScannerView from './loans/components/ScannerView'
import HistoryView from './loans/components/HistoryView'
import ItemStatusView from './inventory/components/ItemStatusView'
import AdminPage from './pages/AdminPage'
import BottomNav from './components/BottomNav'

import './App.css'

// ─── Auth store ───────────────────────────────────────────────────────────────
interface AuthState {
  isAuthenticated: boolean
  adminLoading: boolean
  authError: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: Boolean(getStoredToken()),
  adminLoading: false,
  authError: null,

  login: async (username, password) => {
    set({ adminLoading: true, authError: null })
    try {
      const res = await api.post<{ token: string }>('/auth/login', { username, password })
      const token = res.data.token
      persistToken(token)
      set({ isAuthenticated: true, adminLoading: false, authError: null })
      await useItemStore.getState().fetchAllItems()
      await useEmployeeStore.getState().fetchAllEmployees()
      return true
    } catch (err) {
      persistToken(null)
      set({
        adminLoading: false,
        isAuthenticated: false,
        authError: getErrorMessage('Login inválido', err),
      })
      return false
    }
  },

  logout: () => {
    persistToken(null)
    set({ isAuthenticated: false, authError: null })
    useItemStore.setState({ allItems: [] })
    useEmployeeStore.setState({ allEmployees: [] })
  },
}))

// ─── Tab routing ─────────────────────────────────────────────────────────────
type TabKey = 'status' | 'scanner' | 'history' | 'admin'

const tabs = [
  { key: 'scanner', label: 'Scanner', icon: ScanLine },
  { key: 'history', label: 'Histórico', icon: ClipboardList },
  { key: 'admin', label: 'Admin', icon: Shield },
] as const

const pageTitleMap: Record<TabKey, string> = {
  status: 'Status Geral',
  scanner: 'Scanner QR',
  history: 'Histórico',
  admin: 'Administração',
}

// ─── Tab state store ──────────────────────────────────────────────────────────
interface TabState {
  activeTab: TabKey
  navigate: (tab: TabKey) => void
}

const useTabStore = create<TabState>((set) => ({
  activeTab: 'scanner',
  navigate: (tab) => set({ activeTab: tab }),
}))

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, adminLoading, authError, login, logout } = useAuthStore()
  const { activeTab, navigate } = useTabStore()

  const { fetchStatusItems, clearError: clearItemError, error: itemError } = useItemStore()
  const { fetchEmployees } = useEmployeeStore()
  const { fetchTransactions, error: loanError, clearError: clearLoanError } = useLoanStore()

  const error = itemError || loanError
  const clearError = useCallback(() => {
    clearItemError()
    clearLoanError()
  }, [clearItemError, clearLoanError])

  // Initial load
  useEffect(() => {
    fetchStatusItems()
    fetchEmployees()
  }, [fetchStatusItems, fetchEmployees])

  // Admin data after auth
  useEffect(() => {
    if (isAuthenticated) {
      useItemStore.getState().fetchAllItems()
      useEmployeeStore.getState().fetchAllEmployees()
    }
  }, [isAuthenticated])

  const refreshData = useCallback(async () => {
    await fetchStatusItems()
    await fetchEmployees()
    if (activeTab === 'history') await fetchTransactions()
    if (isAuthenticated) {
      await useItemStore.getState().fetchAllItems()
      await useEmployeeStore.getState().fetchAllEmployees()
    }
  }, [fetchStatusItems, fetchEmployees, fetchTransactions, activeTab, isAuthenticated])

  const {
    pullDistance,
    isPulling,
    isRefreshing,
    pullIndicatorVisible,
    pullIndicatorOffset,
    isReady,
    handleTouchStart,
    handleTouchMove,
    releasePull,
    runRefresh,
  } = usePullToRefresh({ onRefresh: refreshData })

  const handleLogout = () => {
    logout()
    navigate('scanner')
  }

  return (
    <div
      className="app-shell"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={releasePull}
      onTouchCancel={releasePull}
    >
      {/* Pull indicator */}
      <div
        className={`pull-indicator ${pullIndicatorVisible ? 'visible' : ''} ${isReady ? 'ready' : ''}`}
        style={{ transform: `translate(-50%, ${pullIndicatorOffset}px)` }}
      >
        <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
        <span>
          {isRefreshing
            ? 'Atualizando...'
            : isReady
              ? 'Solte para atualizar'
              : 'Puxe para atualizar'}
        </span>
      </div>

      <div
        className={`pull-layer ${isPulling ? 'pulling' : ''}`}
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-title">
            <Package size={20} />
            <span>{pageTitleMap[activeTab]}</span>
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
              <button
                type="button"
                className="topbar-btn danger-btn"
                title="Sair"
                onClick={handleLogout}
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        {/* Error alert */}
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

        {/* Page content */}
        <div className="content">
          {activeTab === 'status' && <ItemStatusView />}
          {activeTab === 'scanner' && <ScannerView />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'admin' && (
            <AdminPage
              isAuthenticated={isAuthenticated}
              adminLoading={adminLoading}
              authError={authError}
              onLogin={login}
            />
          )}
        </div>
      </div>

      {/* Navigation — bottom on mobile, sidebar on desktop */}
      <BottomNav
        tabs={tabs}
        activeTab={activeTab}
        isAuthenticated={isAuthenticated}
        onNavigate={(tab) => navigate(tab as TabKey)}
      />
    </div>
  )
}
