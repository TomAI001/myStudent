export type AssessmentQuestionType = 'choice' | 'true_false' | 'blank' | 'programming'

export interface StudentAccountRecord {
  id: string
  studentName: string
  username: string
  classIds: string[]
  active: boolean
}

export interface TeacherAccountRecord {
  id: string
  name: string
  email: string
  role: 'owner' | 'teacher'
  classIds: string[]
  active: boolean
}

export interface AssessmentQuestion {
  id: string
  type: AssessmentQuestionType
  title: string
  options?: string[]
  answer?: string
  points: number
}

export interface Assessment {
  id: string
  classId: string
  title: string
  description: string
  kind: 'course' | 'psychology'
  durationMinutes: number
  maxAttempts: number
  startAt: string
  endAt: string
  published: boolean
  questions: AssessmentQuestion[]
}

export interface AssessmentSubmission {
  id: string
  assessmentId: string
  studentId: string
  answers: Record<string, string>
  autoScore: number
  totalScore: number
  submittedAt: string
  attempt: number
  manualPending: boolean
}

export interface HomeworkAssignment {
  id: string
  classId: string
  title: string
  description: string
  dueAt: string
  maxSubmissions: number
  published: boolean
}

export interface HomeworkSubmission {
  id: string
  homeworkId: string
  studentId: string
  studentName: string
  code: string
  note: string
  photos: string[]
  video: string | null
  submittedAt: string
  attempt: number
  score: number | null
  feedback: string
}

export interface PlazaComment { id: string; studentId: string; studentName: string; content: string; createdAt: string }
export interface PlazaPost {
  id: string
  studentId: string
  studentName: string
  title: string
  description: string
  code: string
  mediaNames: string[]
  approved: boolean
  createdAt: string
  likedBy: string[]
  comments: PlazaComment[]
}

export interface ActivityItem {
  id: string
  title: string
  description: string
  date: string
  registrationType: 'internal' | 'external'
  externalUrl?: string
  registeredStudentIds: string[]
}

export interface CoursewarePackage {
  id: string
  classId: string
  title: string
  fileName: string
  openAt: string
  published: boolean
  createdAt: string
}

export interface LearningState {
  teachers: TeacherAccountRecord[]
  accounts: StudentAccountRecord[]
  assessments: Assessment[]
  assessmentSubmissions: AssessmentSubmission[]
  homework: HomeworkAssignment[]
  homeworkSubmissions: HomeworkSubmission[]
  plazaPosts: PlazaPost[]
  activities: ActivityItem[]
  coursewarePackages: CoursewarePackage[]
}

const STORE_KEY = 'growth-journal-learning-state-v3'
const LEGACY_STORE_KEY = 'growth-journal-learning-state-v2'
const changeEvent = 'growth-learning-state-change'

