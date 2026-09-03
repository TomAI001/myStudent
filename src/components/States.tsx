import { AlertCircle, LoaderCircle, Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageLoader({ label = '正在打开成长记录…' }: { label?: string }) {
  return (
    <div className="state-card state-loading">
      <LoaderCircle className="spin" size={30} />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="state-card state-error">
      <AlertCircle size={30} />
      <h2>暂时没有打开成功</h2>
      <p>{message}</p>
      {action}
    </div>
  )
}
export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span>{icon ?? <Settings2 size={26} />}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
// End of shared state components.

