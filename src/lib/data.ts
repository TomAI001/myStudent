import { supabase } from './supabase'
import { deleteUploadedFile } from './uploads'
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

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

const localAcceptance = import.meta.env.VITE_LOCAL_ACCEPTANCE === 'true'
const localCache = new Map<string, unknown>()
async function localData<T>(name: string): Promise<T> {
  if (localCache.has(name)) return localCache.get(name) as T
  const response = await fetch(`${import.meta.env.BASE_URL}local-seed/${name}.json`)
  if (!response.ok) throw new Error(`本地验收数据 ${name} 读取失败`)
  const value = await response.json() as T
  localCache.set(name, value)
  return value
}
function asArray<T>(value: T | T[]): T[] {
  const result:T[]=[]
  const visit=(item:unknown)=>{if(Array.isArray(item))item.forEach(visit);else if(item!=null)result.push(item as T)}
  visit(value)
  return result
}

export async function getClasses(): Promise<ClassGroup[]> {
  if (localAcceptance) return asArray(await localData<ClassGroup | ClassGroup[]>('classes'))
  const { data, error } = await supabase.from('classes').select('*').order('created_at')
  fail(error)
  return (data ?? []) as ClassGroup[]
}

export async function getClass(id: string): Promise<ClassGroup | null> {
  if (localAcceptance) return (await getClasses()).find((item) => item.id === id) ?? null
  const { data, error } = await supabase.from('classes').select('*').eq('id', id).maybeSingle()
  fail(error)
  return data as ClassGroup | null
}

export async function getTerms(classId: string): Promise<Term[]> {
  if (localAcceptance) return asArray(await localData<Term | Term[]>('terms')).filter((item) => item.class_id === classId)
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .eq('class_id', classId)
    .order('start_date', { ascending: false })
  fail(error)
  return (data ?? []) as Term[]
}

export async function getStudents(classId: string): Promise<Student[]> {
  if (localAcceptance) return asArray(await localData<Student | Student[]>('students')).filter((item) => item.class_id === classId)
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('created_at')
  fail(error)
  return (data ?? []) as Student[]
}

export async function getStudent(id: string): Promise<Student | null> {
  if (localAcceptance) return asArray(await localData<Student | Student[]>('students')).find((item) => item.id === id) ?? null
  const { data, error } = await supabase.from('students').select('*').eq('id', id).maybeSingle()
  fail(error)
  return data as Student | null
}

export async function getLessons(termId: string): Promise<Lesson[]> {
  if (localAcceptance) return asArray(await localData<Lesson | Lesson[]>('lessons')).filter((item) => item.term_id === termId).sort((a,b)=>a.sequence_no-b.sequence_no)
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('term_id', termId)
    .order('sequence_no')
  fail(error)
  return (data ?? []) as Lesson[]
}

export async function getHomework(termId: string): Promise<Homework[]> {
  if (localAcceptance) return asArray(await localData<Homework | Homework[]>('homework')).filter((item) => item.term_id === termId)
  const { data, error } = await supabase
    .from('homework')
    .select('*')
    .eq('term_id', termId)
    .order('assigned_date', { ascending: false })
  fail(error)
  return (data ?? []) as Homework[]
}

export async function getStudentRecords(studentId: string, lessonIds: string[]) {
  if (!lessonIds.length) return [] as LessonRecordWithMedia[]
  if (localAcceptance) {
    const records=asArray(await localData<StudentLessonRecord | StudentLessonRecord[]>('student_lesson_records')).filter((item)=>item.student_id===studentId&&lessonIds.includes(item.lesson_id))
    const media=asArray(await localData<MediaItem | MediaItem[]>('media'))
    return records.map((item)=>({...item,media:media.filter((entry)=>entry.record_id===item.id).sort((a,b)=>a.sort_order-b.sort_order)})) as LessonRecordWithMedia[]
  }
  const { data, error } = await supabase
    .from('student_lesson_records')
    .select('*, media(*)')
    .eq('student_id', studentId)
    .in('lesson_id', lessonIds)
  fail(error)
  return ((data ?? []) as LessonRecordWithMedia[]).map((item) => ({
    ...item,
    media: (item.media ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }))
}

export async function getRecord(studentId: string, lessonId: string) {
  if (localAcceptance) return (await getStudentRecords(studentId,[lessonId]))[0] ?? null
  const { data, error } = await supabase
    .from('student_lesson_records')
    .select('*, media(*)')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  fail(error)
  return data as LessonRecordWithMedia | null
}

export async function upsertRecord(
  payload: Omit<StudentLessonRecord, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data, error } = await supabase
    .from('student_lesson_records')
    .upsert(payload, { onConflict: 'lesson_id,student_id' })
    .select()
    .single()
  fail(error)
  return data as StudentLessonRecord
}

export async function addMedia(payload: Omit<MediaItem, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('media').insert(payload).select().single()
  fail(error)
  return data as MediaItem
}

export async function removeMedia(item: MediaItem) {
  const removedFromServer = await deleteUploadedFile(item.storage_path)
  if (!removedFromServer) {
    const { error: storageError } = await supabase.storage.from('student-media').remove([item.storage_path])
    fail(storageError)
  }
  const { error } = await supabase.from('media').delete().eq('id', item.id)
  fail(error)
}
