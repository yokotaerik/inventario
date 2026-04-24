import { type FormEvent, useState } from 'react'
import { Loader2, Plus, Pencil } from 'lucide-react'
import { useProjectStore, type Project, type ProjectStatus } from '../store/useProjectStore'

interface ProjectFormProps {
  mode: 'create' | 'edit'
  project?: Project
  onSuccess?: () => void
  onCancel?: () => void
}

const defaultForm = {
  code: '',
  name: '',
  description: '',
  status: 'active' as ProjectStatus,
}

export default function ProjectForm({ mode, project, onSuccess, onCancel }: ProjectFormProps) {
  const { createProject, updateProject, loading } = useProjectStore()
  const [form, setForm] = useState(
    mode === 'edit' && project
      ? {
          code: project.code,
          name: project.name,
          description: project.description || '',
          status: project.status,
        }
      : defaultForm,
  )

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    let success = false
    if (mode === 'create') {
      success = await createProject({
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
      })
      if (success) setForm(defaultForm)
    } else if (project) {
      success = await updateProject(project.id, {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
      })
    }
    if (success) onSuccess?.()
  }

  return (
    <form className="create-form-grid" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor={`${mode}-project-code`}>Código</label>
        <input
          id={`${mode}-project-code`}
          type="text"
          placeholder="Ex.: PRJ-001"
          value={form.code}
          onChange={(e) => setForm((c) => ({ ...c, code: e.target.value }))}
          required
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
