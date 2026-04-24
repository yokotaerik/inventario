export function formatDate(isoString: string | null): string {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function buildItemDeepLink(qrHash: string): string {
  const normalized = qrHash.trim()
  if (!normalized) return ''
  if (typeof window === 'undefined') return normalized
  const configuredBase = (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined)?.trim()
  const baseUrl =
    configuredBase && configuredBase.length > 0
      ? configuredBase.replace(/\/$/, '')
      : window.location.origin
  return `${baseUrl}/?qr=${encodeURIComponent(normalized)}`
}

export function normalizeScannedValue(rawValue: string): string {
  const value = rawValue.trim()
  if (!value) return ''
  try {
    const parsed = new URL(value)
    const queryValue = parsed.searchParams.get('qr')
    if (queryValue?.trim()) return queryValue.trim()
    const pathMatch = parsed.pathname.match(/\/scan\/([^/]+)/)
    if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]).trim()
  } catch {
    // not a URL
  }
  return value
}

export interface TransactionHistory {
  id: number
  item_id: number | null
  parent_item_id: number | null
  item_name: string
  item_category: string
  employee_name: string
  destino: string | null
  observacao: string | null
  observacao_checkin: string | null
  batch_code: string | null
  batch_root_item_id: number | null
  batch_root_item_name: string | null
  checkout_time: string | null
  checkin_time: string | null
}

export type HistoryEntry =
  | {
      kind: 'single'
      key: string
      transaction: TransactionHistory
      checkoutTs: number
    }
  | {
      kind: 'batch'
      key: string
      batchCode: string
      batchRootName: string
      transactions: TransactionHistory[]
      checkoutTs: number
    }

export function buildHistoryEntries(transactions: TransactionHistory[]): HistoryEntry[] {
  const batchMap = new Map<string, TransactionHistory[]>()
  const singles: HistoryEntry[] = []

  for (const t of transactions) {
    const checkoutTs = t.checkout_time ? new Date(t.checkout_time).getTime() : 0
    if (!t.batch_code) {
      singles.push({ kind: 'single', key: `single-${t.id}`, transaction: t, checkoutTs })
      continue
    }
    const list = batchMap.get(t.batch_code) || []
    list.push(t)
    batchMap.set(t.batch_code, list)
  }

  const batches: HistoryEntry[] = Array.from(batchMap.entries()).map(
    ([batchCode, batchTransactions]) => {
      const ordered = [...batchTransactions].sort((a, b) =>
        a.item_name.localeCompare(b.item_name),
      )
      const first = ordered[0]
      const checkoutTs = first?.checkout_time ? new Date(first.checkout_time).getTime() : 0
      return {
        kind: 'batch',
        key: `batch-${batchCode}`,
        batchCode,
        batchRootName: first?.batch_root_item_name || first?.item_name || 'Maleta',
        transactions: ordered,
        checkoutTs,
      }
    },
  )

  return [...singles, ...batches].sort((a, b) => b.checkoutTs - a.checkoutTs)
}
