import { useMemo } from 'react'
import { Package, FolderKanban, ShoppingCart, Tag } from 'lucide-react'
import Drawer from '../../shared/components/Drawer'
import ItemForm from './ItemForm'
import { useItemStore, type Item } from '../store/useItemStore'
import { useItemTree } from '../hooks/useItemTree'

const statusLabelMap = {
  available: 'Disponível',
  lent: 'Emprestado',
  maintenance: 'Manutenção',
} as const

interface ItemDrawerProps {
  item: Item | null
  onClose: () => void
}

export default function ItemDrawer({ item, onClose }: ItemDrawerProps) {
  const { allItems, deleteItem } = useItemStore()
  const { parentOptions } = useItemTree()

  const subItems = useMemo(
    () => allItems.filter((i) => i.parent_item_id === item?.id),
    [allItems, item],
  )

  const subItemSummary = useMemo(() => {
    if (subItems.length === 0) return null
    const available = subItems.filter((s) => s.status === 'available').length
    const lent = subItems.filter((s) => s.status === 'lent').length
    const maintenance = subItems.filter((s) => s.status === 'maintenance').length
    return { available, lent, maintenance }
  }, [subItems])

  const handleDelete = async () => {
    if (!item) return
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
    if (success) onClose()
  }

  return (
    <Drawer open={Boolean(item)} onClose={onClose} title={item?.name ?? ''} width="520px">
      {item && (
        <div className="item-drawer-content">
          {/* Header meta */}
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Categoria</span>
            <span className="drawer-meta-value">{item.category}</span>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">QR Hash</span>
            <code className="drawer-meta-code">{item.qr_code_hash}</code>
          </div>
          <div className="drawer-meta-row">
            <span className="drawer-meta-label">Status</span>
            <span className={`badge badge-${item.status}`}>{statusLabelMap[item.status]}</span>
          </div>
          {item.parent_item_name && (
            <div className="drawer-meta-row">
              <span className="drawer-meta-label">Item pai</span>
              <span className="drawer-meta-value">{item.parent_item_name}</span>
            </div>
          )}

          {/* Project info */}
          {item.project_name && (
            <>
              <hr className="drawer-divider" />
              <div className="drawer-section">
                <h3 className="drawer-section-title">
                  <FolderKanban size={15} /> Projeto
                </h3>
                <div className="drawer-meta-row">
                  <span className="drawer-meta-label">Projeto</span>
                  <span className="drawer-meta-value">
                    <Tag size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                    [{item.project_code}] {item.project_name}
                  </span>
                </div>
                {item.purchase_code && (
                  <div className="drawer-meta-row">
                    <span className="drawer-meta-label">Cód. Compra</span>
                    <code className="drawer-meta-code">{item.purchase_code}</code>
                  </div>
                )}
                {item.purchase_info && (
                  <div className="drawer-meta-row">
                    <span className="drawer-meta-label">Info Compra</span>
                    <span className="drawer-meta-value">
                      <ShoppingCart size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                      {item.purchase_info}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="drawer-divider" />

          {/* Edit form */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Editar</h3>
            <ItemForm
              mode="edit"
              item={item}
              parentOptions={parentOptions}
              onSuccess={onClose}
              onCancel={onClose}
            />
          </div>

          {/* Sub-items — improved */}
          {subItems.length > 0 && (
            <>
              <hr className="drawer-divider" />
              <div className="drawer-section">
                <h3 className="drawer-section-title">
                  <Package size={15} /> Sub-itens ({subItems.length})
                </h3>
                {subItemSummary && (
                  <div className="sub-item-summary">
                    {subItemSummary.available > 0 && (
                      <span className="badge badge-available">{subItemSummary.available} disponível</span>
                    )}
                    {subItemSummary.lent > 0 && (
                      <span className="badge badge-lent">{subItemSummary.lent} emprestado</span>
                    )}
                    {subItemSummary.maintenance > 0 && (
                      <span className="badge badge-maintenance">{subItemSummary.maintenance} manutenção</span>
                    )}
                  </div>
                )}
                <div className="drawer-sub-items">
                  {subItems.map((sub) => (
                    <div key={sub.id} className="drawer-sub-item drawer-sub-item-enhanced">
                      <div className="sub-item-main">
                        <div className="child-name">{sub.name}</div>
                        <div className="child-cat">{sub.category}</div>
                        {sub.project_name && (
                          <div className="child-project">
                            <FolderKanban size={11} /> {sub.project_name}
                          </div>
                        )}
                        <code className="child-qr">{sub.qr_code_hash}</code>
                      </div>
                      <span className={`badge badge-${sub.status}`}>
                        {statusLabelMap[sub.status]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Danger zone */}
          <hr className="drawer-divider" />
          <div className="drawer-section">
            <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>
              Excluir item
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
