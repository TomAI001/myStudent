/* eslint-disable @typescript-eslint/no-explicit-any -- 学生端聚合接口兼容旧版服务器字段 */
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, CircleHelp, ClipboardCheck, Code2, Crown, Download, Gamepad2, ImageUp, Keyboard, KeyRound, LockKeyhole, LogOut, Maximize2, Medal, MessageCircleMore, Minimize2, Play, Settings, Sparkles, Star, Trophy, UserRound, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLoader } from '../../components/States'
import PythonLab from './PythonLab'
import { changeStudentPassword, demoClass, demoLessons, getStudentSession, logoutStudent, type StudentProgress, type StudentSession } from '../../lib/studentPortal'
import { getStudentFeatureState, studentAction, touchAttendance, type StudentFeatureState } from '../../lib/featureApi'
import AssessmentCenter from './AssessmentCenter'
import HomeworkCenter from './HomeworkCenter'
import CommunitySquare from './CommunitySquare'
import StudentFiles from './StudentFiles'
import TypingPractice from './TypingPractice'
import { getClasses } from '../../lib/data'

type View = 'lobby' | 'classroom' | 'assessment' | 'homework' | 'square' | 'files' | 'typing'
type ScoreMessage = { type: 'growth-courseware:score'; questionId: string; correct: boolean; points: number }
type ProgressMessage = { type: 'growth-courseware:progress'; lessonId: string; currentSlide: number; totalSlides: number; chapter: number; percent: number; completed: boolean }
type CoursewareMessage = ScoreMessage | ProgressMessage
type CompletionSignal = { lessonId: string; nonce: number } | null

const modules = [
  { id: 'class', number: '01', title: '开始上课', caption: '进入课件 · 完成挑战', icon: BookOpen, color: 'orange', active: true },
  { id: 'test', number: '02', title: '测评', caption: '检验本领 · 突破自我', icon: ClipboardCheck, color: 'cyan', active: true },
  { id: 'homework', number: '03', title: '上传作业', caption: '提交创作 · 等待点评', icon: ImageUp, color: 'lime', active: true },
  { id: 'square', number: '04', title: '交流广场', caption: '分享作品 · 发现灵感', icon: MessageCircleMore, color: 'purple', active: true },
  { id: 'files', number: '05', title: '文件下载', caption: '领取资料 · 分享作品', icon: Download, color: 'cyan', active: true },
  { id: 'typing', number: '06', title: '打字练习', caption: '熟悉键盘 · 提升速度', icon: Keyboard, color: 'orange', active: true },
]

