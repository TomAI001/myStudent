export const STUDENT_SESSION_KEY = 'growth-journal-student-session'
const STUDENT_PROGRESS_KEY = 'growth-journal-student-progress'

export interface StudentSession {
  studentId: string
  studentName: string
  username: string
}

export interface StudentProgress {
  points: number
  answeredQuestionIds: string[]
}
import { getStudentAccount } from './studentLearningStore'

export function loginStudent(username: string, password: string): StudentSession | null {
  const account = getStudentAccount(username, password)
  if (!account) return null
  const session = { studentId: account.id, studentName: account.studentName, username: account.username }
  window.localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session))
  return session
}

export function getStudentSession(): StudentSession | null {
  const raw = window.localStorage.getItem(STUDENT_SESSION_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as StudentSession }
  catch { window.localStorage.removeItem(STUDENT_SESSION_KEY); return null }
}

export function logoutStudent() {
  window.localStorage.removeItem(STUDENT_SESSION_KEY)
}

export function getStudentProgress(studentId: string): StudentProgress {
  try {
    const all = JSON.parse(window.localStorage.getItem(STUDENT_PROGRESS_KEY) || '{}') as Record<string, StudentProgress>
    return all[studentId] || { points: 120, answeredQuestionIds: [] }
  } catch { return { points: 120, answeredQuestionIds: [] } }
}

export function awardQuestionPoints(studentId: string, questionId: string, points: number): StudentProgress {
  let all: Record<string, StudentProgress> = {}
  try { all = JSON.parse(window.localStorage.getItem(STUDENT_PROGRESS_KEY) || '{}') }
  catch { all = {} }
  const current = all[studentId] || { points: 120, answeredQuestionIds: [] }
  if (current.answeredQuestionIds.includes(questionId)) return current
  const next = { points: current.points + Math.max(0, points), answeredQuestionIds: [...current.answeredQuestionIds, questionId] }
  all[studentId] = next
  window.localStorage.setItem(STUDENT_PROGRESS_KEY, JSON.stringify(all))
  return next
}

export const demoClass = {
  id: 'python-summer',
  name: 'Python 创意编程暑期班',
  teacher: 'Tom 老师',
  progress: 0,
  totalLessons: 7,
}

export const demoLessons = [
  { id: 'lesson-1', sequence: 1, title: '海龟探险队', subtitle: '计算机故事、Python 与 Turtle 图形创作', status: 'current' as const },
  { id: 'lesson-2', sequence: 2, title: '让程序学会做选择', subtitle: '条件判断与闯关小游戏', status: 'locked' as const },
  { id: 'lesson-3', sequence: 3, title: '重复的事情交给循环', subtitle: 'for 循环与数字图案', status: 'locked' as const },
  { id: 'lesson-4', sequence: 4, title: '海龟画笔出发', subtitle: 'Turtle 图形创作', status: 'locked' as const },
]

export const baseLeaderboard = [
  { id: 'peer-1', name: '陈星野', points: 188, color: '#ff8f45' },
  { id: 'peer-2', name: '周一诺', points: 172, color: '#72d9ff' },
  { id: 'peer-3', name: '许乐言', points: 154, color: '#ffd75e' },
  { id: 'peer-4', name: '赵可欣', points: 138, color: '#bf8cff' },
]
