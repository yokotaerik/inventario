import { type FormEvent, useEffect, useState } from 'react'
import { Loader2, Plus, Pencil } from 'lucide-react'
import { useStockStore, type StockItem } from '../store/useStockStore'
import { useProjectStore } from '../../projects/store/useProjectStore'

interface StockFormProps {
  mode: 'create' | 'edit'
  item?: StockItem
  onSuccess?: () => void
  onCancel?: () => void
}

const defaultForm = {
  name: '',
  category: '',
  units: 1,
  product_code: null as string | null,
  project_id: null as number | null,
  purchase_code: '',
  purchase_info: '',
}

export default function StockForm({ mode, item, onSuccess, onCancel }: StockFormProps) {
  const { createStockItem, updateStockItem, loading } = useStockStore()
  const { projects, fetchProjects } = useProjectStore()

  const [form, setForm] = useState(
    mode === 'edit' && item
      ? {
          name: item.name,
          category: item.category,
          units: 1,
          product_code: item.product_code,
          project_id: item.project_id,
          purchase_code: item.purchase_code || '',
          purchase_info: item.purchase_info || '',
        }
      : defaultForm,
  )

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const activeProjects = projects.filter((p) => p.status === 'active')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    let success = false

    const basePayload = {
      name: form.name.trim(),
      category: form.category.trim(),
      project_id: form.project_id,
      purchase_code: form.purchase_code.trim() || null,
      purchase_info: form.purchase_info.trim() || null,
    }

    if (mode === 'create') {
      success = await createStockItem({
        ...basePayload,
        units: Math.max(1, form.units),
        quantity: 1,
        qr_code_hash: null,
        product_code: form.product_code,
      })
      if (success) setForm(defaultForm)
    } else if (item) {
      success = await updateStockItem(item.id, basePayload)
    }
    if (success) onSuccess?.()
  }

  return (
    <div>
      <form className="create-form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor={`${mode}-stock-name`}>Template / Modelo</label>
          <input
            id={`${mode}-stock-name`}
            type="text"
            placeholder="Ex.: Camera Balluff"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            required
          />
          <small className="form-help">Cada unidade criada terá código e QR próprios.</small>
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-stock-category`}>Categoria</label>
          <input
            id={`${mode}-stock-category`}
            type="text"
            placeholder="Ex.: Materiais"
            value={form.category}
            onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
            required
          />
        </div>
        {mode === 'create' && (
          <div className="form-field">
            <label htmlFor={`${mode}-stock-units`}>Unidades no lote</label>
            <input
              id={`${mode}-stock-units`}
              type="number"
              placeholder="1"
              min="1"
              max="100"
              value={form.units}
              onChange={(e) => setForm((c) => ({ ...c, units: Number(e.target.value) || 1 }))}
              required
            />
            <small className="form-help">
              Ex.: 2 para criar 2 unidades de Camera Balluff, cada uma com código próprio.
            </small>
          </div>
        )}
        <div className="form-field">
          <label htmlFor={`${mode}-stock-project`}>Projeto</label>
          <select
            id={`${mode}-stock-project`}
            value={form.project_id === null ? '' : String(form.project_id)}
            onChange={(e) =>
              setForm((c) => ({
                ...c,
                project_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
            required={mode === 'create'}
          >
            <option value="">Selecione um projeto</option>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-stock-product-code`}>Código do Produto</label>
          <input
            id={`${mode}-stock-product-code`}
            type="text"
            placeholder={mode === 'create' ? 'Gerado automaticamente ao salvar' : '—'}
            value={mode === 'edit' ? (form.product_code || '—') : (form.product_code || '')}
            readOnly
            disabled
          />
          <small className="form-help">Gerado automaticamente por unidade ao salvar.</small>
        </div>
        <div className="form-field full-width">
          <label htmlFor={`${mode}-stock-qr`}>Código QR</label>
          <input
            id={`${mode}-stock-qr`}
            type="text"
            placeholder="Será igual ao código do produto gerado"
            value={mode === 'edit' ? (item?.product_code || '—') : ''}
            readOnly
            disabled
          />
          <small className="form-help">QR sempre espelha o código do produto.</small>
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-stock-purchase-code`}>Cód. Compra</label>
          <input
            id={`${mode}-stock-purchase-code`}
            type="text"
            placeholder="Ex.: NF-12345"
            value={form.purchase_code}
            onChange={(e) => setForm((c) => ({ ...c, purchase_code: e.target.value }))}
          />
        </div>
        <div className="form-field full-width">
          <label htmlFor={`${mode}-stock-purchase-info`}>Info da Compra</label>
          <textarea
            id={`${mode}-stock-purchase-info`}
            className="form-textarea"
            placeholder="Detalhes da compra, fornecedor, data..."
            value={form.purchase_info}
            onChange={(e) => setForm((c) => ({ ...c, purchase_info: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="form-field full-width item-form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <Loader2 size={16} className="spin" />
            ) : mode === 'create' ? (
              <Plus size={16} />
            ) : (
              <Pencil size={14} />
            )}
            {mode === 'create' ? 'Criar item' : 'Salvar'}
          </button>
          {mode === 'edit' && onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
