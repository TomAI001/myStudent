import { ArrowLeft, KeyRound, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SetupNotice } from '../../components/States'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => data.session && navigate('/admin', { replace: true }))
  }, [navigate])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authError) setError('邮箱或密码不正确，请重新检查。')
    else navigate('/admin', { replace: true })
  }

  return (
    <div className="login-page">
      <Link to="/" className="back-link"><ArrowLeft /> 返回家长展示端</Link>
      <div className="login-card">
        <div className="login-visual">
          <div className="login-lock"><LockKeyhole /></div>
          <p>PRIVATE WORKSPACE</p>
          <h1>把每一次<br />成长，认真收好。</h1>
          <span>管理员专属工作台</span>
        </div>
        <div className="login-form-wrap">
          <div><small>WELCOME BACK</small><h2>管理员登录</h2><p>登录后录入课程、评价和课堂影像。</p></div>
          {!isSupabaseConfigured ? <SetupNotice compact /> : (
            <form onSubmit={submit}>
              <label><span>邮箱</span><div><Mail /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="你的管理员邮箱" required autoComplete="email" /></div></label>
              <label><span>密码</span><div><KeyRound /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" required autoComplete="current-password" /></div></label>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="admin-primary" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <LockKeyhole />} {loading ? '正在验证…' : '安全登录'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
