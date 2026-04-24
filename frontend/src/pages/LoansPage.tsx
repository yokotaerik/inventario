import { useState } from 'react'
import { ScanLine, ClipboardList } from 'lucide-react'
import ScannerView from '../loans/components/ScannerView'
import HistoryView from '../loans/components/HistoryView'

type LoansTab = 'scanner' | 'history'

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState<LoansTab>('scanner')

  return (
    <section className="admin-section">
      <div className="admin-subnav" role="tablist" aria-label="Menu de Empréstimos">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'scanner'}
          className={`admin-subnav-btn ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <ScanLine size={15} /> Scanner QR
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`admin-subnav-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <ClipboardList size={15} /> Histórico
        </button>
      </div>

      {activeTab === 'scanner' && <ScannerView />}
      {activeTab === 'history' && <HistoryView />}
    </section>
  )
}
