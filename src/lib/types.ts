export type AbilityKey =
  | 'thinking_score'
  | 'focus_score'
  | 'creativity_score'
  | 'coding_score'
  | 'motivation_score'

export interface ClassGroup {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Term {
  id: string
  class_id: string
  name: string
  start_date: string
  end_date: string
  created_at: string
}

export interface Student {
  id: string
  class_id: string
  name: string
  avatar_url: string | null
  avatar_path: string | null
  joined_on: string
  created_at: string
}

export interface Lesson {
  id: string
  class_id: string
  term_id: string
  sequence_no: number
  title: string
  lesson_date: string
  summary: string | null
  content_html: string
  created_at: string
}

export interface StudentLessonRecord {
  id: string
  lesson_id: string
  student_id: string
  comment: string
  thinking_score: number
  focus_score: number
  creativity_score: number
  coding_score: number
  motivation_score: number
  created_at: string
  updated_at: string
}

export interface MediaItem {
  id: string
  record_id: string
  kind: 'image' | 'video'
  url: string
  storage_path: string
  caption: string | null
  sort_order: number
  created_at: string
}

export interface Homework {
  id: string
  class_id: string
  term_id: string
  title: string
  assigned_date: string
  content_html: string
  created_at: string
}

export interface LessonRecordWithMedia extends StudentLessonRecord {
  media: MediaItem[]
}

export interface StudentLessonView {
  lesson: Lesson
  record: LessonRecordWithMedia | null
}
