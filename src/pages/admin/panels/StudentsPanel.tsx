import { CalendarDays, Camera, Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../../../components/admin/Modal'
import { EmptyState, PageLoader } from '../../../components/States'
import { getStudents } from '../../../lib/data'
import { supabase } from '../../../lib/supabase'
import type { Student } from '../../../lib/types'
import { deleteUploadedFile, uploadPublicFile } from '../../../lib/uploads'

const emptyForm = { name: '', joined_on: '', avatar_url: null as string | null, avatar_path: null as string | null }

export default function StudentsPanel({ classId }: { classId: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Student | 'new' | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const load = useCallback(async () => {
    if (!classId) return setStudents([])
    setLoading(true); setStudents(await getStudents(classId)); setLoading(false)
  }, [classId])
  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => students.filter((item) => item.name.includes(query.trim())), [students, query])
  const open = (student: Student | 'new') => {
    setEditing(student)
    setForm(student === 'new' ? { ...emptyForm, joined_on: new Date().toISOString().slice(0, 10) } : { name: student.name, joined_on: student.joined_on, avatar_url: student.avatar_url, avatar_path: student.avatar_path })
  }

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true)
    try {
      const result = await uploadPublicFile(file, 'avatars')
      setForm((current) => ({ ...current, avatar_url: result.url, avatar_path: result.path }))
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : '头像上传失败') }
    finally { setAvatarUploading(false) }
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    const payload = { ...form, class_id: classId }
    const response = editing === 'new' ? await supabase.from('students').insert(payload) : await supabase.from('students').update(payload).eq('id', editing!.id)
    setSaving(false)
    if (response.error) return window.alert(response.error.message)
    setEditing(null); await load()
  }

  const remove = async (student: Student) => {
    if (!window.confirm(`确定删除“${student.name}”吗？该学生的评价和媒体记录也会一并删除。`)) return
    if (student.avatar_path) {
      const removedFromServer = await deleteUploadedFile(student.avatar_path)
      if (!removedFromServer) await supabase.storage.from('student-media').remove([student.avatar_path])
    }
    const { error } = await supabase.from('students').delete().eq('id', student.id)
    if (error) window.alert(error.message); else await load()
  }

  if (!classId) return <EmptyState title="请先选择班级" description="选择或创建班级后，再添加学生。" />

  return (
    <div>
      <div className="admin-page-heading"><div><small>STUDENTS</small><h1>学生档案</h1><p>管理姓名、头像、班级和入班日期。</p></div><button className="admin-primary" type="button" onClick={() => open('new')}><Plus /> 添加学生</button></div>
      <div className="admin-table-card">
        <div className="table-tools"><div className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生姓名" /></div><span>共 {students.length} 位学生</span></div>
        {loading ? <PageLoader label="正在读取学生档案…" /> : filtered.length ? (
          <table className="admin-table"><thead><tr><th>学生</th><th>班级归属</th><th>入班日期</th><th>展示状态</th><th /></tr></thead><tbody>{filtered.map((student) => <tr key={student.id}><td><div className="student-cell"><span>{student.avatar_url ? <img src={student.avatar_url} alt="" /> : <UserRound />}</span><strong>{student.name}</strong></div></td><td>当前班级</td><td><span className="date-cell"><CalendarDays /> {student.joined_on}</span></td><td><span className="status-badge"><i /> 已公开</span></td><td><div className="row-actions"><button type="button" title="编辑" onClick={() => open(student)}><Pencil /></button><button type="button" title="删除" className="danger" onClick={() => remove(student)}><Trash2 /></button></div></td></tr>)}</tbody></table>
        ) : <EmptyState title={query ? '没有匹配的学生' : '还没有学生档案'} description={query ? '换一个名字试试。' : '点击右上角“添加学生”开始录入。'} />}
      </div>

      {editing && <Modal title={editing === 'new' ? '添加学生' : `编辑 ${editing.name}`} subtitle="头像可上传站外生成的 Q 版图片或普通照片。" onClose={() => setEditing(null)}><form className="admin-form" onSubmit={save}><div className="avatar-uploader"><span>{form.avatar_url ? <img src={form.avatar_url} alt="头像预览" /> : <UserRound />}</span><div><label className="upload-avatar-button"><Camera /> {avatarUploading ? '上传中…' : '上传头像'}<input hidden type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])} /></label><small>建议使用正方形图片，系统会自动压缩。</small></div></div><label>学生姓名<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="请输入真实姓名" /></label><label>入班日期<input type="date" value={form.joined_on} onChange={(event) => setForm({ ...form, joined_on: event.target.value })} required /></label><div className="form-actions"><button type="button" onClick={() => setEditing(null)}>取消</button><button className="admin-primary" disabled={saving || avatarUploading}>{saving ? '保存中…' : '保存学生'}</button></div></form></Modal>}
    </div>
  )
}
