import { useState, useEffect, useCallback } from 'react'
import { Package, LogOut, MapPin, MessageSquare, Loader2 } from 'lucide-react'
import { useLoanStore, type ScanResponse, type BatchOperationResult } from '../store/useLoanStore'
import { useItemStore } from '../../inventory/store/useItemStore'

const statusLabelMap = { available: 'Disponível', lent: 'Emprestado', maintenance: 'Manutenção' } as const

interface CheckoutFormProps {
  currentItem: ScanResponse
  batchSummary: BatchOperationResult | null
  onComplete: (result?: BatchOperationResult | null) => void
}

export default function CheckoutForm({ currentItem, batchSummary, onComplete }: CheckoutFormProps) {
  const { checkout, checkoutContainer } = useLoanStore()
  const { fetchStatusItems } = useItemStore()

  const [destino, setDestino] = useState('')
  const [obs, setObs] = useState('')
  const [checkoutMode, setCheckoutMode] = useState<'full_available' | 'single_child'>('full_available')
  const [selectedChildId, setSelectedChildId] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const isContainerScan = currentItem.is_container_scan
  const availableChildren = currentItem.family_children.filter((c) => c.status === 'available')

  useEffect(() => {
    const firstAvailable = availableChildren[0]
    setSelectedChildId(firstAvailable?.id || 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem])

  const describeSkipReason = (reason?: string) => {
    if (!reason) return 'Ignorado'
    if (reason === 'item_indisponivel') return 'Item indisponível'
    if (reason === 'transacao_ativa') return 'Já possui empréstimo ativo'
    return reason
  }

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    try {
      if (isContainerScan) {
        const result = await checkoutContainer(
          currentItem.family_container_id,
          checkoutMode,
          {
            targetChildId: checkoutMode === 'single_child' ? selectedChildId : undefined,
            destino: destino.trim() || undefined,
            observacao: obs.trim() || undefined,
          },
        )
        await fetchStatusItems()
        onComplete(result)
      } else {
        await checkout(currentItem.item.id, {
          destino: destino.trim() || undefined,
          observacao: obs.trim() || undefined,
        })
        await fetchStatusItems()
        onComplete()
      }
    } finally {
      setSubmitting(false)
    }
  }, [
    isContainerScan, currentItem, checkoutMode, selectedChildId,
    destino, obs, checkoutContainer, checkout, fetchStatusItems, onComplete,
  ])

  return (
    <div className="action-card">
      {/* Item header */}
      <div className="scan-item-card">
        <div className="scan-icon"><Package size={24} /></div>
        <h2>{currentItem.item.name}</h2>
        <p>{currentItem.item.category} • {statusLabelMap[currentItem.item.status]}</p>
      </div>

      {/* Container mode selector */}
      {isContainerScan && (
        <div className="scan-mode-card">
          <p className="info-text">
            Esta maleta possui <strong>{currentItem.family_children.length}</strong> subitens.
          </p>
          <div className="scan-mode-grid">
            <button
              type="button"
              className={`btn ${checkoutMode === 'full_available' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCheckoutMode('full_available')}
            >
              Emprestar maleta inteira
            </button>
            <button
              type="button"
              className={`btn ${checkoutMode === 'single_child' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCheckoutMode('single_child')}
            >
              Emprestar só um item
            </button>
          </div>
          {checkoutMode === 'single_child' && (
            <div className="form-field">
              <label htmlFor="single-child-select">Subitem disponível</label>
              <select
                id="single-child-select"
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(Number(e.target.value))}
              >
                <option value={0}>Selecione um subitem</option>
                {availableChildren.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Destino */}
      <div className="form-field">
        <label htmlFor="checkout-destino">
          <MapPin size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Destino
        </label>
        <input
          id="checkout-destino"
          type="text"
          placeholder="Ex.: Obra Centro, Sala 3..."
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
        />
      </div>

      {/* Observação */}
      <div className="form-field">
        <label htmlFor="checkout-obs">
          <MessageSquare size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Observação
        </label>
        <textarea
          id="checkout-obs"
          className="form-textarea"
          placeholder="Alguma nota sobre esta retirada..."
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={2}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={
          submitting ||
          (isContainerScan && checkoutMode === 'single_child' && selectedChildId === 0) ||
          (isContainerScan && checkoutMode === 'single_child' && availableChildren.length === 0)
        }
        onClick={handleSubmit}
      >
        {submitting ? <Loader2 size={16} className="spin" /> : <LogOut size={16} />}
        {isContainerScan ? 'Confirmar retirada da maleta' : 'Confirmar retirada'}
      </button>

      {/* Skipped items feedback */}
      {batchSummary && batchSummary.skipped_items.length > 0 && (
        <div className="mode-info-box">
          <p className="mode-info-title">Itens ignorados na última operação</p>
          {batchSummary.skipped_items.map((item) => (
            <p className="mode-info-line" key={`skip-${item.id}`}>
              {item.name}: {describeSkipReason(item.reason)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
