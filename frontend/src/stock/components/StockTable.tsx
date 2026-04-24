import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, Search, RefreshCw, ChevronDown, FolderKanban } from 'lucide-react'
import { useStockStore, type StockItem } from '../store/useStockStore'
import { useProjectStore } from '../../projects/store/useProjectStore'
import StockDrawer from './StockDrawer'

const ITEMS_PER_PAGE = 12

const SortIcon = ({ field, sortField, sortDir }: { field: 'name' | 'category' | 'project'; sortField: 'name' | 'category' | 'project'; sortDir: 'asc' | 'desc' }) =>
  sortField === field ? (
    <ChevronDown
      size={14}
      style={{ transform: sortDir === 'desc' ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
    />
  ) : null

export default function StockTable() {
  const { stockItems, loading, fetchStockItems, deleteStockItem } = useStockStore()
  const { projects, fetchProjects } = useProjectStore()
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<'name' | 'category' | 'project'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchProjects()
    fetchStockItems()
  }, [fetchProjects, fetchStockItems])

  const syncedItem = useMemo(() => {
    if (!selectedItem) return null
    return stockItems.find((i) => i.id === selectedItem.id) || null
  }, [stockItems, selectedItem])

  const categories = useMemo(() => {
    const cats = new Set(stockItems.map((i) => i.category))
    return Array.from(cats).sort()
  }, [stockItems])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return stockItems
      .filter((item) => {
        if (filterCategory !== 'all' && item.category !== filterCategory) return false
        if (filterProject !== 'all') {
          if (filterProject === 'none' && item.project_id !== null) return false
          if (filterProject !== 'none' && String(item.project_id) !== filterProject) return false
        }
        if (!q) return true
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.product_code || '').toLowerCase().includes(q) ||
          (item.project_name || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        let cmp = 0
        if (sortField === 'name') cmp = a.name.localeCompare(b.name)
        else if (sortField === 'category') cmp = a.category.localeCompare(b.category)
        else if (sortField === 'project') cmp = (a.project_name || '').localeCompare(b.project_name || '')
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [stockItems, search, filterCategory, filterProject, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

  const handleSort = (field: 'name' | 'category' | 'project') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este item?')) {
      await deleteStockItem(id)
      setSelectedItem(null)
    }
  }

  return (
    <>
      <div className="search-filter-bar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon" />
          <input
            id="stock-search"
            type="text"
            placeholder="Buscar por nome, categoria ou código..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
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
          onClick={() => void fetchStockItems()}
          disabled={loading}
          title="Atualizar lista"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div className="table-count">
        {filtered.length} {filtered.length === 1 ? 'item' : 'itens'}
        {search || filterCategory !== 'all' || filterProject !== 'all' ? ' (filtrado)' : ''}
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th className="sortable" onClick={() => handleSort('name')}>
                  Nome <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                </th>
                <th className="sortable" onClick={() => handleSort('category')}>
                  Categoria <SortIcon field="category" sortField={sortField} sortDir={sortDir} />
                </th>
                <th className="sortable" onClick={() => handleSort('project')}>
                  Projeto <SortIcon field="project" sortField={sortField} sortDir={sortDir} />
                </th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((item) => (
                <tr key={item.id} className="table-row-clickable" onClick={() => setSelectedItem(item)}>
                  <td>
                    <code className="qr-cell">{item.product_code || '—'}</code>
                  </td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
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
                        title="Excluir"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !loading && (
          <div className="empty-state">Nenhum item de estoque encontrado.</div>
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

      <StockDrawer item={syncedItem} onClose={() => setSelectedItem(null)} />
    </>
  )
}