export default function StudentPortal() {
  const navigate = useNavigate()
  const [session, setSession] = useState<StudentSession | null | undefined>(undefined)
  const [view, setView] = useState<View>('lobby')
  const [studentProgress, setStudentProgress] = useState<StudentProgress>({ points: 0, answeredQuestionIds: [], completedLessonIds: [], lessonProgress: {} })
  const [completionSignal, setCompletionSignal] = useState<CompletionSignal>(null)
  const [toast, setToast] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [features,setFeatures]=useState<StudentFeatureState|null>(null)
  const [activeLessonId,setActiveLessonId]=useState('')
  const [activeClassId,setActiveClassId]=useState('')
  const [classNames,setClassNames]=useState<Record<string,string>>({})
  const points = studentProgress.points

  const applyFeatures=(data:StudentFeatureState)=>{setFeatures(data);const lessonProgress=Object.fromEntries(data.progress.map((item:any)=>[item.course_id.split(':').pop(),{currentSlide:item.current_slide,totalSlides:item.total_slides,percent:item.percent,completed:Boolean(item.completed)}]));setStudentProgress({points:data.student.points,answeredQuestionIds:[],completedLessonIds:data.progress.filter((item:any)=>item.completed).map((item:any)=>item.course_id.split(':').pop()),lessonProgress})}

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [view])

  useEffect(() => {
    getStudentSession().then((next) => {
      if (!next) navigate('/student/login', { replace: true })
      else { const firstClass=next.classIds[0]||'';setSession(next);setActiveClassId(firstClass);getStudentFeatureState(firstClass).then(applyFeatures);getClasses().then(items=>setClassNames(Object.fromEntries(items.map(item=>[item.id,item.name])))).catch(()=>undefined) }
    }).catch(() => navigate('/student/login', { replace: true }))
  }, [navigate])
  useEffect(()=>{
    if(!features?.classId)return
    const touch=()=>touchAttendance(features.classId).catch(()=>undefined)
    touch()
    const timer=window.setInterval(touch,60000)
    const onFocus=()=>touch()
    window.addEventListener('focus',onFocus)
    document.addEventListener('visibilitychange',onFocus)
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus)}
  },[features?.classId])
  useEffect(() => {
    const receive = (event: MessageEvent<CoursewareMessage>) => {
      if (event.origin !== window.location.origin || !session || !event.data?.type) return
      if (event.data.type === 'growth-courseware:score') {
        if (!event.data.correct){setToast('再想一想，你一定可以');window.setTimeout(()=>setToast(''),2200);return}
        studentAction('/student/points/award','POST',{questionId:`${activeLessonId||'course'}:${event.data.questionId}`,points:100,reason:'课件答题'}).then(result=>{const before=studentProgress.points;setStudentProgress(current=>({...current,points:result.points}));setFeatures(current=>current?{...current,student:{...current.student,points:result.points}}:current);setToast(result.points>before?'答对了！积分 +100':'这道题已经获得过积分啦')}).catch(reason=>setToast(reason instanceof Error?reason.message:'积分保存失败'))
        window.setTimeout(() => setToast(''), 2200)
        return
      }
      if (event.data.type === 'growth-courseware:progress') {
        const data=event.data;const course=features?.courses.find(item=>item.id.endsWith(`:${data.lessonId}`));if(!course)return
        const percent=Number.isFinite(data.percent)?data.percent:Math.round((data.currentSlide/Math.max(1,data.totalSlides))*100)
        const progress={currentSlide:data.currentSlide,totalSlides:data.totalSlides,percent,completed:data.completed};setStudentProgress(current=>({...current,completedLessonIds:data.completed&&!current.completedLessonIds.includes(data.lessonId)?[...current.completedLessonIds,data.lessonId]:current.completedLessonIds,lessonProgress:{...current.lessonProgress,[data.lessonId]:progress}}));studentAction('/student/course-progress','POST',{courseId:course.id,...progress}).catch(()=>undefined)
        if(data.completed){setToast('本课已完成，可以继续复习或返回目录');setCompletionSignal({lessonId:data.lessonId,nonce:Date.now()});window.setTimeout(()=>setToast(''),2600)}
      }
    }
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive)
  }, [session,features,studentProgress.points,activeLessonId])

  if (session === undefined) return <div className="admin-loading"><PageLoader label="正在进入冒险大厅…" /></div>
  if (!session) return null
  const leave = async () => { await logoutStudent(); navigate('/student/login', { replace: true }) }
  const openView=(next:View)=>{getStudentFeatureState(activeClassId).then(setFeatures).finally(()=>setView(next))}

  return (
    <div className="quest-app">
      {toast && <div className="score-toast"><Zap /> {toast}</div>}
      <header className="quest-topbar">
        <button type="button" className="quest-brand" onClick={() => setView('lobby')}><span><Gamepad2 /></span><div><strong>CODE QUEST</strong><small>咱们班的成长记录</small></div></button>
        <div className="quest-userbar">{session.classIds.length>1&&<label className="student-class-picker"><small>当前班级</small><select value={activeClassId} onChange={event=>{const nextClass=event.target.value;setActiveClassId(nextClass);setView('lobby');getStudentFeatureState(nextClass).then(applyFeatures)}}>{session.classIds.map((id,index)=><option value={id} key={id}>{classNames[id]||`班级 ${index+1}`}</option>)}</select></label>}<div className="point-pill"><Star /><span><small>我的积分</small><strong>{points}</strong></span></div><div className="player-pill"><span><UserRound /></span><div><small>冒险玩家</small><strong>{session.studentName}</strong></div></div><button type="button" className="quest-logout" title="修改密码" onClick={() => setPasswordOpen(true)}><Settings /></button><button type="button" className="quest-logout" title="退出登录" onClick={leave}><LogOut /></button></div>
      </header>
      {view === 'lobby' && <Lobby studentName={session.studentName} points={points} completedLessons={studentProgress.completedLessonIds.length} totalLessons={features?.courses.length||3} features={features} onOpen={openView} />}
      {view === 'classroom' && <Classroom studentName={session.studentName} className={classNames[activeClassId] || ''} points={points} studentProgress={studentProgress} completionSignal={completionSignal} features={features} onLessonChange={setActiveLessonId} onBack={() => setView('lobby')} />}
      {view === 'assessment' && <AssessmentCenter studentId={session.studentId} features={features} onRefresh={()=>getStudentFeatureState(activeClassId).then(setFeatures)} onBack={() => setView('lobby')} />}
      {view === 'homework' && <HomeworkCenter studentId={session.studentId} studentName={session.studentName} features={features} onRefresh={()=>getStudentFeatureState(activeClassId).then(setFeatures)} onBack={() => setView('lobby')} />}
      {view === 'square' && <CommunitySquare studentId={session.studentId} studentName={session.studentName} features={features} onRefresh={()=>getStudentFeatureState(activeClassId).then(setFeatures)} onBack={() => setView('lobby')} />}
      {view === 'files' && <StudentFiles features={features} onRefresh={()=>getStudentFeatureState(activeClassId).then(setFeatures)} onBack={() => setView('lobby')} />}
      {view === 'typing' && <TypingPractice features={features} onRefresh={()=>getStudentFeatureState(activeClassId).then(setFeatures)} onBack={() => setView('lobby')} />}
      {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} />}
    </div>
  )
}

