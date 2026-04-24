import { useEffect, useMemo, useState } from 'react'
import { Pencil, Download, Search, RefreshCw, ChevronDown, FolderKanban } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useItemStore, type Item } from '../store/useItemStore'
import { useItemTree } from '../hooks/useItemTree'
import { useProjectStore } from '../../projects/store/useProjectStore'
import { buildItemDeepLink } from '../../shared/utils/formatters'
import { downloadQrByCanvasId } from '../../shared/utils/qr'
import ItemDrawer from './ItemDrawer'

const statusLabelMap = {
  available: 'Disponível',
  lent: 'Emprestado',
  maintenance: 'Manutenção',
} as const

const ITEMS_PER_PAGE = 12

export default function ItemsTable() {
  const { allItems, adminLoading, fetchAllItems } = useItemStore()
  const { categories } = useItemTree()
  const { projects, fetchProjects } = useProjectStore()
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<'name' | 'category' | 'status' | 'project'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

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
        if (filterProject !== 'all') {
          if (filterProject === 'none' && item.project_id !== null) return false
          if (filterProject !== 'none' && String(item.project_id) !== filterProject) return false
        }
        if (!q) return true
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.qr_code_hash.toLowerCase().includes(q) ||
          (item.project_name || '').toLowerCase().includes(q) ||
          (item.purchase_code || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortField === 'name') cmp = a.name.localeCompare(b.name)
        else if (sortField === 'category') cmp = a.category.localeCompare(b.category)
        else if (sortField === 'status') cmp = a.status.localeCompare(b.status)
        else if (sortField === 'project') cmp = (a.project_name || '').localeCompare(b.project_name || '')
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [allItems, search, filterStatus, filterCategory, filterProject, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (
      <ChevronDown
        size={14}
        style={{ transform: sortDir === 'desc' ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
      />
    ) : null

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
        <select
          className="filter-select"
          value={filterProject}
          onChange={(e) => { setFilterProject(e.target.value); setPage(1) }}
          aria-label="Filtrar por projeto"
        >
          <option value="all">Todos projetos</option>
          <option value="none">Sem projeto</option>
          {projects.map((p) => (
            <option key={p.id} value={String(p.id)}>
              [{p.code}] {p.name}
            </option>
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
        {search || filterStatus !== 'all' || filterCategory !== 'all' || filterProject !== 'all' ? ' (filtrado)' : ''}
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Nome <SortIcon field="name" />
                </th>
                <th className="sortable" onClick={() => handleSort('category')}>
                  Categoria <SortIcon field="category" />
                </th>
                <th>QR</th>
                <th className="sortable" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </th>
                <th className="sortable" onClick={() => handleSort('project')}>
                  Projeto <SortIcon field="project" />
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((item) => (
                <tr key={item.id} className="table-row-clickable" onClick={() => setSelectedItem(item)}>
                  <td>
                    {item.parent_item_id ? (
                      <span className="row-child">↳ {item.name}</span>
                    ) : (
                      <span className="row-name">{item.name}</span>
                    )}
                    {item.parent_item_name && (
                      <div className="row-parent-label">{item.parent_item_name}</div>
                    )}
                  </td>
                  <td>{item.category}</td>
                  <td>
                    <code className="qr-cell">
                      {item.qr_code_hash.length > 10
                        ? item.qr_code_hash.slice(0, 10) + '…'
                        : item.qr_code_hash}
                    </code>
                  </td>
                  <td>
                    <span className={`badge badge-${item.status}`}>
                      {statusLabelMap[item.status]}
                    </span>
                  </td>
                  <td>
                    {item.project_name ? (
                      <span className="project-cell">
                        <FolderKanban size={12} />
                        <span>{item.project_name}</span>
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        title="Ver / Editar"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Download QR"
                        onClick={() =>
                          downloadQrByCanvasId(`item-qr-${item.id}`, item.qr_code_hash)
                        }
                      >
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
