import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Package, RefreshCw, LogOut, X, Lock, Loader2 } from 'lucide-react'
import { ClipboardList, Shield, Building2 } from 'lucide-react'
import { create } from 'zustand'

import { usePullToRefresh } from './shared/hooks/usePullToRefresh'
import { useItemStore } from './inventory/store/useItemStore'
import { useEmployeeStore } from './workforce/store/useEmployeeStore'
import { useLoanStore } from './loans/store/useLoanStore'
import { useCustomerStore } from './customers/store/useCustomerStore'
import { useAuthStore } from './shared/store/useAuthStore'


import LoansPage from './pages/LoansPage'
import InventoryPage from './pages/InventoryPage'
import CustomersPage from './customers/components/CustomersPage'

import EmployeeGrid from './workforce/components/EmployeeGrid'
import BottomNav from './components/BottomNav'

import './App.css'

// ─── Tab routing ─────────────────────────────────────────────────────────────
type TabKey = 'loans' | 'inventory' | 'customers' | 'workforce' | 'status'

const tabs = [
  { key: 'loans', label: 'Empréstimos', icon: ClipboardList },
  { key: 'inventory', label: 'Inventário', icon: Package },
  { key: 'customers', label: 'Clientes', icon: Building2 },
  { key: 'workforce', label: 'Equipe', icon: Shield },
] as const

const pageTitleMap: Record<TabKey, string> = {
  status: 'Status Geral',
  loans: 'Empréstimos',
  inventory: 'Inventário',
  customers: 'Clientes',
  workforce: 'Equipe',
}

// ─── Tab state store ──────────────────────────────────────────────────────────
interface TabState {
  activeTab: TabKey
  navigate: (tab: TabKey) => void
}

const useTabStore = create<TabState>((set) => ({
  activeTab: 'loans',
  navigate: (tab) => set({ activeTab: tab }),
}))

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, user, adminLoading, authError, login, logout, hydrateUser } = useAuthStore()
  const { activeTab, navigate } = useTabStore()

  const { fetchStatusItems, clearError: clearItemError, error: itemError } = useItemStore()
  const { fetchEmployees } = useEmployeeStore()
  const { fetchTransactions, error: loanError, clearError: clearLoanError } = useLoanStore()

  const error = itemError || loanError
  const clearError = useCallback(() => {
    clearItemError()
    clearLoanError()
  }, [clearItemError, clearLoanError])

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const success = await login(loginForm.email.trim(), loginForm.password)
    if (success) setLoginForm({ email: '', password: '' })
  }

  // Initial load + hydrate user
  useEffect(() => {
    fetchStatusItems()
    fetchEmployees()
    hydrateUser()
    useCustomerStore.getState().fetchCustomers()
  }, [fetchStatusItems, fetchEmployees, hydrateUser])

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
    if (activeTab === 'loans') await fetchTransactions()
    if (activeTab === 'customers') await useCustomerStore.getState().fetchCustomers()
    if (isAuthenticated) {
      await useItemStore.getState().fetchAllItems()
      await useEmployeeStore.getState().fetchAllEmployees()
      await useCustomerStore.getState().fetchCustomers()
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

  const handleLogout = async () => {
    await logout()
    navigate('loans')
  }

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">
            <Shield size={26} />
          </div>
          <h2>Acesso Restrito</h2>
          <p>Faça login para continuar.</p>
          {authError && (
            <div className="alert" style={{ marginBottom: 16, textAlign: 'left' }}>
              <span>{authError}</span>
              <button type="button" className="alert-close" onClick={clearError}>
                <X size={14} />
              </button>
            </div>
          )}
          <form onSubmit={handleLoginSubmit} className="form-stack" style={{ marginTop: 16 }}>
            <div className="form-field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                placeholder="Digite seu e-mail"
                value={loginForm.email}
                onChange={(e) => setLoginForm((c) => ({ ...c, email: e.target.value }))}
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
      </div>
    )
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
            {user && (
              <>
                <span className="topbar-user">{user.name}</span>
                <button
                  type="button"
                  className="topbar-btn danger-btn"
                  title="Sair"
                  onClick={handleLogout}
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Error alert */}
        {error && (
          <div className="alert-bar">
            <div className="alert">
              <span>{error}</span>
              <button type="button" className="alert-close" onClick={clearError}>
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <div className="content">
          {activeTab === 'loans' && <LoansPage />}
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'customers' && <CustomersPage />}

          {activeTab === 'workforce' && <EmployeeGrid />}
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