function Lobby({ studentName, points, completedLessons, totalLessons, features, onOpen }: { studentName: string; points: number; completedLessons: number; totalLessons:number; features:StudentFeatureState|null; onOpen: (view: View) => void }) {
  const available=(id:string)=>id==='class'?Boolean(features?.courses.some(item=>item.published)):id==='test'?Boolean(features?.assessments.length):id==='homework'?Boolean(features?.homework.length):id==='square'?Boolean(features?.communityEnabled):id==='typing'?Boolean(features?.typingEnabled):true
  return <main className="quest-lobby">
    <section className="lobby-hero"><div><span className="hero-eyebrow"><Sparkles /> TODAY'S ADVENTURE</span><h1>晚上好，{studentName}<br /><em>今天想挑战哪一关？</em></h1><p>大胆尝试，错误只是通往答案的隐藏路线。</p></div><div className="hero-console" aria-hidden="true"><div className="console-screen"><Code2 /><span>READY?</span><i>_</i></div><span className="console-button button-a" /><span className="console-button button-b" /><span className="console-cross">+</span></div></section>
    <section className="module-board"><div className="board-title"><span>CHOOSE A LEVEL</span><h2>冒险地图</h2><p>老师开放后即可进入对应板块，选择一项开始今天的挑战。</p></div><div className="module-grid">{modules.map((item) => {const active=available(item.id);return <button type="button" key={item.id} className={`quest-module module-${item.color} ${active ? '' : 'is-locked'}`} onClick={active ? () => onOpen(item.id === 'class' ? 'classroom' : item.id === 'test' ? 'assessment' : item.id as View) : undefined}><span className="module-number">{item.number}</span><span className="module-icon"><item.icon /></span><span className="module-copy"><strong>{item.title}</strong><small>{item.caption}</small></span>{active ? <span className="module-go"><Play /></span> : <span className="module-lock"><LockKeyhole /> 等待老师开放</span>}</button>})}</div></section>
    <section className="lobby-status"><div><Trophy /><span><small>当前积分</small><strong>{points}</strong></span></div><div><BookOpen /><span><small>课程进度</small><strong>{completedLessons} / {totalLessons}</strong></span></div><div><Medal /><span><small>班级排名</small><strong>第 5 名</strong></span></div><div className="status-motto"><span>今日提示</span><p>把大问题拆成小问题，代码就会变简单。</p></div></section>
  </main>
}

