import { useCallback, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: string
}

export default function Drawer({ open, onClose, title, children, width = '480px' }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Trap scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  return (
    <div className={`drawer-overlay ${open ? 'drawer-open' : ''}`} onClick={handleOverlayClick}>
      <div
        ref={panelRef}
        className={`drawer-panel ${open ? 'drawer-panel-open' : ''}`}
        style={{ '--drawer-width': width } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && (
          <div className="drawer-header">
            <h2 className="drawer-title">{title}</h2>
            <button type="button" className="drawer-close" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  )
}
