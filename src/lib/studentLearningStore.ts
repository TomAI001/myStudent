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

const lessonTwoAssessment: Assessment = {
  id: 'assessment-turtle-stars-02',
  classId: 'python-summer',
  title: '第二课 · 星光绘图师挑战',
  description: '从五角星、颜色填充和画笔移动出发，穿插 Python 英语单词闯关。',
  kind: 'course',
  durationMinutes: 20,
  maxAttempts: 3,
  startAt: '2026-08-23T08:00',
  endAt: '2027-08-30T22:00',
  published: true,
  questions: [
    { id: 'stars-angle', type: 'choice', title: '画五角星时，哪句代码能让海龟转向下一个尖角？', options: ['t.right(72)', 't.right(90)', 't.right(144)', 't.right(180)'], answer: 't.right(144)', points: 10 },
    { id: 'stars-fill-order', type: 'choice', title: '哪组代码能正确包住需要填充的图形？', options: ['end_fill() → 画图形 → begin_fill()', 'begin_fill() → 画图形 → end_fill()', '画图形 → begin_fill() → end_fill()', 'begin_fill() → end_fill() → 画图形'], answer: 'begin_fill() → 画图形 → end_fill()', points: 10 },
    { id: 'stars-move-clean', type: 'choice', title: '移动到新位置时，哪组代码不会留下连接线？', options: ['pendown() → goto() → penup()', 'goto() → penup() → pendown()', 'penup() → goto() → pendown()', 'forward() → goto() → right()'], answer: 'penup() → goto() → pendown()', points: 10 },
    { id: 'stars-size', type: 'choice', title: '调用 draw_star(x, y, size) 时，哪个参数控制星星大小？', options: ['x', 'y', 'size', 'draw_star'], answer: 'size', points: 10 },
    { id: 'stars-color-tool', type: 'choice', title: '想把星星内部填成金色，应该先使用哪句代码？', options: ['t.pencolor("gold")', 't.fillcolor("gold")', 't.bgcolor("gold")', 't.speed("gold")'], answer: 't.fillcolor("gold")', points: 10 },
    { id: 'word-forward', type: 'choice', title: '【英语单词】forward 在海龟代码中表示什么？', options: ['向前移动', '向右转', '抬起画笔', '填充颜色'], answer: '向前移动', points: 10 },
    { id: 'word-penup', type: 'blank', title: '【英语填空】“抬笔、不画线”的命令是 t.____()。', answer: 'penup', points: 10 },
    { id: 'word-goto', type: 'choice', title: '【英语单词】哪一个单词表示“移动到指定坐标”？', options: ['circle', 'range', 'goto', 'pensize'], answer: 'goto', points: 10 },
    { id: 'word-end-fill', type: 'blank', title: '【英语填空】结束并完成颜色填充的命令是 ____()。', answer: 'end_fill', points: 10 },
    { id: 'word-circle', type: 'choice', title: '【英语单词】哪句代码可以绘制半径为100的圆？', options: ['t.circle(100)', 't.forward(100)', 't.goto(100)', 't.range(100)'], answer: 't.circle(100)', points: 10 },
  ],
}

const lessonTwoPackage: CoursewarePackage = {
  id: 'courseware-lesson-02',
  classId: 'python-summer',
  title: '第二课 · 星光绘图师',
  fileName: 'lesson-02-stars.zip',
  openAt: '2026-08-23T08:00',
  published: true,
  createdAt: '2026-08-23T08:00:00',
}

const demoState: LearningState = {
  teachers: [
    { id: 'teacher-owner', name: '主管理员', email: 'admin@example.com', role: 'owner', classIds: ['*'], active: true },
    { id: 'teacher-tom', name: 'Tom 老师', email: 'tom@example.com', role: 'teacher', classIds: ['python-summer'], active: true },
  ],
  accounts: [],
  assessments: [lessonTwoAssessment, {
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
  coursewarePackages: [lessonTwoPackage, { id: 'courseware-demo', classId: 'python-summer', title: '让程序学会做选择', fileName: 'demo-courseware.zip', openAt: '2026-08-20T08:00', published: false, createdAt: '2026-08-19T12:00:00' }],
}

function cloneDemo() { return JSON.parse(JSON.stringify(demoState)) as LearningState }

export function getLearningState(): LearningState {
  try {
    window.localStorage.removeItem(LEGACY_STORE_KEY)
    const raw = window.localStorage.getItem(STORE_KEY)
    const state = raw ? { ...cloneDemo(), ...(JSON.parse(raw) as Partial<LearningState>) } : cloneDemo()
    state.accounts = []
    const lessonTwoIndex = state.assessments.findIndex((item) => item.id === lessonTwoAssessment.id)
    if (lessonTwoIndex < 0) state.assessments.unshift(JSON.parse(JSON.stringify(lessonTwoAssessment)) as Assessment)
    else state.assessments[lessonTwoIndex] = JSON.parse(JSON.stringify(lessonTwoAssessment)) as Assessment
    const oldDemoAssessment = state.assessments.find((item) => item.id === 'assessment-python-01')
    if (oldDemoAssessment) oldDemoAssessment.published = false
    const lessonTwoPackageIndex = state.coursewarePackages.findIndex((item) => item.id === lessonTwoPackage.id)
    if (lessonTwoPackageIndex < 0) state.coursewarePackages.unshift({ ...lessonTwoPackage })
    else state.coursewarePackages[lessonTwoPackageIndex] = { ...lessonTwoPackage }
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