function PasswordModal({ onClose }: { onClose:()=>void }) {
  const [current,setCurrent]=useState(''); const [next,setNext]=useState(''); const [confirm,setConfirm]=useState(''); const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false)
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(next.length<6)return setMessage('新密码至少需要 6 位。');if(next!==confirm)return setMessage('两次输入的新密码不一致。');setSaving(true);setMessage('');try{await changeStudentPassword(current,next);window.alert('密码修改成功。');onClose()}catch(reason){setMessage(reason instanceof Error?reason.message:'密码修改失败。')}finally{setSaving(false)}}
  return <div className="quest-modal-backdrop" onMouseDown={(event)=>{if(event.currentTarget===event.target)onClose()}}><form className="password-modal" onSubmit={submit}><span><KeyRound/></span><h2>修改登录密码</h2><p>忘记密码时，请联系老师在教师端重置。</p><label>当前密码<input type="password" value={current} onChange={(event)=>setCurrent(event.target.value)} required/></label><label>新密码<input type="password" value={next} onChange={(event)=>setNext(event.target.value)} required/></label><label>再次输入新密码<input type="password" value={confirm} onChange={(event)=>setConfirm(event.target.value)} required/></label>{message&&<em>{message}</em>}<div><button type="button" onClick={onClose}>取消</button><button type="submit" disabled={saving}>{saving?'保存中…':'确认修改'}</button></div></form></div>
}

