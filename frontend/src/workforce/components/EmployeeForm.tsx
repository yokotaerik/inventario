import { type FormEvent, useEffect, useState } from 'react'
import { Loader2, UserPlus, Pencil } from 'lucide-react'
import { useEmployeeStore, type Employee } from '../store/useEmployeeStore'
import { useProjectStore } from '../../projects/store/useProjectStore'

interface EmployeeFormProps {
  mode: 'create' | 'edit'
  employee?: Employee
  onSuccess?: () => void
  onCancel?: () => void
}

const defaultForm = { name: '', department: '', is_active: true, location_id: null as number | null }

export default function EmployeeForm({ mode, employee, onSuccess, onCancel }: EmployeeFormProps) {
  const { createEmployee, updateEmployee, adminLoading } = useEmployeeStore()
  const { projects, fetchProjects } = useProjectStore()

  const [form, setForm] = useState(
    mode === 'edit' && employee
      ? {
          name: employee.name,
          department: employee.department || '',
          is_active: employee.is_active,
          location_id: employee.location_id,
        }
      : defaultForm,
  )

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  // Flatten all locations from all projects
  const allLocations = projects.flatMap((p) =>
    p.locations.map((loc) => ({
      ...loc,
      projectName: p.name,
      projectCode: p.code,
    })),
  )

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    let success = false
    const payload = {
      name: form.name.trim(),
      department: form.department.trim(),
      is_active: form.is_active,
      location_id: form.location_id,
    }
    if (mode === 'create') {
      success = await createEmployee(payload)
      if (success) setForm(defaultForm)
    } else if (employee) {
      success = await updateEmployee(employee.id, payload)
    }
    if (success) onSuccess?.()
  }

  return (
    <form className="create-form-grid" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor={`${mode}-emp-name`}>Nome</label>
        <input
          id={`${mode}-emp-name`}
          type="text"
          placeholder="Ex.: João Silva"
          value={form.name}
          onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
          required
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${mode}-emp-dept`}>Departamento</label>
        <input
          id={`${mode}-emp-dept`}
          type="text"
          placeholder="Ex.: Operacional"
          value={form.department}
          onChange={(e) => setForm((c) => ({ ...c, department: e.target.value }))}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${mode}-emp-active`}>Status</label>
        <select
          id={`${mode}-emp-active`}
          value={form.is_active ? 'true' : 'false'}
          onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.value === 'true' }))}
        >
          <option value="true">Ativo</option>
          <option value="false">Inativo</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor={`${mode}-emp-location`}>Localização</label>
        <select
          id={`${mode}-emp-location`}
          value={form.location_id === null ? '' : String(form.location_id)}
          onChange={(e) =>
            setForm((c) => ({
              ...c,
              location_id: e.target.value ? Number(e.target.value) : null,
            }))
          }
        >
          <option value="">Nenhuma</option>
          {allLocations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              [{loc.projectCode}] {loc.name}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field full-width item-form-actions">
        <button type="submit" className="btn btn-primary" disabled={adminLoading}>
          {adminLoading ? (
            <Loader2 size={16} className="spin" />
          ) : mode === 'create' ? (
            <UserPlus size={16} />
          ) : (
            <Pencil size={14} />
          )}
          {mode === 'create' ? 'Criar funcionário' : 'Salvar'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
