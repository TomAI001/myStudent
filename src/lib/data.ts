import type {
  ClassGroup,
  Homework,
  Lesson,
  LessonRecordWithMedia,
  MediaItem,
  Student,
  StudentLessonRecord,
  Term,
} from './types'

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

async function read<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`)
  return data
}

async function getItems<T>(path: string): Promise<T[]> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' })
  return (await read<{ items: T[] }>(response)).items
}

async function adminWrite<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method, credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return read<T>(response)
}

export function getClasses() { return getItems<ClassGroup>('/data/classes') }

export async function getClass(id: string): Promise<ClassGroup | null> {
  const response = await fetch(`${API_BASE}/data/classes/${encodeURIComponent(id)}`, { credentials: 'include' })
  return (await read<{ item: ClassGroup | null }>(response)).item
}

export function getTerms(classId: string) {
  return getItems<Term>(`/data/terms?class_id=${encodeURIComponent(classId)}`)
}

export function getStudents(classId: string) {
  return getItems<Student>(`/data/students?class_id=${encodeURIComponent(classId)}`)
}

export async function getStudent(id: string): Promise<Student | null> {
  const response = await fetch(`${API_BASE}/data/students/${encodeURIComponent(id)}`, { credentials: 'include' })
  return (await read<{ item: Student | null }>(response)).item
}

export function getLessons(termId: string) {
  return getItems<Lesson>(`/data/lessons?term_id=${encodeURIComponent(termId)}`)
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const response = await fetch(`${API_BASE}/data/lessons/${encodeURIComponent(id)}`, { credentials: 'include' })
  return (await read<{ item: Lesson | null }>(response)).item
}

export function getHomework(termId: string) {
  return getItems<Homework>(`/data/homework?term_id=${encodeURIComponent(termId)}`)
}

export async function getStudentRecords(studentId: string, lessonIds: string[]) {
  if (!lessonIds.length) return [] as LessonRecordWithMedia[]
  const query = new URLSearchParams({ student_id: studentId, lesson_ids: lessonIds.join(',') })
  return getItems<LessonRecordWithMedia>(`/data/records?${query}`)
}

export async function getRecord(studentId: string, lessonId: string) {
  const query = new URLSearchParams({ student_id: studentId, lesson_id: lessonId })
  const response = await fetch(`${API_BASE}/data/records/one?${query}`, { credentials: 'include' })
  return (await read<{ item: LessonRecordWithMedia | null }>(response)).item
}

export async function upsertRecord(payload: Omit<StudentLessonRecord, 'id' | 'created_at' | 'updated_at'>) {
  return (await adminWrite<{ item: StudentLessonRecord }>('/admin/records', 'PUT', payload)).item
}

export async function createClass(payload: { name: string; description: string }) {
  return (await adminWrite<{ item: ClassGroup }>('/admin/classes', 'POST', payload)).item
}

export async function createTerm(payload: { class_id: string; name: string; start_date: string; end_date: string }) {
  return (await adminWrite<{ item: Term }>('/admin/terms', 'POST', payload)).item
}

export async function createStudent(payload: Omit<Student, 'id' | 'created_at'> & { id?: string }) {
  return (await adminWrite<{ item: Student }>('/admin/students', 'POST', payload)).item
}

export async function updateStudent(id: string, payload: Partial<Omit<Student, 'id' | 'created_at'>>) {
  return (await adminWrite<{ item: Student }>(`/admin/students/${encodeURIComponent(id)}`, 'PATCH', payload)).item
}

export async function createLesson(payload: Omit<Lesson, 'id' | 'created_at'>) {
  return (await adminWrite<{ item: Lesson }>('/admin/lessons', 'POST', payload)).item
}

export async function updateLesson(id: string, payload: Partial<Omit<Lesson, 'id' | 'created_at'>>) {
  return (await adminWrite<{ item: Lesson }>(`/admin/lessons/${encodeURIComponent(id)}`, 'PATCH', payload)).item
}

export async function deleteLesson(id: string) {
  await adminWrite<{ ok: boolean }>(`/admin/lessons/${encodeURIComponent(id)}`, 'DELETE')
}

export async function addMedia(payload: Omit<MediaItem, 'id' | 'created_at'>) {
  return (await adminWrite<{ item: MediaItem }>('/admin/media-items', 'POST', payload)).item
}

export async function removeMedia(item: MediaItem) {
  await adminWrite<{ ok: boolean }>(`/admin/media-items/${encodeURIComponent(item.id)}`, 'DELETE')
}
