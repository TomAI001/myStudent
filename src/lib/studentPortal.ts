const STUDENT_PROGRESS_KEY = 'growth-journal-student-progress'

import {
  changeStudentPasswordOnServer,
  getStudentServerSession,
  loginStudentOnServer,
  logoutStudentOnServer,
  type StudentServerSession,
} from './serverApi'

export type StudentSession = StudentServerSession

export interface StudentProgress {
  points: number
  answeredQuestionIds: string[]
  completedLessonIds: string[]
  lessonProgress: Record<string, LessonProgress>
}

export interface LessonProgress {
  currentSlide: number
  totalSlides: number
  percent: number
  completed: boolean
}
export const loginStudent = loginStudentOnServer
export const getStudentSession = getStudentServerSession
export const logoutStudent = logoutStudentOnServer
export const changeStudentPassword = changeStudentPasswordOnServer

export function getStudentProgress(studentId: string): StudentProgress {
  try {
    const all = JSON.parse(window.localStorage.getItem(STUDENT_PROGRESS_KEY) || '{}') as Record<string, StudentProgress>
    const saved = all[studentId]
    return {
      points: saved?.points ?? 120,
      answeredQuestionIds: saved?.answeredQuestionIds ?? [],
      completedLessonIds: saved?.completedLessonIds ?? [],
      lessonProgress: saved?.lessonProgress ?? {},
    }
  } catch { return { points: 120, answeredQuestionIds: [], completedLessonIds: [], lessonProgress: {} } }
}

export function awardQuestionPoints(studentId: string, questionId: string, points: number): StudentProgress {
  let all: Record<string, StudentProgress> = {}
  try { all = JSON.parse(window.localStorage.getItem(STUDENT_PROGRESS_KEY) || '{}') }
  catch { all = {} }
  const current = getStudentProgress(studentId)
  if (current.answeredQuestionIds.includes(questionId)) return current
  const next = { points: current.points + Math.max(0, points), answeredQuestionIds: [...current.answeredQuestionIds, questionId] }
  all[studentId] = { ...current, ...next }
  window.localStorage.setItem(STUDENT_PROGRESS_KEY, JSON.stringify(all))
  return all[studentId]
}

export function saveLessonProgress(studentId: string, lessonId: string, currentSlide: number, totalSlides: number, completed: boolean) {
  let all: Record<string, StudentProgress> = {}
  try { all = JSON.parse(window.localStorage.getItem(STUDENT_PROGRESS_KEY) || '{}') }
  catch { all = {} }
  const current = getStudentProgress(studentId)
  const safeTotal = Math.max(1, totalSlides)
  const safeCurrent = Math.min(safeTotal, Math.max(currentSlide, current.lessonProgress[lessonId]?.currentSlide ?? 1))
  const isCompleted = completed || current.completedLessonIds.includes(lessonId)
  const next: StudentProgress = {
    ...current,
    completedLessonIds: isCompleted && !current.completedLessonIds.includes(lessonId)
      ? [...current.completedLessonIds, lessonId]
      : current.completedLessonIds,
    lessonProgress: {
      ...current.lessonProgress,
      [lessonId]: {
        currentSlide: safeCurrent,
        totalSlides: safeTotal,
        percent: isCompleted ? 100 : Math.round(safeCurrent / safeTotal * 100),
        completed: isCompleted,
      },
    },
  }
  all[studentId] = next
  window.localStorage.setItem(STUDENT_PROGRESS_KEY, JSON.stringify(all))
  return next
}

export const demoClass = {
  id: 'python-summer',
  name: 'Python 创意编程暑期班',
  teacher: 'Tom 老师',
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
