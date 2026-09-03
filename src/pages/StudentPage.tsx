import { ArrowLeft, Calendar, CalendarCheck2, CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, CodeXml, MessageCircleHeart, Sparkles, TrendingUp, UserCheck } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import AbilityRadar from '../components/AbilityRadar'
import GrowthTrend from '../components/GrowthTrend'
import MediaGallery from '../components/MediaGallery'
import PublicShell from '../components/PublicShell'
import RichContent from '../components/RichContent'
import { EmptyState, ErrorState, PageLoader } from '../components/States'
import { abilities, type AbilityScores } from '../lib/abilities'
import { getClass, getLesson, getLessons, getStudent, getStudentRecords, getTerms } from '../lib/data'
import type { ClassGroup, Lesson, LessonRecordWithMedia, Student, Term } from '../lib/types'

type AssessmentLessonScore = { assessmentId:string; lessonId:string; sequence:number; title:string; score:number|null; total:number; attempt:number; submittedAt:string|null }
type AssessmentTrendData = { items:Array<{assessmentId:string;lessonId:string;title:string;score:number;total:number;attempt:number;submitted_at:string}>; lessons:AssessmentLessonScore[]; studentMatched:boolean }
type ParentAttendance = {groups:Array<{classId:string;className:string;present:number;leave:number;items:Array<{date:string;courseTitle:string;status:'present'|'leave';termId:string;termName:string}>}>}

