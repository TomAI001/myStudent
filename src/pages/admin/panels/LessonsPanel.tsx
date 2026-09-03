import { BarChart3, CalendarDays, Globe2, ImagePlus, KeyRound, Pencil, Plus, Search, Sparkles, Trash2, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AbilityScorer from '../../../components/admin/AbilityScorer'
import MediaManager from '../../../components/admin/MediaManager'
import Modal from '../../../components/admin/Modal'
import RichTextEditor from '../../../components/admin/RichTextEditor'
import { EmptyState, PageLoader } from '../../../components/States'
import { emptyScores, type AbilityScores } from '../../../lib/abilities'
import { createLesson, deleteLesson, getLesson, getLessons, getRecord, getStudents, updateLesson, upsertRecord } from '../../../lib/data'
import { adminAction, generateCourseDraft } from '../../../lib/featureApi'
import type { Lesson, LessonRecordWithMedia, Student } from '../../../lib/types'

const emptyLesson = { sequence_no: 1, title: '', lesson_date: '', summary: '', content_html: '' }

export default function LessonsPanel({ classId, termId }: { classId: string; termId: string }) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Lesson | 'new' | null>(null)
  const [form, setForm] = useState(emptyLesson)
  const [saving, setSaving] = useState(false)
  const [evaluationLesson, setEvaluationLesson] = useState<Lesson | null>(null)
  const [aiStyle,setAiStyle]=useState('家长回顾版');const [aiMode,setAiMode]=useState<'replace'|'append'>('replace');const [aiPrompt,setAiPrompt]=useState('');const [aiUrl,setAiUrl]=useState('');const [aiPpt,setAiPpt]=useState<File|null>(null);const [aiBusy,setAiBusy]=useState(false);const [apiKey,setApiKey]=useState('');

  const generateWithAi=async()=>{setAiBusy(true);try{const result=await generateCourseDraft({title:form.title||`第${form.sequence_no}课`,prompt:aiPrompt,style:aiStyle,ppt:aiPpt,url:aiUrl});setForm(current=>({...current,content_html:aiMode==='append'&&current.content_html?`${current.content_html}<hr>${result.content}`:result.content,summary:current.summary||aiPrompt.slice(0,80)}))}catch(reason){window.alert(reason instanceof Error?reason.message:'AI生成失败')}finally{setAiBusy(false)}}
  const saveKey=async()=>{if(!apiKey.trim())return;try{await adminAction('/admin/settings/deepseek','POST',{apiKey});setApiKey('');window.alert('DeepSeek Key 已保存到服务器，网页不会显示明文。')}catch(reason){window.alert(reason instanceof Error?reason.message:'保存失败')}}

  const load = useCallback(async () => {
    if (!termId) return setLessons([])
    setLoading(true)
    const [lessonList, studentList] = await Promise.all([getLessons(termId), getStudents(classId)])
    setLessons(lessonList); setStudents(studentList); setLoading(false)
  }, [classId, termId])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => lessons.filter((item) => item.title.includes(query.trim())), [lessons, query])
  const open = async (lesson: Lesson | 'new') => {
    if (lesson === 'new') {
      setEditing(lesson)
      setForm({ ...emptyLesson, sequence_no: lessons.length + 1, lesson_date: new Date().toISOString().slice(0, 10) })
      return
    }
    try {
      const detail = await getLesson(lesson.id)
      if (!detail) throw new Error('没有找到这节课程。')
      setEditing(detail)
      setForm({ sequence_no: detail.sequence_no, title: detail.title, lesson_date: detail.lesson_date, summary: detail.summary || '', content_html: detail.content_html })
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : '课程正文读取失败。') }
  }

  const saveLesson = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    const payload = { ...form, class_id: classId, term_id: termId }
    try {
      if (editing === 'new') await createLesson(payload)
      else await updateLesson((editing as Lesson).id, payload)
      setEditing(null); await load()
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : '课程保存失败。') }
    finally { setSaving(false) }
  }

  const removeLesson = async (lesson: Lesson) => {
    if (!window.confirm(`确定删除第 ${lesson.sequence_no} 课“${lesson.title}”吗？所有学生评价和课堂影像也会删除。`)) return
    try { await deleteLesson(lesson.id); await load() }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : '课程删除失败。') }
  }

  if (!classId || !termId) return <EmptyState title="请先选择班级和学期" description="课程会按学期进行归档。" />

  return (
    <div>
      <div className="admin-page-heading"><div><small>LESSONS & REVIEWS</small><h1>课程与评价</h1><p>先发布班级课程，再逐一记录每名学生的课堂表现。</p></div><button className="admin-primary" type="button" onClick={() => open('new')}><Plus /> 新建课程</button></div>
      <div className="admin-table-card">
        <div className="table-tools"><div className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索课程主题" /></div><span>本学期共 {lessons.length} 节课</span></div>
        {loading ? <PageLoader label="正在读取课程…" /> : filtered.length ? (
          <table className="admin-table lesson-admin-table"><thead><tr><th>课次</th><th>课程主题</th><th>上课日期</th><th>学生评价</th><th /></tr></thead><tbody>{filtered.map((lesson) => <tr key={lesson.id}><td><span className="lesson-number">{String(lesson.sequence_no).padStart(2, '0')}</span></td><td><div className="lesson-name"><strong>{lesson.title}</strong><small>{lesson.summary || '暂无课程摘要'}</small></div></td><td><span className="date-cell"><CalendarDays /> {lesson.lesson_date}</span></td><td><button type="button" className="review-button" onClick={() => setEvaluationLesson(lesson)}><BarChart3 /> 录入 / 查看评价</button></td><td><div className="row-actions"><button type="button" title="编辑课程" onClick={() => open(lesson)}><Pencil /></button><button type="button" title="删除课程" className="danger" onClick={() => removeLesson(lesson)}><Trash2 /></button></div></td></tr>)}</tbody></table>
        ) : <EmptyState title={query ? '没有匹配的课程' : '本学期还没有课程'} description={query ? '换一个关键词试试。' : '点击右上角“新建课程”，像写博客一样发布课堂内容。'} />}
      </div>

      {editing && <Modal wide title={editing === 'new' ? '新建课程' : `编辑第 ${(editing as Lesson).sequence_no} 课`} subtitle="课程内容按班级统一发布，保存后家长端立即可见。" onClose={() => setEditing(null)}><form className="admin-form" onSubmit={saveLesson}><div className="form-row three"><label>课次<input type="number" min="1" value={form.sequence_no} onChange={(e) => setForm({ ...form, sequence_no: Number(e.target.value) })} required /></label><label className="grow">课程主题<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：让小海龟画出星星" required /></label><label>上课日期<input type="date" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} required /></label></div><label>一句话摘要<input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="用一句话告诉家长这节课的重点" /></label><section className="ai-course-writer"><header><div><Sparkles/><span><strong>AI 自动生成课程内容</strong><small>可读取PPT、公开网页和老师描述，生成后仍可自由修改。</small></span></div></header><div className="ai-key-row"><KeyRound/><input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="首次使用：输入 DeepSeek API Key（保存后不显示）"/><button type="button" onClick={saveKey}>保存密钥</button></div><div className="ai-writer-grid"><label>内容风格<select value={aiStyle} onChange={e=>setAiStyle(e.target.value)}><option>家长回顾版</option><option>课堂教案版</option><option>学生趣味版</option></select></label><label>加入正文方式<select value={aiMode} onChange={e=>setAiMode(e.target.value as 'replace'|'append')}><option value="replace">替换原正文</option><option value="append">追加到正文末尾</option></select></label><label>上传PPT<input type="file" accept=".pptx" onChange={e=>setAiPpt(e.target.files?.[0]||null)}/></label><label className="grow ai-url-input"><span><Globe2/>识别课程网页（选填）</span><input type="url" value={aiUrl} onChange={e=>setAiUrl(e.target.value)} placeholder="https://example.com/course"/></label><label className="grow">老师一句话描述<input value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="例如：今天学习循环、双重循环和函数，完成星光绘图作品"/></label><button type="button" className="admin-primary" disabled={aiBusy||(!aiPrompt&&!aiPpt&&!aiUrl)} onClick={generateWithAi}><Sparkles/>{aiBusy?'正在读取并生成…':'生成并预览'}</button></div></section><RichTextEditor label="课程正文" value={form.content_html} onChange={(content_html) => setForm((current) => ({ ...current, content_html }))} uploadFolder={`lessons/${termId}`} /><div className="form-actions sticky"><button type="button" onClick={() => setEditing(null)}>取消</button><button className="admin-primary" disabled={saving}>{saving ? '保存中…' : '保存并公开'}</button></div></form></Modal>}
      {evaluationLesson && <EvaluationModal lesson={evaluationLesson} students={students} onClose={() => setEvaluationLesson(null)} />}
    </div>
  )
}

