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

export function SetupNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`setup-notice ${compact ? 'compact' : ''}`}>
      <Settings2 size={24} />
      <div>
        <strong>项目等待连接 Supabase</strong>
        <p>按照项目 README 完成免费账号和环境变量配置后，就可以开始录入数据。</p>
      </div>
    </div>
  )
}
