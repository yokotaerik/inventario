import { useState, useEffect, type FormEvent } from 'react'
import { Monitor, Plus, Pencil, Trash2, Eye, EyeOff, Copy } from 'lucide-react'
import { useProjectStore, type AnyDeskEntry } from '../store/useProjectStore'

interface AnyDeskTableProps {
  projectId: number
}

export default function AnyDeskTable({ projectId }: AnyDeskTableProps) {
  const { anyDeskEntries, fetchAnyDeskEntries, createAnyDeskEntry, updateAnyDeskEntry, deleteAnyDeskEntry } = useProjectStore()
  const entries = anyDeskEntries[projectId] ?? []

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())

  const [machineName, setMachineName] = useState('')
  const [anyDeskId, setAnyDeskId] = useState('')
  const [password, setPassword] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetchAnyDeskEntries(projectId)
  }, [projectId])

  const resetForm = () => {
    setMachineName('')
    setAnyDeskId('')
    setPassword('')
    setDescription('')
  }

  const startEdit = (entry: AnyDeskEntry) => {
    setEditingId(entry.id)
    setMachineName(entry.machine_name)
    setAnyDeskId(entry.anydesk_id)
    setPassword(entry.password ?? '')
    setDescription(entry.description ?? '')
    setShowForm(false)
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const success = await createAnyDeskEntry(projectId, {
      machine_name: machineName.trim(),
      anydesk_id: anyDeskId.trim(),
      password: password.trim() || null,
      description: description.trim() || null,
    })
    if (success) {
      cancelForm()
    }
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (editingId === null) return
    const success = await updateAnyDeskEntry(editingId, projectId, {
      machine_name: machineName.trim(),
      anydesk_id: anyDeskId.trim(),
      password: password.trim() || null,
      description: description.trim() || null,
    })
    if (success) {
      cancelForm()
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir esta entrada AnyDesk?')) return
    await deleteAnyDeskEntry(id, projectId)
  }

  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const formFields = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="form-field">
        <input
          type="text"
          value={machineName}
          onChange={e => setMachineName(e.target.value)}
          placeholder="Nome da máquina *"
          required
          autoFocus
        />
      </div>
      <div className="form-field">
        <input
          type="text"
          value={anyDeskId}
          onChange={e => setAnyDeskId(e.target.value)}
          placeholder="ID AnyDesk *"
          required
        />
      </div>
      <div className="form-field">
        <input
          type="text"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Senha (opcional)"
        />
      </div>
      <div className="form-field">
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
        />
      </div>
      <div className="location-edit-actions">
        <button type="submit" className="btn btn-primary btn-sm">
          <Plus size={14} /> {editingId !== null ? 'Salvar' : 'Adicionar'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={cancelForm}>
          Cancelar
        </button>
      </div>
    </div>
  )

  return (
    <div className="drawer-section">
      <div
        className="drawer-section-title"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Monitor size={15} />
        AnyDesk ({entries.length})
      </div>

      {entries.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Máquina</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>ID AnyDesk</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Senha</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Descrição</th>
                <th style={{ padding: '6px 4px' }} />
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                editingId === entry.id ? (
                  <tr key={entry.id}>
                    <td colSpan={5} style={{ padding: '8px 4px' }}>
                      <form onSubmit={handleUpdate}>
                        {formFields}
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 500 }}>{entry.machine_name}</td>
                    <td style={{ padding: '7px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <code style={{ fontSize: '0.8rem' }}>{entry.anydesk_id}</code>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Copiar ID"
                          onClick={() => copyToClipboard(entry.anydesk_id)}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '7px 8px' }}>
                      {entry.password ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {visiblePasswords.has(entry.id) ? entry.password : '••••••'}
                          </span>
                          <button
                            type="button"
                            className="btn-icon"
                            title={visiblePasswords.has(entry.id) ? 'Ocultar' : 'Mostrar'}
                            onClick={() => togglePasswordVisibility(entry.id)}
                          >
                            {visiblePasswords.has(entry.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Copiar senha"
                            onClick={() => copyToClipboard(entry.password!)}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '7px 8px', color: 'var(--text-muted)' }}>
                      {entry.description || '—'}
                    </td>
                    <td style={{ padding: '7px 4px' }}>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Editar"
                          onClick={() => startEdit(entry)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Excluir"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="empty-state" style={{ padding: '8px 0', fontSize: '0.85rem' }}>
          Nenhuma entrada AnyDesk cadastrada.
        </p>
      )}

      {showForm && editingId === null && (
        <form onSubmit={handleCreate} style={{ marginBottom: 8 }}>
          {formFields}
        </form>
      )}

      {!showForm && editingId === null && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => { setShowForm(true); resetForm() }}
        >
          <Plus size={14} /> Nova entrada
        </button>
      )}
    </div>
  )
}
