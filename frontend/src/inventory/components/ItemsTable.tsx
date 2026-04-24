import React, { useMemo, useState } from 'react'
import { Pencil, Download, Search, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useItemStore, type Item } from '../store/useItemStore'
import { useItemTree } from '../hooks/useItemTree'
import { buildItemDeepLink } from '../../shared/utils/formatters'
import { downloadQrByCanvasId } from '../../shared/utils/qr'
import ItemDrawer from './ItemDrawer'

const statusLabelMap = {
  available: 'Disponível',
  lent: 'Emprestado',
  maintenance: 'Manutenção',
} as const

const ITEMS_PER_PAGE = 12

const SortIcon = ({ field, sortField, sortDir }: { field: 'name' | 'category' | 'status'; sortField: 'name' | 'category' | 'status'; sortDir: 'asc' | 'desc' }) =>
  sortField === field ? (
    <ChevronDown
      size={14}
      style={{ transform: sortDir === 'desc' ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
    />
  ) : null

export default function ItemsTable() {
  const { allItems, adminLoading, fetchAllItems } = useItemStore()
  const { categories } = useItemTree()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<'name' | 'category' | 'status'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Keep selected item in sync with updated data
  const syncedItem = useMemo(() => {
    if (!selectedItem) return null
    return allItems.find((i) => i.id === selectedItem.id) || null
  }, [allItems, selectedItem])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allItems
      .filter((item) => {
        if (filterStatus !== 'all' && item.status !== filterStatus) return false
        if (filterCategory !== 'all' && item.category !== filterCategory) return false
        if (!q) return true
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.qr_code_hash.toLowerCase().includes(q) ||
          (item.purchase_code || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortField === 'name') cmp = a.name.localeCompare(b.name)
        else if (sortField === 'category') cmp = a.category.localeCompare(b.category)
        else if (sortField === 'status') cmp = a.status.localeCompare(b.status)
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [allItems, search, filterStatus, filterCategory, sortField, sortDir])

  const rootItems = useMemo(() => {
    return filtered.filter(
      (i) => i.parent_item_id === null || !filtered.some((f) => f.id === i.parent_item_id)
    )
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(rootItems.length / ITEMS_PER_PAGE))
  const paginatedRoots = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return rootItems.slice(start, start + ITEMS_PER_PAGE)
  }, [rootItems, page])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  return (
    <>
      {/* Search & filter bar */}
      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            id="items-search"
            type="text"
            placeholder="Buscar por nome, categoria, QR ou projeto..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos status</option>
          <option value="available">Disponível</option>
          <option value="lent">Emprestado</option>
          <option value="maintenance">Manutenção</option>
        </select>
        <select
          className="filter-select"
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
          aria-label="Filtrar por categoria"
        >
          <option value="all">Todas categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void fetchAllItems()}
          disabled={adminLoading}
          title="Atualizar lista"
        >
          <RefreshCw size={14} className={adminLoading ? 'spin' : ''} />
        </button>
      </div>

      <div className="table-count">
        {filtered.length} {filtered.length === 1 ? 'item' : 'itens'}
        {search || filterStatus !== 'all' || filterCategory !== 'all' ? ' (filtrado)' : ''}
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Nome <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                </th>
                <th className="sortable" onClick={() => handleSort('category')}>
                  Categoria <SortIcon field="category" sortField={sortField} sortDir={sortDir} />
                </th>
                <th>Código</th>
                <th>QR</th>
                <th className="sortable" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRoots.map((item) => {
                const isExpanded = expandedItems.has(item.id)
                const children = allItems.filter((child) => child.parent_item_id === item.id)

                const renderRow = (rowItem: Item, isChild = false) => (
                  <tr
                    key={rowItem.id}
                    className={`table-row-clickable ${isChild ? 'child-row' : ''}`}
                    onClick={() => setSelectedItem(rowItem)}
                    style={isChild ? { backgroundColor: 'var(--bg-card-hover)', opacity: 0.95 } : {}}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: isChild ? 24 : 0 }}>
                        {!isChild && rowItem.has_sub_items && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={(e) => toggleExpand(rowItem.id, e)}
                            style={{ padding: 2, marginRight: 4 }}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        )}
                        {!isChild && !rowItem.has_sub_items && <span style={{ width: 22, display: 'inline-block' }} />}
                        
                        {isChild && <span className="row-child" style={{ color: 'var(--text-muted)' }}>↳</span>}
                        <span className="row-name">{rowItem.name}</span>
                      </div>
                      {!isChild && rowItem.parent_item_name && (
                        <div className="row-parent-label" style={{ marginLeft: 28 }}>
                          (Em {rowItem.parent_item_name})
                        </div>
                      )}
                    </td>
                    <td>{rowItem.category}</td>
                    <td>
                      <code className="qr-cell">
                        {rowItem.product_code || '—'}
                      </code>
                    </td>
                    <td>
                      <code className="qr-cell">
                        {rowItem.qr_code_hash.length > 10
                          ? rowItem.qr_code_hash.slice(0, 10) + '…'
                          : rowItem.qr_code_hash}
                      </code>
                    </td>
                    <td>
                      <span className={`badge badge-${rowItem.status}`}>
                        {statusLabelMap[rowItem.status]}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Ver / Editar"
                          onClick={() => setSelectedItem(rowItem)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Download QR"
                          onClick={() =>
                            downloadQrByCanvasId(`item-qr-${rowItem.id}`, rowItem.qr_code_hash)
                          }
                        >
                          <Download size={14} />
                        </button>
                        <QRCodeCanvas
                          id={`item-qr-${rowItem.id}`}
                          value={buildItemDeepLink(rowItem.qr_code_hash)}
                          size={56}
                          includeMargin
                          level="H"
                          className="row-hidden-qr"
                        />
                      </div>
                    </td>
                  </tr>
                )

                return (
                  <React.Fragment key={item.id}>
                    {renderRow(item, false)}
                    {isExpanded && children.map((child) => renderRow(child, true))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !adminLoading && (
          <div className="empty-state">Nenhum item encontrado.</div>
        )}

        {totalPages > 1 && (
          <div className="table-pagination">
            <span>Página {page} de {totalPages}</span>
            <div className="table-pagination-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      <ItemDrawer item={syncedItem} onClose={() => setSelectedItem(null)} />
    </>
  )
}
