import { ArrowRight, BookOpenText, CheckCircle2, ClipboardList, Plus, Sparkles, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Tab = 'overview' | 'students' | 'lessons' | 'homework'

export default function AdminOverview({ classId, termId, onNavigate, onCreateClass, onCreateTerm }: { classId: string; termId: string; onNavigate: (tab: Tab) => void; onCreateClass: () => void; onCreateTerm: () => void }) {
  const [counts, setCounts] = useState({ students: 0, lessons: 0, homework: 0, records: 0 })

  useEffect(() => {
    if (!classId) return
    Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('class_id', classId),
      termId ? supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('term_id', termId) : Promise.resolve({ count: 0 }),
      termId ? supabase.from('homework').select('*', { count: 'exact', head: true }).eq('term_id', termId) : Promise.resolve({ count: 0 }),
      termId ? supabase.from('student_lesson_records').select('*,lessons!inner(term_id)', { count: 'exact', head: true }).eq('lessons.term_id', termId) : Promise.resolve({ count: 0 }),
    ]).then(([students, lessons, homework, records]) => setCounts({ students: students.count ?? 0, lessons: lessons.count ?? 0, homework: homework.count ?? 0, records: records.count ?? 0 }))
  }, [classId, termId])

  if (!classId) return <div className="admin-welcome"><div className="welcome-art"><Sparkles /></div><small>第一步</small><h1>先创建一个班级</h1><p>班级创建后，就可以录入 7 位同学、7 节课程和每天的作业。</p><button className="admin-primary" type="button" onClick={onCreateClass}><Plus /> 创建第一个班级</button></div>
  if (!termId) return <div className="admin-welcome"><div className="welcome-art"><BookOpenText /></div><small>第二步</small><h1>为班级添加学期</h1><p>课程、评价和作业会按学期归档，家长可以回看历史记录。</p><button className="admin-primary" type="button" onClick={onCreateTerm}><Plus /> 添加第一个学期</button></div>

  const cards = [
    { label: '班级学生', value: counts.students, unit: '人', icon: UsersRound, color: 'blue', tab: 'students' as const },
    { label: '本学期课程', value: counts.lessons, unit: '节', icon: BookOpenText, color: 'orange', tab: 'lessons' as const },
    { label: '已完成评价', value: counts.records, unit: '份', icon: CheckCircle2, color: 'green', tab: 'lessons' as const },
    { label: '已布置作业', value: counts.homework, unit: '项', icon: ClipboardList, color: 'pink', tab: 'homework' as const },
  ]

  return (
    <div>
      <div className="admin-page-heading"><div><small>DASHBOARD</small><h1>工作台</h1><p>上午好，今天也来记录孩子们的新进步吧。</p></div><span className="today-pill">成长记录进行中 <i /></span></div>
      <div className="stat-grid">{cards.map((card) => <button type="button" className={`stat-card ${card.color}`} key={card.label} onClick={() => onNavigate(card.tab)}><span><card.icon /></span><div><small>{card.label}</small><strong>{card.value}<em>{card.unit}</em></strong></div><ArrowRight /></button>)}</div>
      <div className="overview-columns">
        <section className="admin-section-card quick-start"><header><div><small>QUICK START</small><h2>接下来可以做什么</h2></div></header><div className="quick-list"><button type="button" onClick={() => onNavigate('students')}><span>01</span><div><strong>录入学生档案</strong><small>添加姓名、头像和入班日期</small></div><ArrowRight /></button><button type="button" onClick={() => onNavigate('lessons')}><span>02</span><div><strong>发布一节课程</strong><small>像写博客一样编辑课堂内容</small></div><ArrowRight /></button><button type="button" onClick={() => onNavigate('lessons')}><span>03</span><div><strong>填写课堂评价</strong><small>打分、评语、照片和视频</small></div><ArrowRight /></button><button type="button" onClick={() => onNavigate('homework')}><span>04</span><div><strong>布置每日作业</strong><small>按班级统一发布练习</small></div><ArrowRight /></button></div></section>
        <section className="admin-section-card rubric-note"><span><Sparkles /></span><small>评价原则</small><h2>不与别人比较，<br />只看自己的成长。</h2><p>五项能力评价源自课堂过程，包括思维、专注、创新、编程与学习动机，单项满分 5 分。</p></section>
      </div>
    </div>
  )
}
