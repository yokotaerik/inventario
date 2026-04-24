import { useCallback, useEffect, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import QRScanner from '../../components/QRScanner'
import CheckoutForm from './CheckoutForm'
import CheckinForm from './CheckinForm'
import { useLoanStore, type BatchOperationResult } from '../store/useLoanStore'
import { normalizeScannedValue } from '../../shared/utils/formatters'
import { useItemStore } from '../../inventory/store/useItemStore'

export default function ScannerView() {
  const { currentItem, loading, error, scanItem, clearCurrentItem, clearError } = useLoanStore()
  const { fetchStatusItems } = useItemStore()

  const [manualCode, setManualCode] = useState('')
  const [batchSummary, setBatchSummary] = useState<BatchOperationResult | null>(null)
  const [containerAction, setContainerAction] = useState<'checkout' | 'checkin'>('checkout')

  const handleScan = useCallback(
    (rawValue: string) => {
      const normalized = normalizeScannedValue(rawValue)
      if (!normalized) return
      scanItem(normalized)
    },
    [scanItem],
  )

  const submitManualCode = () => {
    const code = manualCode.trim()
    if (!code) return
    handleScan(code)
    setManualCode('')
  }

  const resetScanner = () => {
    clearCurrentItem()
    clearError()
    setBatchSummary(null)
    setContainerAction('checkout')
  }

  // Deep-link QR on page load
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const qrFromUrl = params.get('qr')
    if (!qrFromUrl?.trim()) return
    handleScan(qrFromUrl)
    const cleanUrl = `${window.location.pathname}${window.location.hash || ''}`
    window.history.replaceState({}, '', cleanUrl)
  }, [handleScan])

  if (loading) {
    return (
      <div className="state-box">
        <Loader2 size={28} className="spin" />
        <p>Buscando informações...</p>
      </div>
    )
  }

  // No item scanned yet — show scanner UI
  if (!currentItem) {
    return (
      <section className="scanner-section">
        <h2>Escanear Item</h2>
        <p>Aponte a câmera para o QR Code ou digite o código manualmente.</p>

        {batchSummary && (
          <div className="action-card batch-summary-card">
            <p className="info-text">
              <strong>{batchSummary.message}</strong>
            </p>
            <p className="info-text">
              Processados: <strong>{batchSummary.processed_count}</strong> • Ignorados:{' '}
              <strong>{batchSummary.skipped_count}</strong>
            </p>
          </div>
        )}

        <div className="manual-entry">
          <label htmlFor="manual-code">Código manual</label>
          <div className="inline-group">
            <input
              id="manual-code"
              type="text"
              placeholder="Ex.: ITM-001"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitManualCode() }}
            />
            <button type="button" className="btn btn-primary" onClick={submitManualCode}>
              <Camera size={16} /> Buscar
            </button>
          </div>
        </div>

        <QRScanner onScan={handleScan} />
      </section>
    )
  }

  // Item scanned — determine action
  const isContainerScan = currentItem.is_container_scan
  const availableChildren = currentItem.family_children.filter((c) => c.status === 'available')
  const lentFamilyItems = currentItem.family_lent_items

  const canContainerCheckout =
    isContainerScan && (currentItem.item.status === 'available' || availableChildren.length > 0)
  const canContainerCheckin = isContainerScan && lentFamilyItems.length > 0

  const effectiveContainerAction =
    containerAction === 'checkout' && !canContainerCheckout
      ? 'checkin'
      : containerAction === 'checkin' && !canContainerCheckin
        ? 'checkout'
        : containerAction

  const shouldRenderCheckout = isContainerScan
    ? effectiveContainerAction === 'checkout'
    : currentItem.item.status === 'available'

  const handleComplete = async (result?: BatchOperationResult | null) => {
    if (result) setBatchSummary(result)
    await fetchStatusItems()
  }

  return (
    <section className="scan-result">
      {/* Container action toggle */}
      {isContainerScan && (
        <div className="action-card">
          <div className="form-field">
            <label htmlFor="container-action-select">Ação</label>
            <select
              id="container-action-select"
              value={effectiveContainerAction}
              onChange={(e) => setContainerAction(e.target.value as 'checkout' | 'checkin')}
            >
              <option value="checkout" disabled={!canContainerCheckout}>Emprestar</option>
              <option value="checkin" disabled={!canContainerCheckin}>Devolver</option>
            </select>
          </div>
          {!canContainerCheckout && (
            <p className="mode-warning">Nenhum item disponível para nova retirada nesta maleta.</p>
          )}
          {canContainerCheckout && lentFamilyItems.length > 0 && (
            <p className="info-text">
              Já existem itens emprestados nesta maleta. No modo "maleta inteira", os itens já emprestados serão ignorados.
            </p>
          )}
        </div>
      )}

      {/* Main form */}
      {shouldRenderCheckout ? (
        <CheckoutForm
          currentItem={currentItem}
          batchSummary={batchSummary}
          onComplete={handleComplete}
        />
      ) : (
        <CheckinForm
          currentItem={currentItem}
          batchSummary={batchSummary}
          onComplete={handleComplete}
        />
      )}

      {error && (
        <div className="alert">
          <span>{error}</span>
        </div>
      )}

      <button type="button" className="btn btn-ghost btn-block" onClick={resetScanner}>
        Cancelar
      </button>
    </section>
  )
}
