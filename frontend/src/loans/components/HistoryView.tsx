import { useEffect, useMemo } from 'react'
import { RefreshCw, ArrowUpRight, ArrowDownLeft, User, MapPin, ChevronDown } from 'lucide-react'
import { useLoanStore } from '../store/useLoanStore'
import { buildHistoryEntries, formatDate } from '../../shared/utils/formatters'

export default function HistoryView() {
  const { transactions, fetchTransactions } = useLoanStore()
  const historyEntries = useMemo(() => buildHistoryEntries(transactions), [transactions])

  useEffect(() => {
    fetchTransactions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="history-section">
      <div className="section-header">
        <h2>Movimentações</h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={fetchTransactions}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {historyEntries.length === 0 ? (
        <div className="empty-state">Nenhuma movimentação registrada.</div>
      ) : (
        <div className="history-list">
          {historyEntries.map((entry) => {
            if (entry.kind === 'single') {
              const t = entry.transaction
              const isOpen = t.checkin_time === null
              return (
                <div
                  className={`history-card ${isOpen ? 'history-open' : 'history-closed'}`}
                  key={entry.key}
                >
                  <div className="history-header">
                    <div className="history-item-info">
                      <span className="history-item-name">{t.item_name}</span>
                      <span className="history-item-cat">{t.item_category}</span>
                    </div>
                    <span className={`badge ${isOpen ? 'badge-lent' : 'badge-available'}`}>
                      {isOpen ? 'Em uso' : 'Devolvido'}
                    </span>
                  </div>
                  <div className="history-body">
                    <div className="history-row">
                      <ArrowUpRight size={14} className="history-icon-out" />
                      <div className="history-row-content">
                        <span className="history-row-label">Retirada</span>
                        <span className="history-row-value">{formatDate(t.checkout_time)}</span>
                        <span className="history-row-detail">
                          <User size={12} /> {t.employee_name}
                        </span>
                        {t.destino && (
                          <span className="history-row-detail">
                            <MapPin size={12} /> {t.destino}
                          </span>
                        )}
                        {t.observacao && (
                          <span className="history-row-obs">{t.observacao}</span>
                        )}
                      </div>
                    </div>
                    {t.checkin_time && (
                      <div className="history-row">
                        <ArrowDownLeft size={14} className="history-icon-in" />
                        <div className="history-row-content">
                          <span className="history-row-label">Devolução</span>
                          <span className="history-row-value">{formatDate(t.checkin_time)}</span>
                          {t.observacao_checkin && (
                            <span className="history-row-obs">{t.observacao_checkin}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            const openCount = entry.transactions.filter((t) => t.checkin_time === null).length
            const closedCount = entry.transactions.length - openCount
            const isOpen = openCount > 0
            const first = entry.transactions[0]
            const latestCheckin =
              entry.transactions
                .map((t) => t.checkin_time)
                .filter((v): v is string => Boolean(v))
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null

            return (
              <div
                className={`history-card ${isOpen ? 'history-open' : 'history-closed'}`}
                key={entry.key}
              >
                <div className="history-header">
                  <div className="history-item-info">
                    <span className="history-item-name">{entry.batchRootName}</span>
                    <span className="history-item-cat">Lote ({entry.transactions.length})</span>
                  </div>
                  <span className={`badge ${isOpen ? 'badge-lent' : 'badge-available'}`}>
                    {isOpen ? `Em uso (${openCount})` : 'Devolvido'}
                  </span>
                </div>
                <div className="history-body">
                  <div className="history-row">
                    <ArrowUpRight size={14} className="history-icon-out" />
                    <div className="history-row-content">
                      <span className="history-row-label">Retirada</span>
                      <span className="history-row-value">{formatDate(first.checkout_time)}</span>
                      <span className="history-row-detail">
                        <User size={12} /> {first.employee_name}
                      </span>
                      {first.destino && (
                        <span className="history-row-detail">
                          <MapPin size={12} /> {first.destino}
                        </span>
                      )}
                    </div>
                  </div>
                  {latestCheckin && (
                    <div className="history-row">
                      <ArrowDownLeft size={14} className="history-icon-in" />
                      <div className="history-row-content">
                        <span className="history-row-label">Devolução</span>
                        <span className="history-row-value">{formatDate(latestCheckin)}</span>
                        <span className="history-row-detail">
                          {closedCount}/{entry.transactions.length} itens devolvidos
                        </span>
                      </div>
                    </div>
                  )}
                  <details className="history-batch-details">
                    <summary>
                      <span>Ver itens do lote</span>
                      <ChevronDown size={14} />
                    </summary>
                    <div className="history-batch-items">
                      {entry.transactions.map((t) => (
                        <div className="history-batch-item" key={t.id}>
                          <span className="history-batch-item-name">{t.item_name}</span>
                          <span
                            className={`badge ${t.checkin_time === null ? 'badge-lent' : 'badge-available'}`}
                          >
                            {t.checkin_time === null ? 'Em uso' : 'Devolvido'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
