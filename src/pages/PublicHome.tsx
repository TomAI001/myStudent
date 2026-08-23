import { ArrowRight, BookHeart, Code2, Orbit, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicShell from '../components/PublicShell'
import { EmptyState, ErrorState, PageLoader, SetupNotice } from '../components/States'
import { getClasses } from '../lib/data'
import { isSupabaseConfigured } from '../lib/supabase'
import type { ClassGroup } from '../lib/types'

export default function PublicHome() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    getClasses().then(setClasses).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false))
  }, [])

  const openClass = () => {
    const firstClass = classes[0]
    if (firstClass) {
      navigate(`/class/${firstClass.id}`)
      return
    }
    document.getElementById('choose-class')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <PublicShell>
      <section className="home-hero">
        <div className="hero-orbit orbit-one"><span /></div>
        <div className="hero-orbit orbit-two"><span /></div>
        <span className="doodle doodle-code">{'</>'}</span>
        <span className="doodle doodle-star">✦</span>
        <div className="hero-copy">
          <span className="eyebrow"><Sparkles size={16} /> 编程成长档案</span>
          <h1>看见每一次<br /><em>“我会了！”</em></h1>
          <p>课程不只留下知识，也留下孩子思考、专注、创造与坚持的每一个瞬间。</p>
          <button type="button" className="primary-button" onClick={openClass}>选择班级 <ArrowRight size={18} /></button>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <div className="code-card code-card-one"><Code2 /><span>想一想</span></div>
          <div className="growth-planet">
            <span className="planet-face">⌁</span>
            <i className="planet-ring" />
            <span className="planet-flag">今天又进步啦</span>
          </div>
          <div className="code-card code-card-two"><BookHeart /><span>试一试</span></div>
        </div>
      </section>

      <section className="class-picker section-pad" id="choose-class">
        <div className="section-heading">
          <span className="section-number">01</span>
          <div><p>找到我们</p><h2>选择班级，开启成长记录</h2></div>
        </div>
        {!isSupabaseConfigured ? (
          <SetupNotice />
        ) : loading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState message={error} />
        ) : classes.length ? (
          <div className="class-grid">
            {classes.map((item, index) => (
              <Link to={`/class/${item.id}`} className="class-card" key={item.id} style={{ '--delay': `${index * 90}ms` } as React.CSSProperties}>
                <span className="class-card-icon"><Orbit /></span>
                <small>CLASS {String(index + 1).padStart(2, '0')}</small>
                <h3>{item.name}</h3>
                <p>{item.description || '一起写代码，一起把想法变成作品。'}</p>
                <span className="text-link">进入班级 <ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="班级正在准备中" description="管理员录入第一个班级后，就会显示在这里。" />
        )}
      </section>

      <section className="value-strip">
        <p>每节课 · 一份记录</p><span>✦</span><p>五项能力 · 持续成长</p><span>✦</span><p>照片视频 · 珍藏瞬间</p>
      </section>
    </PublicShell>
  )
}
