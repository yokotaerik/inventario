import { useState } from 'react'
import { Package, Boxes, Plus } from 'lucide-react'
import ItemsTable from '../inventory/components/ItemsTable'
import ItemForm from '../inventory/components/ItemForm'
import StockTable from '../stock/components/StockTable'
import StockForm from '../stock/components/StockForm'
import { useItemTree } from '../inventory/hooks/useItemTree'

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'items' | 'stock'>('items')
  const [showItemForm, setShowItemForm] = useState(false)
  const [showStockForm, setShowStockForm] = useState(false)
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
      </div>

      {activeTab === 'items' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowItemForm(true)}>
              <Plus size={14} /> Novo Emprestável
            </button>
          </div>
          {showItemForm && (
            <div className="create-card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 600 }}>Novo Emprestável</h3>
              <p className="create-mode-help" style={{ marginBottom: 16 }}>
                Emprestável: equipamentos com status (disponível, emprestado e manutenção).
              </p>
              <ItemForm
                mode="create"
                parentOptions={parentOptions}
                onSuccess={() => setShowItemForm(false)}
                onCancel={() => setShowItemForm(false)}
              />
            </div>
          )}
          <ItemsTable />
        </>
      )}

      {activeTab === 'stock' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowStockForm(true)}>
              <Plus size={14} /> Novo Estoque
            </button>
          </div>
          {showStockForm && (
            <div className="create-card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 600 }}>Novo Item de Estoque</h3>
              <p className="create-mode-help" style={{ marginBottom: 16 }}>
                Estoque: materiais por quantidade alocados em projetos, sem fluxo de empréstimo.
              </p>
              <StockForm
                mode="create"
                onSuccess={() => setShowStockForm(false)}
                onCancel={() => setShowStockForm(false)}
              />
            </div>
          )}
          <StockTable />
        </>
      )}
    </section>
  )
}
