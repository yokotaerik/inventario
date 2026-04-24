import { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useStockStore, type StockItem } from '../store/useStockStore'
import StockForm from './StockForm'

interface StockDrawerProps {
  item: StockItem | null
  onClose: () => void
}

export default function StockDrawer({ item, onClose }: StockDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const { deleteStockItem } = useStockStore()

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (item) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [item, onClose])

  const handleDelete = async () => {
    if (!item) return
    if (confirm('Tem certeza que deseja excluir este item de estoque?')) {
      await deleteStockItem(item.id)
      onClose()
    }
  }

  return (
    <>
      {item && <div className="drawer-overlay" onClick={onClose} />}
      <div
        className={`drawer ${item ? 'open' : ''}`}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!item}
      >
        <div className="drawer-header">
          <h2>{item?.name}</h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="drawer-content">
          {item && (
            <>
              <div className="drawer-info">
                <div className="info-row">
                  <span className="info-label">Código:</span>
                  <code>{item.product_code || '—'}</code>
                </div>
                <div className="info-row">
                  <span className="info-label">Categoria:</span>
                  <span>{item.category}</span>
                </div>
                {item.project_name && (
                  <div className="info-row">
                    <span className="info-label">Projeto:</span>
                    <span>{item.project_name} ({item.project_code})</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">QR Code:</span>
                  <code>{item.product_code || item.qr_code_hash || '—'}</code>
                </div>
                {item.purchase_code && (
                  <div className="info-row">
                    <span className="info-label">Cód. Compra:</span>
                    <code>{item.purchase_code}</code>
                  </div>
                )}
              </div>

              <div className="drawer-divider" />

              <h3 style={{ marginBottom: '12px' }}>Editar</h3>
              <StockForm
                mode="edit"
                item={item}
                onSuccess={onClose}
                onCancel={onClose}
              />

              <div className="drawer-divider" />

              <button type="button" className="btn btn-danger btn-block" onClick={handleDelete}>
                Excluir item de estoque
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
