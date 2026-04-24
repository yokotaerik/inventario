import { type FormEvent, useState } from 'react'
import { Shield, Lock, Loader2, Plus, Package, Users, FolderKanban } from 'lucide-react'
import ItemsTable from '../inventory/components/ItemsTable'
import ItemForm from '../inventory/components/ItemForm'
import EmployeeGrid from '../workforce/components/EmployeeGrid'
import ProjectsGrid from '../projects/components/ProjectsGrid'
import { useItemTree } from '../inventory/hooks/useItemTree'

type AdminTab = 'inventory' | 'new-item' | 'employees' | 'projects'

interface AdminPageProps {
  isAuthenticated: boolean
  adminLoading: boolean
  authError: string | null
  onLogin: (username: string, password: string) => Promise<boolean>
}

export default function AdminPage({
  isAuthenticated,
  adminLoading,
  authError,
  onLogin,
}: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('inventory')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const { parentOptions } = useItemTree()

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const success = await onLogin(loginForm.username.trim(), loginForm.password)
    if (success) setLoginForm({ username: '', password: '' })
  }

  if (!isAuthenticated) {
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
          <Plus size={15} /> Novo Item
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
          <h2>Novo Item</h2>
          <p>Cadastre um equipamento com código QR único.</p>
          <ItemForm
            mode="create"
            parentOptions={parentOptions}
            onSuccess={() => setActiveTab('inventory')}
          />
        </div>
      )}

      {activeTab === 'projects' && <ProjectsGrid />}

      {activeTab === 'employees' && <EmployeeGrid />}
    </section>
  )
}
