import { useState, useCallback } from 'react'
import { CheckCircle2, MessageSquare, Loader2 } from 'lucide-react'
import { useLoanStore, type ScanResponse, type BatchOperationResult } from '../store/useLoanStore'
import { useItemStore } from '../../inventory/store/useItemStore'

interface CheckinFormProps {
  currentItem: ScanResponse
  batchSummary: BatchOperationResult | null
  onComplete: (result?: BatchOperationResult | null) => void
}

export default function CheckinForm({ currentItem, batchSummary, onComplete }: CheckinFormProps) {
  const { checkin, checkinContainer } = useLoanStore()
  const { fetchStatusItems } = useItemStore()

  const [obs, setObs] = useState('')
  const [checkinMode, setCheckinMode] = useState<'all_lent' | 'single_lent'>('all_lent')
  const [selectedLentItemId, setSelectedLentItemId] = useState(0)
  const [selectedLentEmployeeId, setSelectedLentEmployeeId] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const isContainerScan = currentItem.is_container_scan
  const lentFamilyItems = currentItem.family_lent_items

  const lentEmployees = Array.from(
    lentFamilyItems.reduce((acc, item) => {
      const emp = item.current_transaction?.employee
      if (emp) acc.set(emp.id, emp.name)
      return acc
    }, new Map<number, string>()),
  ).map(([id, name]) => ({ id, name }))

  const canContainerCheckin = isContainerScan && lentFamilyItems.length > 0

  const describeSkipReason = (reason?: string) => {
    if (!reason) return 'Ignorado'
    if (reason === 'sem_emprestimo_ativo') return 'Sem empréstimo ativo'
    if (reason === 'emprestado_por_outro_funcionario') return 'Emprestado por outro funcionário'
    return reason
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      if (isContainerScan) {
        const result = await checkinContainer(currentItem.family_container_id, checkinMode, {
          targetItemId: checkinMode === 'single_lent' ? selectedLentItemId : undefined,
          employeeId: checkinMode === 'all_lent' ? (selectedLentEmployeeId || undefined) : undefined,
          observacao: obs.trim() || undefined,
        })
        await fetchStatusItems()
        onComplete(result)
      } else {
        await checkin(currentItem.item.id, { observacao: obs.trim() || undefined })
        await fetchStatusItems()
        onComplete()
      }
    } finally {
      setSubmitting(false)
    }
  }, [
    isContainerScan, currentItem, checkinMode, selectedLentItemId, selectedLentEmployeeId,
    obs, checkinContainer, checkin, fetchStatusItems, onComplete,
  ])

  return (
    <div className="action-card">
      {isContainerScan && (
        <div className="scan-mode-card">
          <p className="info-text">
            Itens emprestados nesta maleta: <strong>{lentFamilyItems.length}</strong>
          </p>
          <div className="scan-mode-grid">
            <button
              type="button"
              className={`btn ${checkinMode === 'all_lent' ? 'btn-success' : 'btn-ghost'}`}
              onClick={() => setCheckinMode('all_lent')}
            >
              Devolver tudo emprestado
            </button>
            <button
              type="button"
              className={`btn ${checkinMode === 'single_lent' ? 'btn-success' : 'btn-ghost'}`}
              onClick={() => setCheckinMode('single_lent')}
            >
              Devolver item específico
            </button>
          </div>

          {checkinMode === 'single_lent' && (
            <div className="form-field">
              <label htmlFor="single-lent-select">Item emprestado</label>
              <select
                id="single-lent-select"
                value={selectedLentItemId}
                onChange={(e) => setSelectedLentItemId(Number(e.target.value))}
              >
                <option value={0}>Selecione um item</option>
                {lentFamilyItems.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          )}

          {checkinMode === 'all_lent' && lentEmployees.length > 1 && (
            <div className="form-field">
              <label htmlFor="lent-employee-select">Devolver itens de qual funcionário</label>
              <select
                id="lent-employee-select"
                value={selectedLentEmployeeId}
                onChange={(e) => setSelectedLentEmployeeId(Number(e.target.value))}
              >
                <option value={0}>Selecione um funcionário</option>
                {lentEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {!isContainerScan && (
        <p className="info-text">
          Retirado por:{' '}
          <strong>
            {currentItem.current_transaction?.employee?.name || 'Sem registro'}
          </strong>
        </p>
      )}

      <div className="form-field">
        <label htmlFor="checkin-obs">
          <MessageSquare size={14} style={{ display: 'inline', verticalAlign: '-2px' }} />{' '}
          Observação de devolução
        </label>
        <textarea
          id="checkin-obs"
          className="form-textarea"
          placeholder="Alguma nota sobre esta devolução..."
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={2}
        />
      </div>

      <button
        type="button"
        className="btn btn-success btn-block"
        disabled={
          submitting ||
          (isContainerScan && !canContainerCheckin) ||
          (isContainerScan && checkinMode === 'all_lent' && lentEmployees.length > 1 && selectedLentEmployeeId === 0) ||
          (isContainerScan && checkinMode === 'single_lent' && selectedLentItemId === 0)
        }
        onClick={handleSubmit}
      >
        {submitting ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
        {isContainerScan ? 'Confirmar devolução da maleta' : 'Confirmar devolução'}
      </button>

      {batchSummary && batchSummary.skipped_items.length > 0 && (
        <div className="mode-info-box">
          <p className="mode-info-title">Itens não devolvidos na última operação</p>
          {batchSummary.skipped_items.map((item) => (
            <p className="mode-info-line" key={`checkin-skip-${item.id}`}>
              {item.name}: {describeSkipReason(item.reason)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
