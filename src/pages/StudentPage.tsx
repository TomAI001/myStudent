import { ArrowLeft, Calendar, ChevronDown, CodeXml, MessageCircleHeart, Sparkles, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AbilityRadar from '../components/AbilityRadar'
import GrowthTrend from '../components/GrowthTrend'
import MediaGallery from '../components/MediaGallery'
import PublicShell from '../components/PublicShell'
import RichContent from '../components/RichContent'
import { EmptyState, ErrorState, PageLoader } from '../components/States'
import { abilities, type AbilityScores } from '../lib/abilities'
import { getClass, getLessons, getStudent, getStudentRecords, getTerms } from '../lib/data'
import type { ClassGroup, Lesson, LessonRecordWithMedia, Student, Term } from '../lib/types'

export default function StudentPage() {
  const { studentId = '' } = useParams()
  const [student, setStudent] = useState<Student | null>(null)
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null)
  const [terms, setTerms] = useState<Term[]>([])
  const [termId, setTermId] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [records, setRecords] = useState<LessonRecordWithMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getStudent(studentId)
      .then(async (person) => {
        if (!person) return
        setStudent(person)
        const [group, termList] = await Promise.all([getClass(person.class_id), getTerms(person.class_id)])
        setClassGroup(group)
        setTerms(termList)
        setTermId(termList[0]?.id || '')
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [studentId])

  useEffect(() => {
    if (!termId) return
    setContentLoading(true)
    getLessons(termId)
      .then(async (lessonList) => {
        setLessons(lessonList)
        setRecords(await getStudentRecords(studentId, lessonList.map((item) => item.id)))
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setContentLoading(false))
  }, [termId, studentId])

  const recordMap = useMemo(() => new Map(records.map((record) => [record.lesson_id, record])), [records])
  const averages = useMemo<AbilityScores | null>(() => {
    if (!records.length) return null
    return Object.fromEntries(
      abilities.map((ability) => [
        ability.key,
        Number((records.reduce((sum, record) => sum + record[ability.key], 0) / records.length).toFixed(1)),
      ]),
    ) as unknown as AbilityScores
  }, [records])

  if (loading) return <PublicShell><div className="page-center"><PageLoader /></div></PublicShell>
  if (error || !student || !classGroup) return <PublicShell><div className="page-center"><ErrorState message={error || '没有找到这位同学。'} /></div></PublicShell>

  return (
    <PublicShell>
      <section className="student-hero section-pad">
        <Link to={`/class/${student.class_id}`} className="back-link"><ArrowLeft size={17} /> 返回{classGroup.name}</Link>
        <div className="student-profile">
          <div className="student-avatar">
            {student.avatar_url ? <img src={student.avatar_url} alt={`${student.name}的头像`} /> : <span>{student.name.slice(-1)}</span>}
            <i><Sparkles size={18} /></i>
          </div>
          <div className="student-title">
            <p>HELLO, LITTLE CODER!</p>
            <h1>{student.name}<span>的成长星球</span></h1>
            <div className="profile-meta">
              <span><CodeXml size={16} /> {classGroup.name}</span>
              <span><Calendar size={16} /> {student.joined_on} 加入</span>
            </div>
          </div>
          <label className="term-select">查看学期<ChevronDown size={16} /><select value={termId} onChange={(event) => setTermId(event.target.value)}>{terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}</select></label>
        </div>
      </section>

      {contentLoading ? <div className="page-center"><PageLoader label="正在整理这一学期…" /></div> : (
        <>
          <section className="overview-section section-pad">
            <div className="section-heading">
              <span className="section-number">总览</span>
              <div><p>不和别人比，只和昨天的自己比</p><h2>这一学期的成长轨迹</h2></div>
            </div>
            {averages ? (
              <div className="overview-grid">
                <article className="overview-card radar-card">
                  <div className="card-title"><span><Sparkles size={17} /></span><div><small>AVERAGE</small><h3>五项能力平均分</h3></div></div>
                  <AbilityRadar record={averages} />
                </article>
                <article className="overview-card trend-card">
                  <div className="card-title"><span><TrendingUp size={17} /></span><div><small>GROWTH</small><h3>每节课的变化</h3></div></div>
                  <GrowthTrend lessons={lessons} records={records} />
                </article>
              </div>
            ) : <EmptyState title="成长图谱正在绘制" description="老师完成第一节课的评价后，这里会出现雷达图与趋势。" />}
          </section>

          <section className="lesson-section section-pad">
            <div className="section-heading">
              <span className="section-number">课程</span>
              <div><p>一节一节，积少成多</p><h2>课堂成长手记</h2></div>
            </div>
            {lessons.length ? (
              <div className="lesson-timeline">
                {lessons.map((lesson, index) => {
                  const record = recordMap.get(lesson.id)
                  return (
                    <article className="lesson-entry" key={lesson.id}>
                      <div className="timeline-pin"><span>{String(lesson.sequence_no).padStart(2, '0')}</span></div>
                      <div className="lesson-paper">
                        <header className="lesson-header">
                          <div><small>LESSON {String(lesson.sequence_no).padStart(2, '0')} · {lesson.lesson_date}</small><h3>{lesson.title}</h3>{lesson.summary && <p>{lesson.summary}</p>}</div>
                          <span className="lesson-stamp">第 {index + 1} 站</span>
                        </header>
                        <div className="course-content"><h4><CodeXml size={18} /> 这节课学了什么</h4><RichContent html={lesson.content_html} /></div>
                        {record ? (
                          <div className="student-record">
                            <div className="record-grid">
                              <div className="teacher-note"><h4><MessageCircleHeart size={18} /> 老师想对你说</h4><p>{record.comment || '认真完成了今天的课堂任务，继续保持！'}</p></div>
                              <div className="lesson-radar"><h4>本节能力图谱</h4><AbilityRadar record={record} compact /></div>
                            </div>
                            <div className="score-chips">{abilities.map((ability) => <span key={ability.key} style={{ '--ability-color': ability.color } as React.CSSProperties}>{ability.shortName}<strong>{record[ability.key]}</strong></span>)}</div>
                            <MediaGallery items={record.media} />
                          </div>
                        ) : <div className="record-pending">本节个人成长记录正在整理中</div>}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : <EmptyState title="课程即将开始" description="老师发布第一节课后，课堂手记会出现在这里。" />}
          </section>
        </>
      )}
    </PublicShell>
  )
}
