import { type FormEvent, useState } from 'react'
import { Loader2, Plus, Pencil } from 'lucide-react'
import { useCustomerStore, type Customer } from '../store/useCustomerStore'

interface CustomerFormProps {
  mode: 'create' | 'edit'
  customer?: Customer
  onSuccess?: () => void
  onCancel?: () => void
}

const defaultForm = {
  code: '',
  name: '',
  description: '',
}

export default function CustomerForm({
  mode,
  customer,
  onSuccess,
  onCancel,
}: CustomerFormProps) {
  const { createCustomer, updateCustomer, loading } = useCustomerStore()
  const [form, setForm] = useState(
    mode === 'edit' && customer
      ? {
          code: customer.code,
          name: customer.name,
          description: customer.description || '',
        }
      : defaultForm,
  )

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    let success = false
    if (mode === 'create') {
      success = await createCustomer({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      })
      if (success) setForm(defaultForm)
    } else if (customer) {
      success = await updateCustomer(customer.id, {
        code: form.code.trim() || undefined,
        name: form.name.trim() || undefined,
        description: form.description.trim() || null,
      })
    }
    if (success) onSuccess?.()
  }

  return (
    <form className="create-form-grid" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor={`${mode}-customer-code`}>Código</label>
        <input
          id={`${mode}-customer-code`}
          type="text"
          placeholder="Gerado auto..."
          value={form.code}
          onChange={(e) => setForm((c) => ({ ...c, code: e.target.value.toUpperCase() }))}
          required
          disabled={mode === 'edit'}
          maxLength={10}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${mode}-customer-name`}>Nome</label>
        <input
          id={`${mode}-customer-name`}
          type="text"
          placeholder="Ex.: Volkswagen"
          value={form.name}
          onChange={(e) => {
            const name = e.target.value
            if (mode === 'create') {
              const autoCode = name.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')
              setForm((c) => {
                const currentAuto = c.name.substring(0, 5).toUpperCase().replace(/[^A-Z0-9]/g, '')
                const shouldUpdateCode = !c.code || c.code === currentAuto
                return {
                  ...c,
                  name,
                  code: shouldUpdateCode ? autoCode : c.code
                }
              })
            } else {
              setForm((c) => ({ ...c, name }))
            }
          }}
          required
        />
      </div>
      <div className="form-field full-width">
        <label htmlFor={`${mode}-customer-desc`}>Descrição</label>
        <textarea
          id={`${mode}-customer-desc`}
          className="form-textarea"
          placeholder="Descrição do cliente..."
          value={form.description}
          onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
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
          {mode === 'create' ? 'Criar cliente' : 'Salvar'}
        </button>
        {mode === 'edit' && onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
