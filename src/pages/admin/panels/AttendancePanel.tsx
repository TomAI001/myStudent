import { CalendarCheck2, Check, ChevronDown, Download, History, Play, RefreshCw, RotateCcw, Square, UserCheck, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState, PageLoader } from '../../../components/States'
import { getStudents } from '../../../lib/data'
import { adminAction, downloadAttendance, getAdminFeatureState, getAttendance, type AttendanceSession, type AttendanceStatus, type FeatureCourse } from '../../../lib/featureApi'

const labels:Record<AttendanceStatus,string>={unmarked:'未签到',present:'已到课',leave:'请假'}

export default function AttendancePanel({classId,termId,className,termName}:{classId:string;termId:string;className:string;termName:string}) {
  const [sessions,setSessions]=useState<AttendanceSession[]>([])
  const [courses,setCourses]=useState<FeatureCourse[]>([])
  const [loading,setLoading]=useState(false)
  const [saving,setSaving]=useState(false)
  const [courseChoice,setCourseChoice]=useState('')
  const [customTitle,setCustomTitle]=useState('')
  const [selectedId,setSelectedId]=useState('')
  const today=new Date().toLocaleDateString('sv-SE')

  const load=useCallback(async(silent=false)=>{
    if(!classId||!termId){setSessions([]);return}
    if(!silent)setLoading(true)
    try{const [attendance,features]=await Promise.all([getAttendance(classId,termId),getAdminFeatureState(classId)]);setSessions(attendance.sessions);setCourses(features.courses);setSelectedId(current=>attendance.sessions.some(item=>item.id===current)?current:attendance.sessions[0]?.id||'')}
    catch(reason){if(!silent)window.alert(reason instanceof Error?reason.message:'签到数据读取失败')}
    finally{if(!silent)setLoading(false)}
  },[classId,termId])
  useEffect(()=>{load()},[load])
  useEffect(()=>{if(!sessions.some(item=>item.state==='open'))return;const timer=window.setInterval(()=>load(true),8000);return()=>window.clearInterval(timer)},[sessions,load])

  const todaySession=sessions.find(item=>item.date===today)
  const selected=sessions.find(item=>item.id===selectedId)||todaySession||sessions[0]
  const summary=useMemo(()=>{
    const rows=new Map<string,{name:string;present:number;leave:number;unmarked:number}>()
    sessions.forEach(session=>session.records.forEach(record=>{const row=rows.get(record.studentKey)||{name:record.studentName,present:0,leave:0,unmarked:0};row[record.status]+=1;rows.set(record.studentKey,row)}))
    return [...rows.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'))
  },[sessions])

  const start=async()=>{
    const selectedCourse=courses.find(item=>item.id===courseChoice)
    const title=courseChoice==='custom'?customTitle.trim():selectedCourse?.title||''
    if(!title)return window.alert('请选择已有课件，或填写临时课程名称。')
    setSaving(true)
    try{
      const [students,features]=await Promise.all([getStudents(classId),getAdminFeatureState(classId)])
      const roster=students.map(student=>{const account=features.accounts.find(item=>item.studentId===student.id)||features.accounts.find(item=>item.studentName===student.name);return{studentId:student.id,studentName:student.name,accountId:account?.id||null}})
      const result=await adminAction('/admin/attendance/sessions','POST',{classId,className,termId,termName,date:today,courseId:selectedCourse?.id||null,courseTitle:title,roster})
      await load(true);setSelectedId(result.session.id)
    }catch(reason){window.alert(reason instanceof Error?reason.message:'开始上课失败')}
    finally{setSaving(false)}
  }
  const stateChange=async(session:AttendanceSession,state:'open'|'closed')=>{setSaving(true);try{await adminAction(`/admin/attendance/sessions/${session.id}/state`,'PATCH',{state});await load(true)}catch(reason){window.alert(reason instanceof Error?reason.message:'课堂状态修改失败')}finally{setSaving(false)}}
  const statusChange=async(session:AttendanceSession,studentKey:string,status:AttendanceStatus)=>{try{const result=await adminAction(`/admin/attendance/sessions/${session.id}/records/${encodeURIComponent(studentKey)}`,'PATCH',{status});setSessions(current=>current.map(item=>item.id===session.id?result.session:item))}catch(reason){window.alert(reason instanceof Error?reason.message:'签到修改失败')}}
  const bulk=async(session:AttendanceSession,status:AttendanceStatus)=>{try{const result=await adminAction(`/admin/attendance/sessions/${session.id}/bulk`,'POST',{status});setSessions(current=>current.map(item=>item.id===session.id?result.session:item))}catch(reason){window.alert(reason instanceof Error?reason.message:'批量修改失败')}}

  if(!classId||!termId)return <EmptyState title="请先选择班级和学期" description="课堂签到按班级和学期分别统计。"/>
  return <div className="attendance-page">
    <div className="admin-page-heading"><div><small>ATTENDANCE</small><h1>课堂签到</h1><p>老师开始上课后，学生登录或继续操作会自动显示“已到课”。</p></div><button className="admin-secondary" type="button" onClick={()=>downloadAttendance(classId,termId,className,termName)}><Download/>导出签到表</button></div>
    <section className={`attendance-launch ${todaySession?.state==='open'?'is-live':''}`}>
      <div className="attendance-live-icon">{todaySession?.state==='open'?<UserCheck/>:<CalendarCheck2/>}</div>
      <div className="attendance-launch-copy"><small>{todaySession?.state==='open'?'CLASS IN PROGRESS':'TODAY'}</small><h2>{todaySession?todaySession.courseTitle:'创建今天的课堂签到'}</h2><p>{todaySession?`${todaySession.date} · ${todaySession.state==='open'?'正在上课，学生操作将自动签到':'本节课已经结束，可重新打开继续签到'}`:'每个班级每天只能创建一次签到。'}</p></div>
      {!todaySession&&<div className="attendance-course-picker"><label>本节课程<div><select value={courseChoice} onChange={event=>setCourseChoice(event.target.value)}><option value="">请选择已有课件</option>{courses.map(course=><option value={course.id} key={course.id}>第{course.sequence}课 · {course.title}</option>)}<option value="custom">临时课程名称</option></select><ChevronDown/></div></label>{courseChoice==='custom'&&<label>临时课程<input value={customTitle} onChange={event=>setCustomTitle(event.target.value)} placeholder="例如：循环综合复习" maxLength={160}/></label>}</div>}
      {!todaySession?<button className="attendance-start" disabled={saving} onClick={start}><Play/>{saving?'创建中…':'开始上课'}</button>:todaySession.state==='open'?<button className="attendance-end" disabled={saving} onClick={()=>stateChange(todaySession,'closed')}><Square/>结束上课</button>:<button className="attendance-reopen" disabled={saving} onClick={()=>stateChange(todaySession,'open')}><RotateCcw/>重新打开</button>}
    </section>
    {loading?<PageLoader label="正在读取签到表…"/>:sessions.length?<>
      <section className="attendance-workspace">
        <aside className="attendance-history"><header><History/><div><strong>课堂记录</strong><small>本学期 {sessions.length} 次</small></div></header>{sessions.map(session=><button key={session.id} className={selected?.id===session.id?'active':''} onClick={()=>setSelectedId(session.id)}><span>{session.date.slice(5).replace('-','/')}</span><div><strong>{session.courseTitle}</strong><small>{session.counts.present}到课 · {session.counts.leave}请假 · {session.counts.unmarked}未签到</small></div><em className={session.state}>{session.state==='open'?'进行中':'已结束'}</em></button>)}</aside>
        {selected&&<div className="attendance-roster"><header><div><small>{selected.date} · {selected.state==='open'?'课堂进行中':'历史记录可继续修改'}</small><h2>{selected.courseTitle}</h2></div><div className="attendance-bulk"><button onClick={()=>bulk(selected,'present')}><Check/>全员已到课</button><button onClick={()=>bulk(selected,'unmarked')}><RefreshCw/>全部重置</button></div></header><div className="attendance-counts"><span><b>{selected.records.length}</b>名单人数</span><span className="present"><b>{selected.counts.present}</b>已到课</span><span className="leave"><b>{selected.counts.leave}</b>请假</span><span><b>{selected.counts.unmarked}</b>未签到</span></div><div className="attendance-table-wrap"><table><thead><tr><th>学生姓名</th><th>自动状态</th><th>老师标记</th></tr></thead><tbody>{selected.records.map(record=><tr key={record.studentKey}><td><span className="attendance-avatar">{record.studentName.slice(-1)}</span><strong>{record.studentName}</strong></td><td><span className={`attendance-status ${record.status}`}>{labels[record.status]}{record.source==='auto'&&<small>学生端自动</small>}</span></td><td><div className="attendance-status-actions">{(['unmarked','present','leave'] as AttendanceStatus[]).map(status=><button key={status} className={record.status===status?'active '+status:''} onClick={()=>statusChange(selected,record.studentKey,status)}>{labels[status]}</button>)}</div></td></tr>)}</tbody></table></div></div>}
      </section>
      <section className="attendance-summary"><header><UsersRound/><div><strong>本学期合计</strong><small>仅统计“已到课”和“请假”，未签到不计入合计。</small></div></header><div className="attendance-summary-grid">{summary.map(item=><article key={item.name}><span>{item.name.slice(-1)}</span><strong>{item.name}</strong><div><b>{item.present}</b><small>到课</small></div><div><b>{item.leave}</b><small>请假</small></div></article>)}</div></section>
    </>:<EmptyState title="本学期还没有签到记录" description="选择课程后点击“开始上课”，系统会自动建立今天的签到表。"/>}
  </div>
}
