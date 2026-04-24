import { useState } from 'react'
import { Package, Boxes, Plus } from 'lucide-react'
import ItemsTable from '../inventory/components/ItemsTable'
import ItemForm from '../inventory/components/ItemForm'
import StockTable from '../stock/components/StockTable'
import StockForm from '../stock/components/StockForm'
import { useItemTree } from '../inventory/hooks/useItemTree'

type InventoryTab = 'items' | 'stock' | 'new'
type CreateMode = 'loanable' | 'stock'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('items')
  const [createMode, setCreateMode] = useState<CreateMode>('loanable')
  const { parentOptions } = useItemTree()

  return (
    <section className="admin-section">
      <div className="admin-subnav" role="tablist" aria-label="Menu do Inventário">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'items'}
          className={`admin-subnav-btn ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <Package size={15} /> Emprestáveis
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
          aria-selected={activeTab === 'new'}
          className={`admin-subnav-btn ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          <Plus size={15} /> Novo Cadastro
        </button>
      </div>

      {activeTab === 'items' && <ItemsTable />}

      {activeTab === 'stock' && <StockTable />}

      {activeTab === 'new' && (
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
              onSuccess={() => setActiveTab('items')}
            />
          ) : (
            <StockForm mode="create" onSuccess={() => setActiveTab('stock')} />
          )}
        </div>
      )}
    </section>
  )
}
