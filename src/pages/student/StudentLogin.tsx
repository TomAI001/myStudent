import { ArrowLeft, Gamepad2, KeyRound, Rocket, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStudentSession, loginStudent } from '../../lib/studentPortal'

export default function StudentLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getStudentSession().then((session) => session && navigate('/student/app', { replace: true }))
  }, [navigate])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true); setError('')
    try {
      await loginStudent(username, password)
      navigate('/student/app', { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时无法登录，请稍后再试。')
    } finally { setLoading(false) }
  }

  return (
    <div className="quest-login-page">
      <Link to="/" className="quest-back"><ArrowLeft /> 返回成长记录</Link>
      <div className="quest-login-orbit orbit-one" /><div className="quest-login-orbit orbit-two" />
      <main className="quest-login-card">
        <section className="quest-login-story">
          <div className="quest-logo"><Gamepad2 /><span>CODE<br />QUEST</span></div>
          <p className="quest-kicker">咱们班的成长记录 · 学生端</p>
          <h1>准备好，开启<br /><em>编程冒险！</em></h1>
          <p className="quest-story-copy">每一次思考，都会点亮新的地图。登录后进入你的班级，完成课堂挑战并和伙伴一起成长。</p>
          <div className="quest-pixel-scene" aria-hidden="true"><span className="pixel-cloud cloud-a" /><span className="pixel-cloud cloud-b" /><Rocket /><i className="pixel-star star-a">✦</i><i className="pixel-star star-b">✦</i></div>
        </section>
        <section className="quest-login-form">
          <div><span className="quest-step">PLAYER LOGIN</span><h2>学生登录</h2><p>输入老师为你创建的账号和密码</p></div>
          <form onSubmit={submit}>
            <label><span>学生账号</span><div><UserRound /><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入学生账号" autoComplete="username" required /></div></label>
            <label><span>登录密码</span><div><KeyRound /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入登录密码" autoComplete="current-password" required /></div></label>
            {error && <p className="quest-form-error">{error}</p>}
            <button type="submit" className="quest-launch" disabled={loading}><span>{loading ? '正在验证…' : '进入冒险大厅'}</span><Rocket /></button>
          </form>
          <div className="quest-demo-tip"><strong>体验账号</strong><span>student01</span><b>/</b><span>123456</span></div>
        </section>
      </main>
    </div>
  )
}