export default function StudentPage({studentIdOverride,parentName,onParentLogout}:{studentIdOverride?:string;parentName?:string;onParentLogout?:()=>void}={}) {
  const { studentId:routeStudentId = '' } = useParams()
  const studentId=studentIdOverride||routeStudentId
  const [student, setStudent] = useState<Student | null>(null)
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null)
  const [terms, setTerms] = useState<Term[]>([])
  const [termId, setTermId] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonDetails,setLessonDetails]=useState<Record<string,Lesson>>({})
  const [lessonDetailLoading,setLessonDetailLoading]=useState('')
  const [records, setRecords] = useState<LessonRecordWithMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeLessonId,setActiveLessonId]=useState('')
  const [assessmentTrend,setAssessmentTrend]=useState<AssessmentTrendData>({items:[],lessons:[],studentMatched:false})
  const [attendance,setAttendance]=useState<ParentAttendance>({groups:[]})

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
    setLessonDetails({})
    getLessons(termId)
      .then(async (lessonList) => {
        setLessons(lessonList)
        setActiveLessonId(lessonList.at(-1)?.id||'')
        setRecords(await getStudentRecords(studentId, lessonList.map((item) => item.id)))
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setContentLoading(false))
  }, [termId, studentId])
  useEffect(()=>{
    if(!activeLessonId||lessonDetails[activeLessonId])return
    let active=true
    setLessonDetailLoading(activeLessonId)
    getLesson(activeLessonId).then(item=>{
      if(active&&item)setLessonDetails(current=>({...current,[item.id]:item}))
    }).catch((reason:Error)=>active&&setError(reason.message)).finally(()=>active&&setLessonDetailLoading(''))
    return()=>{active=false}
  },[activeLessonId,lessonDetails])
  useEffect(()=>{if(!student)return;fetch('/api/parent/assessment-trend',{credentials:'include'}).then(response=>response.ok?response.json():{items:[],lessons:[],studentMatched:false}).then(data=>setAssessmentTrend({items:data.items||[],lessons:data.lessons||[],studentMatched:Boolean(data.studentMatched)})).catch(()=>setAssessmentTrend({items:[],lessons:[],studentMatched:false}))},[studentId,student])
  useEffect(()=>{if(!studentIdOverride||!termId)return;fetch(`/api/parent/attendance?term_id=${encodeURIComponent(termId)}`,{credentials:'include'}).then(response=>response.ok?response.json():{groups:[]}).then(data=>setAttendance({groups:data.groups||[]})).catch(()=>setAttendance({groups:[]}))},[studentIdOverride,termId])

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
  const assessmentBySequence=useMemo(()=>new Map(assessmentTrend.lessons.map(item=>[item.sequence,item])),[assessmentTrend.lessons])
  const lessonScoreRows=useMemo(()=>lessons.map(lesson=>{const result=assessmentBySequence.get(lesson.sequence_no);return {sequence:lesson.sequence_no,label:`第${lesson.sequence_no}课`,title:lesson.title,score:result?.score??null,total:result?.total||100,percent:result?.score==null?null:Math.round(result.score/Math.max(1,result.total)*100),attempt:result?.attempt||0,submittedAt:result?.submittedAt||null}}),[lessons,assessmentBySequence])

  if (loading) return <PublicShell parentName={parentName} onParentLogout={onParentLogout}><div className="page-center"><PageLoader /></div></PublicShell>
  if (error || !student || !classGroup) return <PublicShell parentName={parentName} onParentLogout={onParentLogout}><div className="page-center"><ErrorState message={error || '没有找到这位同学。'} /></div></PublicShell>

  return (
    <PublicShell parentName={parentName} onParentLogout={onParentLogout}>
      <section className="student-hero section-pad">
        <span className="back-link parent-private-label"><ArrowLeft size={17} /> {parentName||'家长'} · 仅查看{student.name}的成长记录</span>
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
            <article className="overview-card assessment-trend-card"><div className="card-title"><span><TrendingUp size={17}/></span><div><small>ASSESSMENT</small><h3>每节课测评成绩变化</h3><p>曲线采用百分制；每节课显示学生最近一次测评成绩。</p></div></div><div className="parent-score-chart"><ResponsiveContainer width="100%" height={260}><LineChart data={lessonScoreRows} margin={{top:18,right:18,left:-10,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke="#dce4df"/><XAxis dataKey="label" tick={{fontSize:10}}/><YAxis domain={[0,100]} ticks={[0,20,40,60,80,100]} tick={{fontSize:10}}/><Tooltip labelFormatter={(_,payload)=>payload?.[0]?.payload?.title||''} formatter={(value)=>[`${value}分`,'最近成绩']}/><Line type="monotone" dataKey="percent" connectNulls stroke="#2f7df6" strokeWidth={4} dot={{r:5,fill:'#fff',stroke:'#2f7df6',strokeWidth:3}} activeDot={{r:7}}/></LineChart></ResponsiveContainer>{!lessonScoreRows.some(item=>item.score!==null)&&<div className="chart-empty-note"><ClipboardCheck/><strong>还没有测评成绩</strong><span>学生完成测评后，成绩曲线会自动出现在这里。</span></div>}</div><div className="lesson-score-summary">{lessonScoreRows.map(item=><div className={item.score===null?'pending':''} key={item.sequence}><span>{String(item.sequence).padStart(2,'0')}</span><div><small>{item.label}</small><strong>{item.score===null?'未测评':`${item.score}/${item.total}`}</strong></div>{item.score!==null&&<em>{item.percent}分</em>}</div>)}</div></article>
            {studentIdOverride&&<details className="overview-card parent-attendance-card"><summary><span><CalendarCheck2/></span><div><small>ATTENDANCE</small><h3>课堂出勤记录</h3><p>点击展开，查看本学期到课和请假日期。</p></div><aside><b>{attendance.groups.reduce((sum,group)=>sum+group.present,0)}</b> 次到课<ChevronDown/></aside></summary><div className="parent-attendance-groups">{attendance.groups.some(group=>group.items.length)?attendance.groups.map(group=><section key={group.classId}><header><div><UserCheck/><span><strong>{group.className}</strong><small>本学期课堂记录</small></span></div><aside><b>{group.present}</b> 到课 <b>{group.leave}</b> 请假</aside></header><div>{group.items.map((item,index)=><article key={`${item.date}-${item.courseTitle}-${index}`}><time>{item.date.slice(5).replace('-','月')}日</time><span><strong>{item.courseTitle}</strong><small>{item.termName}</small></span><em className={item.status}>{item.status==='present'?'已到课':'请假'}</em></article>)}</div></section>):<div className="parent-attendance-empty"><Calendar/><strong>本学期还没有出勤记录</strong><span>老师开始课堂签到后，记录会显示在这里。</span></div>}</div></details>}
          </section>

          <section className="lesson-section section-pad">
            <div className="section-heading">
              <span className="section-number">课程</span>
              <div><p>一节一节，积少成多</p><h2>课堂成长手记</h2></div>
            </div>
            {lessons.length ? (
              <div className="leaf-timeline">
                {[...lessons].reverse().map((lesson, index) => {
                  const record = recordMap.get(lesson.id)
                  const lessonDetail=lessonDetails[lesson.id]
                  return (
                    <article className={`leaf-lesson ${activeLessonId===lesson.id?'open':''}`} key={lesson.id}>
                      <button className="leaf-course-button" onClick={()=>setActiveLessonId(current=>current===lesson.id?'':lesson.id)}><span>{String(lesson.sequence_no).padStart(2,'0')}</span><div><small>{lesson.lesson_date}</small><strong>{lesson.title}</strong></div><aside><em className={assessmentBySequence.get(lesson.sequence_no)?.score==null?'pending':''}>{assessmentBySequence.get(lesson.sequence_no)?.score==null?'未测评':`测评 ${assessmentBySequence.get(lesson.sequence_no)?.score}/${assessmentBySequence.get(lesson.sequence_no)?.total}`}</em>{activeLessonId===lesson.id?<ChevronDown/>:<ChevronRight/>}</aside></button>
                      {activeLessonId===lesson.id&&<div className="lesson-paper">
                        <header className="lesson-header">
                          <div><small>LESSON {String(lesson.sequence_no).padStart(2, '0')} · {lesson.lesson_date}</small><h3>{lesson.title}</h3>{lesson.summary && <p>{lesson.summary}</p>}</div>
                          <span className="lesson-stamp">第 {lessons.length-index} 站</span>
                        </header>
                        <div className={`lesson-assessment-score ${assessmentBySequence.get(lesson.sequence_no)?.score==null?'pending':''}`}><ClipboardCheck/><div><small>本节课测评成绩</small><strong>{assessmentBySequence.get(lesson.sequence_no)?.score==null?'尚未完成测评':`${assessmentBySequence.get(lesson.sequence_no)?.score} / ${assessmentBySequence.get(lesson.sequence_no)?.total} 分`}</strong>{assessmentBySequence.get(lesson.sequence_no)?.attempt?<span>最近一次为第 {assessmentBySequence.get(lesson.sequence_no)?.attempt} 次作答</span>:<span>完成学生端测评后，这里会自动更新</span>}</div>{assessmentBySequence.get(lesson.sequence_no)?.score!=null&&<CheckCircle2/>}</div>
                        <div className="course-content"><h4><CodeXml size={18} /> 这节课学了什么</h4>{lessonDetail?<RichContent html={lessonDetail.content_html} />:<PageLoader label={lessonDetailLoading===lesson.id?'正在打开本节课…':'准备课程内容…'} />}</div>
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
                      </div>}
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
