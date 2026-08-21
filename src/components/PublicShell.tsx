import { BookOpen, LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link to="/" className="brand" aria-label="返回首页">
          <span className="brand-mark"><BookOpen size={22} /></span>
          <span>
            <strong>咱们班的成长记录</strong>
            <small>每一步，都算数</small>
          </span>
        </Link>
      </header>
      <main>{children}</main>
      <footer className="public-footer">
        <p>用心记录思考、创造与每一次小小突破</p>
        <Link to="/admin/login"><LockKeyhole size={14} /> 管理员入口</Link>
      </footer>
    </div>
  )
}
