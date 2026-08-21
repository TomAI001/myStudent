import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export default function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <div className={`admin-modal ${wide ? 'wide' : ''}`}>
        <header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="关闭"><X /></button></header>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  )
}
