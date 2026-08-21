import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicShell from '../components/PublicShell'

export default function NotFound() {
  return <PublicShell><div className="not-found"><span>404</span><h1>这颗小星球还没有被发现</h1><p>可能是链接写错了，回到首页重新出发吧。</p><Link to="/" className="primary-button"><ArrowLeft size={18} /> 返回首页</Link></div></PublicShell>
}