const demoState: LearningState = {
  teachers: [
    { id: 'teacher-owner', name: '主管理员', email: 'admin@example.com', role: 'owner', classIds: ['*'], active: true },
    { id: 'teacher-tom', name: 'Tom 老师', email: 'tom@example.com', role: 'teacher', classIds: ['python-summer'], active: true },
  ],
  accounts: [],
  assessments: [{
    id: 'assessment-python-01', classId: 'python-summer', title: 'Python 小勇士阶段测评', description: '选择题、判断题、程序填空和编程题综合挑战。', kind: 'course', durationMinutes: 30, maxAttempts: 2,
    startAt: '2026-08-01T08:00', endAt: '2027-08-30T22:00', published: true,
    questions: [
      { id: 'q-choice-1', type: 'choice', title: '下面哪个函数可以在屏幕上输出内容？', options: ['input()', 'print()', 'range()', 'int()'], answer: 'print()', points: 10 },
      { id: 'q-true-1', type: 'true_false', title: 'Python 使用缩进表示代码块。', options: ['正确', '错误'], answer: '正确', points: 10 },
      { id: 'q-blank-1', type: 'blank', title: '补全代码：for i ___ range(3):', answer: 'in', points: 10 },
      { id: 'q-code-1', type: 'programming', title: '编写程序，输出 1 到 5 的所有整数。', points: 20 },
    ],
  }, {
    id: 'assessment-psych-01', classId: 'python-summer', title: '学习状态小调查', description: '心理测评内容稍后由老师发布。', kind: 'psychology', durationMinutes: 10, maxAttempts: 1,
    startAt: '2026-08-01T08:00', endAt: '2027-08-30T22:00', published: false, questions: [],
  }],
  assessmentSubmissions: [],
  homework: [{ id: 'homework-if-01', classId: 'python-summer', title: '条件判断闯关作业', description: '编写一个程序：输入分数后，判断是否挑战成功。可以同时提交运行截图或演示视频。', dueAt: '2027-08-30T22:00', maxSubmissions: 3, published: true }],
  homeworkSubmissions: [],
  plazaPosts: [{ id: 'post-demo-01', studentId: 'demo-student-02', studentName: '陈星野', title: '会猜数字的小机器人', description: '我用循环和条件判断做了一个猜数字游戏，快来试一试！', code: 'secret = 7\nfor guess in [3, 9, 7]:\n    if guess == secret:\n        print("猜对啦！")\n        break\n    print("再试一次")', mediaNames: [], approved: true, createdAt: '2026-08-20T15:30:00', likedBy: ['peer-1', 'peer-2'], comments: [{ id: 'comment-demo-1', studentId: 'peer-1', studentName: '周一诺', content: '这个机器人真聪明！', createdAt: '2026-08-20T16:10:00' }] }],
  activities: [
    { id: 'activity-1', title: '校园科技节创意作品征集', description: '带上你的 Python 作品，在科技节展示奇思妙想。', date: '2026-09-20', registrationType: 'internal', registeredStudentIds: [] },
    { id: 'activity-2', title: '蓝桥杯青少组赛事资讯', description: '查看比赛介绍、组别和最新活动安排。', date: '2026-10-12', registrationType: 'external', externalUrl: 'https://dasai.lanqiao.cn/', registeredStudentIds: [] },
  ],
  coursewarePackages: [{ id: 'courseware-demo', classId: 'python-summer', title: '让程序学会做选择', fileName: 'demo-courseware.zip', openAt: '2026-08-20T08:00', published: true, createdAt: '2026-08-19T12:00:00' }],
}

function cloneDemo() { return JSON.parse(JSON.stringify(demoState)) as LearningState }

export function getLearningState(): LearningState {
  try {
    window.localStorage.removeItem(LEGACY_STORE_KEY)
    const raw = window.localStorage.getItem(STORE_KEY)
    const state = raw ? { ...cloneDemo(), ...(JSON.parse(raw) as Partial<LearningState>) } : cloneDemo()
    state.accounts = []
    return state
  } catch { return cloneDemo() }
}

export function saveLearningState(state: LearningState) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(changeEvent))
}

export function updateLearningState(change: (state: LearningState) => LearningState) {
  const next = change(getLearningState()); saveLearningState(next); return next
}

export function subscribeLearningState(listener: () => void) {
  window.addEventListener(changeEvent, listener); return () => window.removeEventListener(changeEvent, listener)
}

export function createId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

export function submitAssessment(assessment: Assessment, studentId: string, answers: Record<string, string>) {
  const state = getLearningState(); const previous = state.assessmentSubmissions.filter((item) => item.assessmentId === assessment.id && item.studentId === studentId)
  let autoScore = 0; let manualPending = false
  assessment.questions.forEach((question) => {
    if (question.type === 'programming') manualPending = true
    else if ((answers[question.id] || '').trim().toLowerCase() === (question.answer || '').trim().toLowerCase()) autoScore += question.points
  })
  const submission: AssessmentSubmission = { id: createId('assessment-submit'), assessmentId: assessment.id, studentId, answers, autoScore, totalScore: assessment.questions.reduce((sum, item) => sum + item.points, 0), submittedAt: new Date().toISOString(), attempt: previous.length + 1, manualPending }
  state.assessmentSubmissions.push(submission); saveLearningState(state); return submission
}
