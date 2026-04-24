import { type FormEvent, useState } from 'react'
import { Shield, Lock, Loader2, Plus, Package, Users, FolderKanban, Boxes } from 'lucide-react'
import ItemsTable from '../inventory/components/ItemsTable'
import ItemForm from '../inventory/components/ItemForm'
import EmployeeGrid from '../workforce/components/EmployeeGrid'
import ProjectsGrid from '../projects/components/ProjectsGrid'
import StockTable from '../stock/components/StockTable'
import StockForm from '../stock/components/StockForm'
import { useItemTree } from '../inventory/hooks/useItemTree'

type AdminTab = 'inventory' | 'new-item' | 'employees' | 'projects' | 'stock'
type CreateMode = 'loanable' | 'stock'

interface User {
  id: number
  name: string
  email: string
  is_admin: boolean
}

interface AdminPageProps {
  isAuthenticated: boolean
  user: User | null
  adminLoading: boolean
  authError: string | null
  onLogin: (email: string, password: string) => Promise<boolean>
}

export default function AdminPage({
  isAuthenticated,
  user,
  adminLoading,
  authError,
  onLogin,
}: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('inventory')
  const [createMode, setCreateMode] = useState<CreateMode>('loanable')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const { parentOptions } = useItemTree()

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const success = await onLogin(loginForm.email.trim(), loginForm.password)
    if (success) setLoginForm({ email: '', password: '' })
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="login-card">
        <div className="login-icon">
          <Shield size={26} />
        </div>
        <h2>Área Administrativa</h2>
        <p>Faça login para gerenciar o inventário.</p>
        {authError && <div className="login-error">{authError}</div>}
        <form onSubmit={handleLogin} className="form-stack">
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
    )
  }

  if (!user.is_admin) {
    return (
      <div className="login-card">
        <div className="login-icon">
          <Shield size={26} />
        </div>
        <h2>Acesso Restrito</h2>
        <p>Área restrita — solicite acesso admin.</p>
      </div>
    )
  }

  return (
    <section className="admin-section">
      {/* Sub-navigation */}
      <div className="admin-subnav" role="tablist" aria-label="Menu do admin">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'inventory'}
          className={`admin-subnav-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Package size={15} /> Inventário
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'new-item'}
          className={`admin-subnav-btn ${activeTab === 'new-item' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-item')}
        >
          <Plus size={15} /> Novo Cadastro
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'projects'}
          className={`admin-subnav-btn ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          <FolderKanban size={15} /> Projetos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'stock'}
          className={`admin-subnav-btn ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          <Boxes size={15} /> Estoque
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'employees'}
          className={`admin-subnav-btn ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <Users size={15} /> Equipe
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'inventory' && <ItemsTable />}

      {activeTab === 'new-item' && (
        <div className="create-card">
          <h2>Novo Cadastro</h2>
          <p>Escolha o modo para cadastrar corretamente.</p>

          <div className="create-mode-switch" role="tablist" aria-label="Modo de cadastro">
            <button
              type="button"
              role="tab"
              aria-selected={createMode === 'loanable'}
              className={`create-mode-btn ${createMode === 'loanable' ? 'active' : ''}`}
              onClick={() => setCreateMode('loanable')}
            >
              <Package size={15} /> Modo Emprestável
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={createMode === 'stock'}
              className={`create-mode-btn ${createMode === 'stock' ? 'active' : ''}`}
              onClick={() => setCreateMode('stock')}
            >
              <Boxes size={15} /> Modo Estoque
            </button>
          </div>

          <p className="create-mode-help">
            {createMode === 'loanable'
              ? 'Emprestável: equipamentos com status (disponível, emprestado e manutenção).'
              : 'Estoque: materiais por quantidade, sem fluxo de empréstimo.'}
          </p>

          {createMode === 'loanable' ? (
            <ItemForm
              mode="create"
              parentOptions={parentOptions}
              onSuccess={() => setActiveTab('inventory')}
            />
          ) : (
            <StockForm mode="create" onSuccess={() => setActiveTab('stock')} />
          )}
        </div>
      )}

      {activeTab === 'projects' && <ProjectsGrid />}

      {activeTab === 'stock' && <StockTable />}

      {activeTab === 'employees' && <EmployeeGrid />}
    </section>
  )
}
