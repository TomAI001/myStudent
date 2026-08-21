import { CalendarDays, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../../../components/admin/Modal'
import RichTextEditor from '../../../components/admin/RichTextEditor'
import { EmptyState, PageLoader } from '../../../components/States'
import { getHomework } from '../../../lib/data'
import { supabase } from '../../../lib/supabase'
import type { Homework } from '../../../lib/types'

const emptyForm = { title: '', assigned_date: '', content_html: '' }

export default function HomeworkPanel({ classId, termId }: { classId: string; termId: string }) {
  const [items, setItems] = useState<Homework[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Homework | 'new' | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!termId) return setItems([])
    setLoading(true); setItems(await getHomework(termId)); setLoading(false)
  }, [termId])
  useEffect(() => { load() }, [load])
  const filtered = useMemo(() => items.filter((item) => item.title.includes(query.trim())), [items, query])

  const open = (item: Homework | 'new') => {
    setEditing(item)
    setForm(item === 'new' ? { ...emptyForm, assigned_date: new Date().toISOString().slice(0, 10) } : { title: item.title, assigned_date: item.assigned_date, content_html: item.content_html })
  }
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    const payload = { ...form, class_id: classId, term_id: termId }
    const response = editing === 'new' ? await supabase.from('homework').insert(payload) : await supabase.from('homework').update(payload).eq('id', (editing as Homework).id)
    setSaving(false)
    if (response.error) return window.alert(response.error.message)
    setEditing(null); await load()
  }
  const remove = async (item: Homework) => {
    if (!window.confirm(`确定删除作业“${item.title}”吗？`)) return
    const { error } = await supabase.from('homework').delete().eq('id', item.id)
    if (error) window.alert(error.message); else await load()
  }

  if (!classId || !termId) return <EmptyState title="请先选择班级和学期" description="每日作业会按学期归档。" />

  return (
    <div>
      <div className="admin-page-heading"><div><small>DAILY HOMEWORK</small><h1>每日作业</h1><p>按班级统一布置，保存后家长端立即可见。</p></div><button className="admin-primary" type="button" onClick={() => open('new')}><Plus /> 布置作业</button></div>
      <div className="admin-table-card">
        <div className="table-tools"><div className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索作业标题" /></div><span>本学期共 {items.length} 项作业</span></div>
        {loading ? <PageLoader label="正在读取作业…" /> : filtered.length ? <table className="admin-table"><thead><tr><th>日期</th><th>作业标题</th><th>公开状态</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><span className="date-cell"><CalendarDays /> {item.assigned_date}</span></td><td><strong>{item.title}</strong></td><td><span className="status-badge"><i /> 已公开</span></td><td><div className="row-actions"><button type="button" title="编辑" onClick={() => open(item)}><Pencil /></button><button type="button" title="删除" className="danger" onClick={() => remove(item)}><Trash2 /></button></div></td></tr>)}</tbody></table> : <EmptyState title={query ? '没有匹配的作业' : '还没有布置作业'} description={query ? '换一个关键词试试。' : '点击右上角“布置作业”发布第一项练习。'} />}
      </div>
      {editing && <Modal wide title={editing === 'new' ? '布置每日作业' : '编辑每日作业'} subtitle="支持标题、列表、代码、图片、附件和链接。" onClose={() => setEditing(null)}><form className="admin-form" onSubmit={save}><div className="form-row"><label className="grow">作业标题<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：完成今天的迷宫挑战" required /></label><label>布置日期<input type="date" value={form.assigned_date} onChange={(e) => setForm({ ...form, assigned_date: e.target.value })} required /></label></div><RichTextEditor label="作业内容" value={form.content_html} onChange={(content_html) => setForm((current) => ({ ...current, content_html }))} uploadFolder={`homework/${termId}`} /><div className="form-actions sticky"><button type="button" onClick={() => setEditing(null)}>取消</button><button className="admin-primary" disabled={saving}>{saving ? '保存中…' : '保存并公开'}</button></div></form></Modal>}
    </div>
  )
}
