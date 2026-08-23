import { CalendarClock, CheckCircle2, Clock3, Code2, FileImage, FileVideo, ImagePlus, LoaderCircle, Play, RotateCcw, Send, UploadCloud, Video } from 'lucide-react'
import { useMemo, useState } from 'react'
import { createId, getLearningState, saveLearningState, type HomeworkAssignment } from '../../lib/studentLearningStore'
import { runPythonCode } from '../../lib/pythonRuntime'
import { ModuleHeading } from './AssessmentCenter'

export default function HomeworkCenter({ studentId, studentName, onBack }: { studentId: string; studentName: string; onBack: () => void }) {
  const [state, setState] = useState(getLearningState)
  const [active, setActive] = useState<HomeworkAssignment | null>(null)
  const assignments = state.homework.filter((item) => item.published)
  const submissions = (homeworkId: string) => state.homeworkSubmissions.filter((item) => item.homeworkId === homeworkId && item.studentId === studentId)

  if (active) return <HomeworkSubmit assignment={active} studentId={studentId} studentName={studentName} previous={submissions(active.id)} onBack={() => { setState(getLearningState()); setActive(null) }} />
  return <main className="student-module-page"><ModuleHeading icon={UploadCloud} label="HOMEWORK STATION" title="上传作业" description="可以在线编写代码，也可以提交照片或演示视频。" onBack={onBack} /><section className="homework-student-grid">{assignments.map((item) => { const mine = submissions(item.id); const last = mine.at(-1); return <article className="homework-student-card" key={item.id}><div className="homework-status-icon"><Code2 /></div><div className="homework-main"><span className="homework-label">PYTHON HOMEWORK</span><h2>{item.title}</h2><p>{item.description}</p><div><span><CalendarClock /> 截止 {formatDate(item.dueAt)}</span><span><RotateCcw /> 可提交 {item.maxSubmissions} 次</span></div></div><aside>{last ? <><span className="submitted-mark"><CheckCircle2 /> 已提交 {mine.length} 次</span>{last.score !== null ? <strong>{last.score} 分</strong> : <em>等待老师评分</em>}</> : <span className="todo-mark"><Clock3 /> 待完成</span>}<button type="button" disabled={mine.length >= item.maxSubmissions} onClick={() => setActive(item)}>{mine.length ? '修改并重交' : '开始作业'}</button></aside>{last?.feedback && <div className="teacher-feedback"><strong>老师评语</strong><p>{last.feedback}</p></div>}</article>})}</section></main>
}

function HomeworkSubmit({ assignment, studentId, studentName, previous, onBack }: { assignment: HomeworkAssignment; studentId: string; studentName: string; previous: ReturnType<typeof getLearningState>['homeworkSubmissions']; onBack: () => void }) {
  const last = previous.at(-1); const [code, setCode] = useState(last?.code || '# 在这里完成作业\nscore = 85\nif score >= 60:\n    print("挑战成功！")')
  const [note, setNote] = useState(last?.note || ''); const [photos, setPhotos] = useState<File[]>([]); const [video, setVideo] = useState<File | null>(null)
  const [output, setOutput] = useState('运行代码后，这里会显示结果。'); const [running, setRunning] = useState(false); const [done, setDone] = useState(false)
  const photoUrls = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos])

  const choosePhotos = (files: FileList | null) => { if (!files) return; const next = [...photos, ...Array.from(files).filter((file) => file.type.startsWith('image/'))].slice(0,10); setPhotos(next) }
  const chooseVideo = async (file?: File) => {
    if (!file) return
    if (file.size > 200 * 1024 * 1024) return window.alert('单个视频不能超过 200MB。')
    const url = URL.createObjectURL(file); const element = document.createElement('video'); element.preload = 'metadata'; element.src = url
    element.onloadedmetadata = () => { URL.revokeObjectURL(url); if (element.duration > 300) window.alert('视频最长不能超过 5 分钟。'); else setVideo(file) }
    element.onerror = () => { URL.revokeObjectURL(url); window.alert('无法读取视频，请换一个文件。') }
  }
  const run = async () => { setRunning(true); setOutput('正在启动 Python…'); try { setOutput(await runPythonCode(code,setOutput)) } catch (reason) { setOutput(`运行出错：\n${reason instanceof Error ? reason.message : String(reason)}`) } finally { setRunning(false) } }
  const submit = () => {
    const state = getLearningState(); state.homeworkSubmissions.push({ id:createId('homework-submit'),homeworkId:assignment.id,studentId,studentName,code,note,photos:photos.map((file)=>file.name),video:video?.name||null,submittedAt:new Date().toISOString(),attempt:previous.length+1,score:null,feedback:'' }); saveLearningState(state); setDone(true)
  }
  if (done) return <main className="student-module-page"><section className="submission-success"><span><CheckCircle2 /></span><h1>作业提交成功！</h1><p>老师评分后，你可以在作业列表查看分数和评语。</p><button type="button" onClick={onBack}>返回作业列表</button></section></main>
  return <main className="student-module-page"><div className="homework-editor-heading"><button type="button" onClick={onBack}>← 返回作业列表</button><span>第 {previous.length + 1} 次提交</span><h1>{assignment.title}</h1><p>{assignment.description}</p></div><div className="homework-editor-grid"><section className="homework-code-card"><header><Code2 /><strong>Python 程序</strong><button type="button" onClick={run} disabled={running}>{running?<LoaderCircle className="spin"/>:<Play/>}{running?'运行中':'运行代码'}</button></header><textarea value={code} onChange={(event)=>setCode(event.target.value)} spellCheck={false}/><pre>{output}</pre></section><aside className="homework-upload-card"><h2><UploadCloud /> 添加作业材料</h2><label>作业说明<textarea rows={4} value={note} onChange={(event)=>setNote(event.target.value)} placeholder="说说你的思路或遇到的问题…"/></label><div className="upload-limits"><span><FileImage /> 照片 {photos.length}/10</span><span><FileVideo /> 视频 {video?1:0}/1</span></div><label className="homework-drop"><ImagePlus /><strong>选择照片</strong><small>最多 10 张</small><input hidden multiple type="file" accept="image/*" onChange={(event)=>choosePhotos(event.target.files)}/></label>{photos.length>0&&<div className="homework-photo-preview">{photoUrls.map((url,index)=><div key={url}><img src={url} alt="作业预览"/><button type="button" onClick={()=>setPhotos((items)=>items.filter((_,i)=>i!==index))}>×</button></div>)}</div>}<label className="homework-drop video"><Video /><strong>{video?video.name:'选择视频'}</strong><small>1 个，最长 5 分钟，最大 200MB</small><input hidden type="file" accept="video/*" onChange={(event)=>chooseVideo(event.target.files?.[0])}/></label><button type="button" className="submit-homework" onClick={submit}><Send /> 提交作业</button></aside></div></main>
}

function formatDate(value:string){return new Date(value).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