function Classroom({ studentName, className, points, studentProgress, features, onLessonChange, onBack }: { studentName: string; className: string; points: number; studentProgress: StudentProgress; completionSignal: CompletionSignal; features:StudentFeatureState|null; onLessonChange:(lessonId:string)=>void; onBack: () => void }) {
  const [lessonId, setLessonId] = useState('')
  const frameRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const catalog=features?.courses.map(item=>({id:item.id.split(':').pop()||item.id,sequence:item.sequence,title:item.title,subtitle:item.subtitle,status:item.published?'current' as const:'locked' as const,path:item.path}))||demoLessons
  const lesson = catalog.find((item) => item.id === lessonId && item.status==='current') ?? catalog.find(item=>item.status==='current')
  const activeLessonId = lesson?.id
  const lessons = catalog.map((item) => {
    const completed = studentProgress.completedLessonIds.includes(item.id)
    const unlocked = item.status === 'current'
    return { ...item, status: !unlocked ? 'locked' as const : completed ? 'completed' as const : 'current' as const }
  })
  const activeLessonProgress = lesson?studentProgress.lessonProgress[lesson.id]:undefined
  const coursewareBase = lesson?('path' in lesson ? String(lesson.path) : lesson.id==='lesson-1'?`${import.meta.env.BASE_URL}courseware/no.1/index.html`:lesson.id==='lesson-2'?`${import.meta.env.BASE_URL}courseware/no.2/index.html`:`${import.meta.env.BASE_URL}courseware/no.3/index.html`):''
  // Keep the iframe URL stable when points change. Updated balances are sent below by postMessage.
  const coursewareSrc = coursewareBase ? `${coursewareBase}${coursewareBase.includes('?')?'&':'?'}studentId=${encodeURIComponent(features?.student.id||studentName)}&studentName=${encodeURIComponent(studentName)}` : ''
  const leaderboard = useMemo(() => (features?.leaderboard||[]).map((item:any)=>({id:item.id,name:item.student_name,points:item.points,color:'#83ed9b',me:item.student_name===studentName})).sort((a,b)=>b.points-a.points), [features,studentName])

  useEffect(() => {
    const changed = () => setIsFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [])
  useEffect(()=>{if(activeLessonId&&activeLessonId!==lessonId)setLessonId(activeLessonId);if(activeLessonId)onLessonChange(activeLessonId)},[activeLessonId,lessonId,onLessonChange])
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'growth-courseware:points', points }, window.location.origin)
  }, [points, lesson?.id])

  const syncCoursewarePoints = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'growth-courseware:points', points }, window.location.origin)
  }

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await frameRef.current?.requestFullscreen()
  }

  const completedCount = studentProgress.completedLessonIds.length
  return <main className="classroom-page">
    <div className="classroom-heading"><button type="button" onClick={onBack}><ArrowLeft /> 返回冒险大厅</button><div><span>COURSE DIRECTORY</span><h1>{className || demoClass.name}</h1><p>{demoClass.teacher} · 已完成 {completedCount}/{catalog.length} 节课</p></div><div className="class-progress-ring"><strong>{Math.round(completedCount / Math.max(1,catalog.length) * 100)}%</strong><small>课程进度</small></div></div>
    <div className="classroom-layout">
      <aside className="lesson-map"><div className="map-title"><span><Gamepad2 /></span><div><small>COURSE DIRECTORY</small><strong>课程目录</strong></div></div>{lessons.map((item) => { const itemProgress = studentProgress.lessonProgress[item.id]; return <button type="button" key={item.id} disabled={item.status === 'locked'} className={`${item.id === lessonId ? 'active' : ''} ${item.status}`} onClick={() => setLessonId(item.id)}><span>{item.status === 'locked' ? <LockKeyhole /> : item.status === 'completed' ? <CheckCircle2 /> : item.sequence}</span><div><strong>{item.title}</strong><small>{item.status==='locked'?'等待老师开放':itemProgress?.completed ? '已经完成 · 点击可以复习' : itemProgress ? `课件进度 ${itemProgress.currentSlide}/${itemProgress.totalSlides}` : item.subtitle}</small>{itemProgress && <b className="lesson-mini-progress"><i style={{ width: `${itemProgress.percent}%` }} /></b>}</div><ChevronRight /></button>})}</aside>
      {lesson?<section className="lesson-stage"><div className="stage-top"><div><span>LEVEL {String(lesson.sequence).padStart(2, '0')}</span><h2>{lesson.title}</h2><p>{lesson.subtitle}。认真观看课件，答题积分会自动记录。</p></div><div className="stage-reward"><Star /><span><small>本课奖励</small><strong>闯关积分</strong></span></div></div><div className="courseware-frame" ref={frameRef}><div className="frame-label"><i /><span>互动课件</span><small>{activeLessonProgress ? `已学习 ${activeLessonProgress.currentSlide}/${activeLessonProgress.totalSlides} 页 · ${activeLessonProgress.percent}%` : '方向键或空格翻页 · 答题结果自动记录'}</small><button type="button" className="frame-fullscreen" onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏播放课件'}>{isFullscreen ? <Minimize2 /> : <Maximize2 />}<b>{isFullscreen ? '退出全屏' : '全屏播放'}</b></button></div><iframe ref={iframeRef} onLoad={syncCoursewarePoints} key={lesson.id} title={`${lesson.title}互动课件`} src={coursewareSrc} allow="fullscreen" allowFullScreen /></div><PythonLab /></section>:<section className="lesson-stage"><div className="portal-empty"><LockKeyhole/><strong>课程尚未开放</strong><span>请等待老师在教师端开放课程权限。</span></div></section>}
      <aside className="leaderboard"><div className="rank-heading"><Crown /><div><small>LIVE RANKING</small><strong>实时排行榜</strong></div><span>本节课</span></div><div className="rank-podium">{leaderboard.slice(0, 3).map((item, index) => <div key={item.id} className={`rank-${index + 1}`}><span style={{ background: item.color }}>{item.name.slice(-1)}</span><strong>{item.name}</strong><small>{item.points} 分</small><i>{index + 1}</i></div>)}</div><ol>{leaderboard.slice(3).map((item, index) => <li key={item.id} className={'me' in item && item.me ? 'is-me' : ''}><b>{index + 4}</b><span style={{ background: item.color }}>{item.name.slice(-1)}</span><strong>{item.name}{'me' in item && item.me ? '（我）' : ''}</strong><em>{item.points}</em></li>)}</ol><div className="rank-note"><CircleHelp /><p>每道题第一次答对才会获得积分，重复作答不会刷分。</p></div></aside>
    </div>
  </main>
}
