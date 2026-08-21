import { ArrowLeft, BookOpenCheck, CalendarDays, ChevronRight, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PublicShell from '../components/PublicShell'
import RichContent from '../components/RichContent'
import { EmptyState, ErrorState, PageLoader } from '../components/States'
import { getClass, getHomework, getStudents, getTerms } from '../lib/data'
import type { ClassGroup, Homework, Student, Term } from '../lib/types'

const cloudPositions = [
  { left: '8%', top: '18%', rotate: '-5deg' },
  { left: '52%', top: '8%', rotate: '4deg' },
  { left: '24%', top: '50%', rotate: '2deg' },
  { left: '64%', top: '47%', rotate: '-4deg' },
  { left: '5%', top: '72%', rotate: '3deg' },
  { left: '45%', top: '76%', rotate: '-2deg' },
  { left: '73%', top: '70%', rotate: '5deg' },
]

export default function ClassPage() {
  const { classId = '' } = useParams()
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [homework, setHomework] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getClass(classId), getStudents(classId), getTerms(classId)])
      .then(async ([group, studentList, termList]) => {
        setClassGroup(group)
        setStudents(studentList)
        setTerms(termList)
        if (termList[0]) setHomework(await getHomework(termList[0].id))
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false))
  }, [classId])

  const activeTerm = useMemo(() => terms[0], [terms])

  if (loading) return <PublicShell><div className="page-center"><PageLoader /></div></PublicShell>
  if (error || !classGroup) return <PublicShell><div className="page-center"><ErrorState message={error || '没有找到这个班级。'} /></div></PublicShell>

  return (
    <PublicShell>
      <section className="class-hero section-pad">
        <Link to="/" className="back-link"><ArrowLeft size={17} /> 返回班级列表</Link>
        <div className="class-title-row">
          <div>
            <span className="eyebrow"><Sparkles size={15} /> {activeTerm?.name || '成长进行中'}</span>
            <h1>{classGroup.name}</h1>
            <p>{classGroup.description || '点击一个名字，看看这段时间发生了哪些闪闪发光的故事。'}</p>
          </div>
          <div className="class-stat"><strong>{students.length}</strong><span>位成长中的<br />小小程序员</span></div>
        </div>
      </section>

      <section className="name-cloud-section section-pad">
        <div className="cloud-intro"><span>请点击名字</span><h2>今天，想看谁的成长？</h2></div>
        {students.length ? (
          <div className="name-cloud" style={{ '--count': students.length } as React.CSSProperties}>
            <div className="cloud-core"><span>一起</span><strong>向上生长</strong></div>
            {students.map((student, index) => {
              const position = cloudPositions[index % cloudPositions.length]
              return (
                <Link
                  to={`/student/${student.id}`}
                  className={`floating-name color-${index % 5}`}
                  key={student.id}
                  style={{ ...position, '--float-delay': `${index * -0.7}s` } as React.CSSProperties}
                >
                  {student.avatar_url ? <img src={student.avatar_url} alt="" /> : <span>{student.name.slice(-1)}</span>}
                  <strong>{student.name}</strong><ChevronRight size={16} />
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyState title="同学们还没有集合" description="管理员添加学生后，名字会像小星球一样出现在这里。" />
        )}
      </section>

      <section className="homework-section section-pad">
        <div className="section-heading">
          <span className="section-number">作业</span>
          <div><p>{activeTerm?.name || '本学期'}</p><h2>每日练习补给站</h2></div>
        </div>
        {homework.length ? (
          <div className="homework-list">
            {homework.map((item, index) => (
              <article className="homework-card" key={item.id}>
                <div className="homework-date"><CalendarDays size={18} /><span>{item.assigned_date.slice(5).replace('-', '.')}</span></div>
                <div><small>练习 {String(homework.length - index).padStart(2, '0')}</small><h3>{item.title}</h3><RichContent html={item.content_html} /></div>
                <BookOpenCheck className="homework-mark" />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="今天没有新作业" description="尽情复习课堂作品，也别忘了休息和运动。" />
        )}
      </section>
    </PublicShell>
  )
}
