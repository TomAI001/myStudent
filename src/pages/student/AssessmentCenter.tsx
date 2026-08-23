import { AlarmClock, ArrowLeft, CheckCircle2, ChevronRight, ClipboardCheck, Code2, FileQuestion, RotateCcw, Send, ShieldCheck, Timer, XCircle } from 'lucide-react'
import { useState } from 'react'
import { getLearningState, submitAssessment, type Assessment, type AssessmentSubmission } from '../../lib/studentLearningStore'

export default function AssessmentCenter({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const [state, setState] = useState(getLearningState)
  const [active, setActive] = useState<Assessment | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<AssessmentSubmission | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const assessments = state.assessments.filter((item) => item.published)

  const start = (assessment: Assessment) => { setActive(assessment); setAnswers({}); setResult(null); setStartedAt(Date.now()) }
  const submit = () => {
    if (!active || !window.confirm('确认提交这份测评吗？提交后会立即显示客观题结果。')) return
    const saved = submitAssessment(active, studentId, answers); setResult(saved); setState(getLearningState())
  }
  const attempts = (id: string) => state.assessmentSubmissions.filter((item) => item.assessmentId === id && item.studentId === studentId)

  if (active) return <AssessmentPaper assessment={active} answers={answers} setAnswers={setAnswers} result={result} startedAt={startedAt} onSubmit={submit} onExit={() => setActive(null)} />

  return <main className="student-module-page">
    <ModuleHeading icon={ClipboardCheck} label="ASSESSMENT CENTER" title="测评挑战" description="认真作答，客观题提交后立即显示结果。" onBack={onBack} />
    <section className="assessment-grid">{assessments.map((item) => {
      const submitted = attempts(item.id); const unavailable = submitted.length >= item.maxAttempts
      return <article className="assessment-card" key={item.id}><div className="assessment-card-top"><span className={item.kind}><FileQuestion /></span><div><small>{item.kind === 'course' ? '课程测评' : '心理测评'}</small><h2>{item.title}</h2></div></div><p>{item.description}</p><div className="assessment-meta"><span><Timer /> {item.durationMinutes} 分钟</span><span><RotateCcw /> {submitted.length}/{item.maxAttempts} 次</span><span><ShieldCheck /> 自动保存</span></div><button type="button" disabled={unavailable} onClick={() => start(item)}>{unavailable ? '作答次数已用完' : submitted.length ? '再次挑战' : '开始测评'} <ChevronRight /></button>{submitted[0] && <div className="last-score"><span>上次客观题</span><strong>{submitted.at(-1)?.autoScore} 分</strong></div>}</article>
    })}</section>
  </main>
}

function AssessmentPaper({ assessment, answers, setAnswers, result, startedAt, onSubmit, onExit }: { assessment: Assessment; answers: Record<string,string>; setAnswers: React.Dispatch<React.SetStateAction<Record<string,string>>>; result: AssessmentSubmission | null; startedAt: number | null; onSubmit: () => void; onExit: () => void }) {
  const total = assessment.questions.reduce((sum, item) => sum + item.points, 0)
  const answered = Object.values(answers).filter(Boolean).length
  const elapsed = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : 0
  return <main className="student-module-page"><div className="paper-topbar"><button type="button" onClick={onExit}><ArrowLeft /> 返回测评列表</button><div><small>ASSESSMENT IN PROGRESS</small><strong>{assessment.title}</strong></div><span><AlarmClock /> {result ? `用时 ${elapsed} 分钟` : `${assessment.durationMinutes} 分钟`}</span></div>
    {result && <section className="result-banner"><span><CheckCircle2 /></span><div><small>客观题成绩已公布</small><h1>{result.autoScore}<em> / {total} 分</em></h1><p>{result.manualPending ? '编程题正在等待老师评分，完成后总成绩会更新。' : '本次测评已完成。'}</p></div></section>}
    <section className="assessment-paper">{assessment.questions.map((question, index) => {
      const selected = answers[question.id] || ''; const isCorrect = result && question.type !== 'programming' && selected.trim().toLowerCase() === question.answer?.trim().toLowerCase()
      return <article className={`question-block ${result ? isCorrect ? 'answer-correct' : question.type === 'programming' ? 'answer-manual' : 'answer-wrong' : ''}`} key={question.id}><header><span>{String(index + 1).padStart(2,'0')}</span><div><small>{question.type === 'choice' ? '选择题' : question.type === 'true_false' ? '判断题' : question.type === 'blank' ? '程序填空题' : '编程题'} · {question.points} 分</small><h2>{question.title}</h2></div>{result && (question.type === 'programming' ? <Code2 /> : isCorrect ? <CheckCircle2 /> : <XCircle />)}</header>
        {(question.type === 'choice' || question.type === 'true_false') && <div className="question-options">{question.options?.map((option) => <button type="button" key={option} disabled={Boolean(result)} className={selected === option ? 'selected' : ''} onClick={() => setAnswers((current) => ({...current,[question.id]:option}))}><i>{String.fromCharCode(65 + (question.options?.indexOf(option) || 0))}</i>{option}</button>)}</div>}
        {question.type === 'blank' && <input disabled={Boolean(result)} value={selected} onChange={(event) => setAnswers((current) => ({...current,[question.id]:event.target.value}))} placeholder="在这里填写缺少的代码" />}
        {question.type === 'programming' && <textarea disabled={Boolean(result)} value={selected} onChange={(event) => setAnswers((current) => ({...current,[question.id]:event.target.value}))} rows={8} spellCheck={false} placeholder="# 在这里编写 Python 程序" />}
        {result && question.type !== 'programming' && <p className="answer-explain">正确答案：<strong>{question.answer}</strong></p>}
        {result && question.type === 'programming' && <p className="answer-explain">已提交，等待老师人工评分。</p>}
      </article>
    })}</section>
    {!result && <div className="paper-submit"><span>已完成 {answered}/{assessment.questions.length} 题</span><button type="button" onClick={onSubmit}><Send /> 提交测评</button></div>}
  </main>
}

export function ModuleHeading({ icon: Icon, label, title, description, onBack }: { icon: typeof ClipboardCheck; label: string; title: string; description: string; onBack: () => void }) {
  return <div className="student-module-heading"><button type="button" onClick={onBack}><ArrowLeft /> 返回冒险大厅</button><div className="module-heading-icon"><Icon /></div><div><span>{label}</span><h1>{title}</h1><p>{description}</p></div></div>
}
