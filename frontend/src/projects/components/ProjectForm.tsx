import { type FormEvent, useState } from 'react'
import { Loader2, Plus, Pencil } from 'lucide-react'
import { useProjectStore, type Project, type ProjectStatus } from '../store/useProjectStore'
import { useCustomerStore } from '../../customers/store/useCustomerStore'

interface ProjectFormProps {
  mode: 'create' | 'edit'
  project?: Project
  customerId?: number
  onSuccess?: () => void
  onCancel?: () => void
}

const defaultForm = {
  customer_id: 0,
  code: '',
  name: '',
  description: '',
  status: 'active' as ProjectStatus,
}

export default function ProjectForm({
  mode,
  project,
  customerId,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const { createProject, updateProject, loading } = useProjectStore()
  const { customers } = useCustomerStore()

  const [form, setForm] = useState(
    mode === 'edit' && project
      ? {
          customer_id: project.customer_id,
          code: project.code,
          name: project.name,
          description: project.description || '',
          status: project.status,
        }
      : {
          ...defaultForm,
          customer_id: customerId || 0,
        },
  )

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    let success = false
    if (mode === 'create') {
      const trimmedCode = form.code.trim()
      success = await createProject({
        customer_id: form.customer_id,
        code: trimmedCode || undefined,
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
      })
      if (success) {
        setForm({ ...defaultForm, customer_id: customerId || 0 })
      }
    } else if (project) {
      success = await updateProject(project.id, {
        code: form.code.trim() || undefined,
        name: form.name.trim() || undefined,
        description: form.description.trim() || null,
        status: form.status,
      })
    }
    if (success) onSuccess?.()
  }

  return (
    <form className="create-form-grid" onSubmit={handleSubmit}>
      {mode === 'create' && (
        <div className="form-field">
          <label htmlFor={`${mode}-project-customer`}>Cliente *</label>
          <select
            id={`${mode}-project-customer`}
            value={form.customer_id}
            onChange={(e) => setForm((c) => ({ ...c, customer_id: Number(e.target.value) }))}
            required
          >
            <option value="0">Selecione um cliente...</option>
            {customers.map((cust) => (
              <option key={cust.id} value={cust.id}>
                {cust.code} - {cust.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-field">
        <label htmlFor={`${mode}-project-code`}>Código</label>
        <input
          id={`${mode}-project-code`}
          type="text"
          placeholder={mode === 'create' ? 'Deixe vazio para gerar (70XXXX)' : 'Ex.: PRJ-001'}
          value={form.code}
          onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))}
          required={mode === 'edit'}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${mode}-project-name`}>Nome</label>
        <input
          id={`${mode}-project-name`}
          type="text"
          placeholder="Ex.: Obra Centro"
          value={form.name}
          onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
          required
        />
      </div>
      <div className="form-field full-width">
        <label htmlFor={`${mode}-project-desc`}>Descrição</label>
        <textarea
          id={`${mode}-project-desc`}
          className="form-textarea"
          placeholder="Descrição do projeto..."
          value={form.description}
          onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
          rows={2}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${mode}-project-status`}>Status</label>
        <select
          id={`${mode}-project-status`}
          value={form.status}
          onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as ProjectStatus }))}
        >
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="completed">Concluído</option>
        </select>
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
          {mode === 'create' ? 'Criar projeto' : 'Salvar'}
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