function EvaluationModal({ lesson, students, onClose }: { lesson: Lesson; students: Student[]; onClose: () => void }) {
  const [studentId, setStudentId] = useState(students[0]?.id || '')
  const [record, setRecord] = useState<LessonRecordWithMedia | null>(null)
  const [scores, setScores] = useState<AbilityScores>({ ...emptyScores })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    getRecord(studentId, lesson.id).then((item) => {
      setRecord(item)
      if (item) {
        setScores({ thinking_score: item.thinking_score, focus_score: item.focus_score, creativity_score: item.creativity_score, coding_score: item.coding_score, motivation_score: item.motivation_score })
        setComment(item.comment)
      } else { setScores({ ...emptyScores }); setComment('') }
    }).finally(() => setLoading(false))
  }, [studentId, lesson.id])

  const save = async () => {
    if (!studentId) return
    setSaving(true)
    try {
      const saved = await upsertRecord({ lesson_id: lesson.id, student_id: studentId, comment, ...scores })
      setRecord({ ...saved, media: record?.media ?? [] })
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : '保存失败') }
    finally { setSaving(false) }
  }

  return (
    <Modal wide title={`第 ${lesson.sequence_no} 课 · 学生评价`} subtitle={lesson.title} onClose={onClose}>
      {!students.length ? <EmptyState title="请先添加学生" description="有学生档案后才能填写课堂评价。" /> : (
        <div className="evaluation-layout">
          <aside><label>选择学生</label>{students.map((student) => <button type="button" key={student.id} className={studentId === student.id ? 'active' : ''} onClick={() => setStudentId(student.id)}><span>{student.avatar_url ? <img src={student.avatar_url} alt="" /> : <UsersRound />}</span><strong>{student.name}</strong>{studentId === student.id && <i />}</button>)}</aside>
          <div className="evaluation-form">{loading ? <PageLoader label="正在读取评价…" /> : <><div className="evaluation-status"><span className={record ? 'done' : ''}>{record ? '已保存过评价，可继续修改' : '尚未评价，当前默认 3 分'}</span></div><AbilityScorer value={scores} onChange={setScores} /><label className="comment-field">学习评语<textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} placeholder="记录这节课的表现、亮点和下一步建议…" /></label><div className="evaluation-save"><button type="button" className="admin-primary" onClick={save} disabled={saving}>{saving ? '保存中…' : record ? '更新评价' : '保存评价'}</button><small>保存后立即展示给家长</small></div>{record ? <MediaManager recordId={record.id} items={record.media} onChange={(media) => setRecord({ ...record, media })} /> : <div className="media-save-hint"><ImagePlus /><span>先保存评分和评语，再上传照片与视频。</span></div>}</>}</div>
        </div>
      )}
    </Modal>
  )
}
