import { supabase } from './supabase'
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

export async function getClasses(): Promise<ClassGroup[]> {
  const { data, error } = await supabase.from('classes').select('*').order('created_at')
  fail(error)
  return (data ?? []) as ClassGroup[]
}

export async function getClass(id: string): Promise<ClassGroup | null> {
  const { data, error } = await supabase.from('classes').select('*').eq('id', id).maybeSingle()
  fail(error)
  return data as ClassGroup | null
}

export async function getTerms(classId: string): Promise<Term[]> {
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .eq('class_id', classId)
    .order('start_date', { ascending: false })
  fail(error)
  return (data ?? []) as Term[]
}

export async function getStudents(classId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .order('created_at')
  fail(error)
  return (data ?? []) as Student[]
}

export async function getStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).maybeSingle()
  fail(error)
  return data as Student | null
}

export async function getLessons(termId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('term_id', termId)
    .order('sequence_no')
  fail(error)
  return (data ?? []) as Lesson[]
}

export async function getHomework(termId: string): Promise<Homework[]> {
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
  const { error: storageError } = await supabase.storage.from('student-media').remove([item.storage_path])
  fail(storageError)
  const { error } = await supabase.from('media').delete().eq('id', item.id)
  fail(error)
}
