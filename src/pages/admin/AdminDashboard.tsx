import { BookOpenText, CalendarCheck2, ChevronDown, ClipboardList, ExternalLink, Gamepad2, GraduationCap, LayoutDashboard, LogOut, MessageSquareText, Plus, Settings, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '../../components/admin/Modal'
import { PageLoader } from '../../components/States'
import { getAdminSession, logoutAdmin, type AdminSession } from '../../lib/authApi'
import { createClass as createClassOnServer, createTerm as createTermOnServer, getClasses, getTerms } from '../../lib/data'
import type { ClassGroup, Term } from '../../lib/types'
import AdminOverview from './panels/AdminOverview'
import StudentsPanel from './panels/StudentsPanel'
import LessonsPanel from './panels/LessonsPanel'
import HomeworkPanel from './panels/HomeworkPanelV2'
import StudentPortalPanel from './panels/StudentPortalPanelV2'
import AttendancePanel from './panels/AttendancePanel'
import ParentFeedbackPanel from './panels/ParentFeedbackPanel'

type Tab = 'overview' | 'students' | 'attendance' | 'lessons' | 'homework' | 'parent_feedback' | 'student_portal'

const navItems = [
  { id: 'overview' as const, label: '工作台', icon: LayoutDashboard },
  { id: 'students' as const, label: '学生档案', icon: UsersRound },
  { id: 'attendance' as const, label: '课堂签到', icon: CalendarCheck2 },
  { id: 'lessons' as const, label: '课程与评价', icon: BookOpenText },
  { id: 'homework' as const, label: '每日作业', icon: ClipboardList },
  { id: 'parent_feedback' as const, label: '家长反馈', icon: MessageSquareText },
  { id: 'student_portal' as const, label: '学生端管理', icon: Gamepad2 },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState<AdminSession | null>(null)
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
    getAdminSession().then((next) => {
      setSession(next)
      setAuthLoading(false)
      if (!next) navigate('/admin/login', { replace: true })
    })
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
    try {
      await createClassOnServer(classForm)
      setClassForm({ name: '', description: '' }); setSetupModal(null); await loadClasses()
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : '班级保存失败。') }
    finally { setSaving(false) }
  }

  const createTerm = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    try {
      await createTermOnServer({ ...termForm, class_id: classId })
      setTermForm({ name: '', start_date: '', end_date: '' }); setSetupModal(null)
      const list = await getTerms(classId); setTerms(list); setTermId(list[0]?.id || '')
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : '学期保存失败。') }
    finally { setSaving(false) }
  }

  if (authLoading || !session) return <div className="admin-loading"><PageLoader label="正在进入工作台…" /></div>

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand"><span><GraduationCap /></span><div><strong>成长记录</strong><small>ADMIN CONSOLE</small></div></div>
        <nav>{navItems.map((item) => <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.icon /><span>{item.label}</span></button>)}</nav>
        <div className="sidebar-bottom"><Link to="/" target="_blank"><ExternalLink /> 查看家长端</Link><button type="button" onClick={async () => { await logoutAdmin(); navigate('/admin/login', { replace: true }) }}><LogOut /> 退出登录</button></div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="workspace-selectors">
            <label><span>当前班级</span><div><select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">请选择班级</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown /></div></label>
            <button type="button" className="small-add" onClick={() => setSetupModal('class')}><Plus /> 班级</button>
            <label><span>当前学期</span><div><select value={termId} onChange={(event) => setTermId(event.target.value)} disabled={!classId}><option value="">请选择学期</option>{terms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown /></div></label>
            <button type="button" className="small-add" disabled={!classId} onClick={() => setSetupModal('term')}><Plus /> 学期</button>
          </div>
          <div className="admin-user"><span>{session.email.slice(0, 1).toUpperCase()}</span><div><strong>管理员</strong><small>{session.email}</small></div><Settings /></div>
        </header>
        <main className="admin-content">
          {tab === 'overview' && <AdminOverview classId={classId} termId={termId} onNavigate={setTab} onCreateClass={() => setSetupModal('class')} onCreateTerm={() => setSetupModal('term')} />}
          {tab === 'students' && <StudentsPanel classId={classId} />}
          {tab === 'attendance' && <AttendancePanel classId={classId} termId={termId} className={classes.find(item=>item.id===classId)?.name||''} termName={terms.find(item=>item.id===termId)?.name||''} />}
          {tab === 'lessons' && <LessonsPanel classId={classId} termId={termId} />}
          {tab === 'homework' && <HomeworkPanel classId={classId} termId={termId} />}
          {tab === 'parent_feedback' && <ParentFeedbackPanel classId={classId} />}
          {tab === 'student_portal' && <StudentPortalPanel classId={classId} />}
        </main>
      </div>

      {setupModal === 'class' && <Modal title="新建班级" subtitle="班级是学生、课程和作业的共同归属。" onClose={() => setSetupModal(null)}><form className="admin-form" onSubmit={createClass}><label>班级名称<input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="例如：Python 创意编程班" required /></label><label>班级介绍<textarea value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} placeholder="写一句给家长看的班级介绍" /></label><div className="form-actions"><button type="button" onClick={() => setSetupModal(null)}>取消</button><button className="admin-primary" disabled={saving}>保存班级</button></div></form></Modal>}
      {setupModal === 'term' && <Modal title="新建学期" subtitle="每个学期拥有独立的课程、评价和作业。" onClose={() => setSetupModal(null)}><form className="admin-form" onSubmit={createTerm}><label>学期名称<input value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} placeholder="例如：2026 暑期班" required /></label><div className="form-row"><label>开始日期<input type="date" value={termForm.start_date} onChange={(e) => setTermForm({ ...termForm, start_date: e.target.value })} required /></label><label>结束日期<input type="date" value={termForm.end_date} onChange={(e) => setTermForm({ ...termForm, end_date: e.target.value })} required /></label></div><div className="form-actions"><button type="button" onClick={() => setSetupModal(null)}>取消</button><button className="admin-primary" disabled={saving}>保存学期</button></div></form></Modal>}
    </div>
  )
}
