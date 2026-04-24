import { type FormEvent, useState } from 'react'
import { Loader2, Plus, Pencil, Sparkles, Download } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useItemStore, type Item, type ItemStatus } from '../store/useItemStore'
import { generateRandomCode, downloadQrByCanvasId } from '../../shared/utils/qr'
import { buildItemDeepLink } from '../../shared/utils/formatters'

interface ItemFormProps {
  mode: 'create' | 'edit'
  item?: Item
  parentOptions: Item[]
  onSuccess?: () => void
  onCancel?: () => void
}

const defaultForm = {
  name: '',
  category: '',
  qr_code_hash: '',
  status: 'available' as ItemStatus,
  parent_item_id: null as number | null,
  product_code: null as string | null,
  purchase_code: '',
  purchase_info: '',
}

export default function ItemForm({ mode, item, parentOptions, onSuccess, onCancel }: ItemFormProps) {
  const { createItem, updateItem, adminLoading } = useItemStore()

  const [form, setForm] = useState(
    mode === 'edit' && item
      ? {
          name: item.name,
          category: item.category,
          qr_code_hash: item.qr_code_hash,
          status: item.status,
          parent_item_id: item.parent_item_id,
          product_code: item.product_code,
          purchase_code: item.purchase_code || '',
          purchase_info: item.purchase_info || '',
        }
      : defaultForm,
  )

  const hashValue = form.qr_code_hash.trim() || 'SEM-CODIGO'
  const previewValue = buildItemDeepLink(hashValue)
  const qrCanvasId = mode === 'create' ? 'item-form-qr-create' : `item-form-qr-${item?.id}`

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    let success = false
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      qr_code_hash: form.qr_code_hash.trim(),
      status: form.status,
      parent_item_id: form.parent_item_id,
      product_code: form.product_code,
      purchase_code: form.purchase_code.trim() || null,
      purchase_info: form.purchase_info.trim() || null,
    }
    if (mode === 'create') {
      success = await createItem(payload)
      if (success) setForm(defaultForm)
    } else if (item) {
      success = await updateItem(item.id, payload)
    }
    if (success) onSuccess?.()
  }

  const validParentOptions =
    mode === 'edit' && item
      ? parentOptions.filter((p) => p.id !== item.id)
      : parentOptions

  return (
    <div>
      <form className="create-form-grid" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor={`${mode}-item-name`}>Nome</label>
          <input
            id={`${mode}-item-name`}
            type="text"
            placeholder="Ex.: Notebook Dell"
            value={form.name}
            onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-item-category`}>Categoria</label>
          <input
            id={`${mode}-item-category`}
            type="text"
            placeholder="Ex.: TI"
            value={form.category}
            onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
            required
          />
        </div>
        <div className="form-field full-width">
          <label htmlFor={`${mode}-item-qr`}>Código QR</label>
          <div className="code-input-wrap">
            <input
              id={`${mode}-item-qr`}
              type="text"
              placeholder="Digite ou gere aleatório"
              value={form.qr_code_hash}
              onChange={(e) => setForm((c) => ({ ...c, qr_code_hash: e.target.value }))}
              required
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setForm((c) => ({ ...c, qr_code_hash: generateRandomCode() }))}
            >
              <Sparkles size={14} /> Gerar
            </button>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-item-status`}>Status (emprestável)</label>
          <select
            id={`${mode}-item-status`}
            value={form.status}
            onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as ItemStatus }))}
          >
            <option value="available">Disponível</option>
            {mode === 'edit' && <option value="lent">Emprestado</option>}
            <option value="maintenance">Manutenção</option>
          </select>
          <small className="form-help">
            Para materiais de consumo e quantidade, use Modo Estoque em Novo Cadastro.
          </small>
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-item-parent`}>Item pai</label>
          <select
            id={`${mode}-item-parent`}
            value={form.parent_item_id === null ? '' : String(form.parent_item_id)}
            onChange={(e) =>
              setForm((c) => ({
                ...c,
                parent_item_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
          >
            <option value="">Nenhum (raiz)</option>
            {validParentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* ── Purchase ──────────────────────────────────────── */}
        <div className="form-field">
          <label htmlFor={`${mode}-item-product-code`}>Código do Produto</label>
          <input
            id={`${mode}-item-product-code`}
            type="text"
            placeholder={mode === 'create' ? 'Gerado automaticamente ao salvar' : '—'}
            value={mode === 'edit' ? (form.product_code || '—') : (form.product_code || '')}
            readOnly
            disabled
          />
        </div>
        <div className="form-field">
          <label htmlFor={`${mode}-item-purchase-code`}>Cód. Compra</label>
          <input
            id={`${mode}-item-purchase-code`}
            type="text"
            placeholder="Ex.: NF-12345"
            value={form.purchase_code}
            onChange={(e) => setForm((c) => ({ ...c, purchase_code: e.target.value }))}
          />
        </div>
        <div className="form-field full-width">
          <label htmlFor={`${mode}-item-purchase-info`}>Info da Compra</label>
          <textarea
            id={`${mode}-item-purchase-info`}
            className="form-textarea"
            placeholder="Detalhes da compra, fornecedor, data..."
            value={form.purchase_info}
            onChange={(e) => setForm((c) => ({ ...c, purchase_info: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="form-field full-width item-form-actions">
          <button type="submit" className="btn btn-primary" disabled={adminLoading}>
            {adminLoading ? (
              <Loader2 size={16} className="spin" />
            ) : mode === 'create' ? (
              <Plus size={16} />
            ) : (
              <Pencil size={14} />
            )}
            {mode === 'create' ? 'Criar item' : 'Salvar'}
          </button>
          {mode === 'create' && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => downloadQrByCanvasId(qrCanvasId, hashValue)}
            >
              <Download size={14} /> QR
            </button>
          )}
          {mode === 'edit' && onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="qr-preview">
        <h3>Prévia QR (link público)</h3>
        <QRCodeCanvas id={qrCanvasId} value={previewValue} size={130} includeMargin level="H" />
        {mode === 'edit' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => downloadQrByCanvasId(qrCanvasId, hashValue)}
          >
            <Download size={14} /> Download
          </button>
        )}
      </div>
    </div>
  )
}
