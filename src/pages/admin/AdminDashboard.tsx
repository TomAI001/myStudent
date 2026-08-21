import { BookOpenText, ChevronDown, ClipboardList, ExternalLink, GraduationCap, LayoutDashboard, LogOut, Plus, Settings, UsersRound } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '../../components/admin/Modal'
import { PageLoader } from '../../components/States'
import { getClasses, getTerms } from '../../lib/data'
import { supabase } from '../../lib/supabase'
import type { ClassGroup, Term } from '../../lib/types'
import AdminOverview from './panels/AdminOverview'
import StudentsPanel from './panels/StudentsPanel'
import LessonsPanel from './panels/LessonsPanel'
import HomeworkPanel from './panels/HomeworkPanel'

type Tab = 'overview' | 'students' | 'lessons' | 'homework'

const navItems = [
  { id: 'overview' as const, label: '工作台', icon: LayoutDashboard },
  { id: 'students' as const, label: '学生档案', icon: UsersRound },
  { id: 'lessons' as const, label: '课程与评价', icon: BookOpenText },
  { id: 'homework' as const, label: '每日作业', icon: ClipboardList },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [classes, setClasses] = useState<ClassGroup[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [classId, setClassId] = useState('')
  const [termId, setTermId] = useState('')
  const [setupModal, setSetupModal] = useState<'class' | 'term' | null>(null)
  const [classForm, setClassForm] = useState({ name: '', description: '' })
  const [termForm, setTermForm] = useState({ name: '', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)

  const loadClasses = useCallback(async () => {
    const list = await getClasses()
    setClasses(list)
    setClassId((current) => current || list[0]?.id || '')
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
      if (!data.session) navigate('/admin/login', { replace: true })
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) navigate('/admin/login', { replace: true })
    })
    return () => data.subscription.unsubscribe()
  }, [navigate])

  useEffect(() => { if (session) loadClasses() }, [session, loadClasses])

  useEffect(() => {
    if (!classId) { setTerms([]); setTermId(''); return }
    getTerms(classId).then((list) => {
      setTerms(list)
      setTermId((current) => list.some((item) => item.id === current) ? current : list[0]?.id || '')
    })
  }, [classId])

  const createClass = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    const { error } = await supabase.from('classes').insert(classForm)
    setSaving(false)
    if (error) return window.alert(error.message)
    setClassForm({ name: '', description: '' }); setSetupModal(null); await loadClasses()
  }

  const createTerm = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    const { error } = await supabase.from('terms').insert({ ...termForm, class_id: classId })
    setSaving(false)
    if (error) return window.alert(error.message)
    setTermForm({ name: '', start_date: '', end_date: '' }); setSetupModal(null)
    const list = await getTerms(classId); setTerms(list); setTermId(list[0]?.id || '')
  }

  if (authLoading || !session) return <div className="admin-loading"><PageLoader label="正在进入工作台…" /></div>

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span><GraduationCap /></span><div><strong>成长记录</strong><small>ADMIN CONSOLE</small></div></div>
        <nav>{navItems.map((item) => <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.icon /><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-bottom"><Link to="/" target="_blank"><ExternalLink /> 查看家长端</Link><button type="button" onClick={() => supabase.auth.signOut()}><LogOut /> 退出登录</button></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="workspace-selectors">
            <label><span>当前班级</span><div><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">请选择班级</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown /></div></label>
            <button type="button" className="small-add" onClick={() => setSetupModal('class')}><Plus /> 班级</button>
            <label><span>当前学期</span><div><select value={termId} onChange={(event) => setTermId(event.target.value)} disabled={!classId}><option value="">请选择学期</option>{terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown /></div></label>
            <button type="button" className="small-add" disabled={!classId} onClick={() => setSetupModal('term')}><Plus /> 学期</button>
          </div>
          <div className="admin-user"><span>{session.user.email?.slice(0, 1).toUpperCase()}</span><div><strong>管理员</strong><small>{session.user.email}</small></div><Settings /></div>
        </header>
        <main className="admin-content">
          {tab === 'overview' && <AdminOverview classId={classId} termId={termId} onNavigate={setTab} onCreateClass={() => setSetupModal('class')} onCreateTerm={() => setSetupModal('term')} />}
          {tab === 'students' && <StudentsPanel classId={classId} />}
          {tab === 'lessons' && <LessonsPanel classId={classId} termId={termId} />}
          {tab === 'homework' && <HomeworkPanel classId={classId} termId={termId} />}
        </main>
      </div>

      {setupModal === 'class' && <Modal title="新建班级" subtitle="班级是学生、课程和作业的共同归属。" onClose={() => setSetupModal(null)}><form className="admin-form" onSubmit={createClass}><label>班级名称<input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="例如：Python 创意编程班" required /></label><label>班级介绍<textarea value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} placeholder="写一句给家长看的班级介绍" /></label><div className="form-actions"><button type="button" onClick={() => setSetupModal(null)}>取消</button><button className="admin-primary" disabled={saving}>保存班级</button></div></form></Modal>}
      {setupModal === 'term' && <Modal title="新建学期" subtitle="每个学期拥有独立的课程、评价和作业。" onClose={() => setSetupModal(null)}><form className="admin-form" onSubmit={createTerm}><label>学期名称<input value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} placeholder="例如：2026 暑期班" required /></label><div className="form-row"><label>开始日期<input type="date" value={termForm.start_date} onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })} required /></label><label>结束日期<input type="date" value={termForm.end_date} onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })} required /></label></div><div className="form-actions"><button type="button" onClick={() => setSetupModal(null)}>取消</button><button className="admin-primary" disabled={saving}>保存学期</button></div></form></Modal>}
    </div>
  )
}
