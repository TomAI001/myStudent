import { ArchiveRestore, CalendarDays, Camera, Download, Eye, EyeOff, FileSpreadsheet, KeyRound, MoveRight, Pencil, Plus, Search, Trash2, Upload, UserRound, UserRoundCog } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../../../components/admin/Modal'
import { EmptyState, PageLoader } from '../../../components/States'
import { createStudent, getClasses, getStudents, updateStudent } from '../../../lib/data'
import { adminAction, commitStudentImport, downloadStudentImportTemplate, getAdminFeatureState, previewStudentImport, type FeatureAccount, type StudentImportRow } from '../../../lib/featureApi'
import type { Student } from '../../../lib/types'
import { uploadPublicFile } from '../../../lib/uploads'

const emptyForm = { name: '', joined_on: '', avatar_url: null as string | null, avatar_path: null as string | null }

export default function StudentsPanel({ classId }: { classId: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Student | 'new' | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [accounts, setAccounts] = useState<FeatureAccount[]>([])
  const [classes, setClasses] = useState<{id:string;name:string}[]>([])
  const [transferTargets, setTransferTargets] = useState<Record<string,string>>({})
  const [accountEditing,setAccountEditing]=useState<Student|null>(null)
  const [accountForm,setAccountForm]=useState({username:'',password:''})
  const [accountSaving,setAccountSaving]=useState(false)
  const [showPassword,setShowPassword]=useState(false)
  const [importOpen,setImportOpen]=useState(false)
  const [importRows,setImportRows]=useState<StudentImportRow[]>([])
  const [importFileName,setImportFileName]=useState('')
  const [importBlankRows,setImportBlankRows]=useState(0)
  const [importLoading,setImportLoading]=useState(false)

  const load = useCallback(async () => {
    if (!classId) return setStudents([])
    setLoading(true)
    const [studentList, featureState, classList] = await Promise.all([getStudents(classId), getAdminFeatureState(classId), getClasses()])
    setStudents(studentList); setAccounts(featureState.accounts); setClasses(classList); setLoading(false)
  }, [classId])
  useEffect(() => { load() }, [load])

  const recycled = accounts.filter((item) => item.deletedAt)
  const accountFor = useCallback((student:Student) => accounts.find((item) => item.studentId === student.id) || accounts.find((item) => item.studentName === student.name), [accounts])
  const filtered = useMemo(() => students.filter((item) => {
    const account = accountFor(item)
    return (!account || (!account.deletedAt && account.classIds.includes(classId))) && item.name.includes(query.trim())
  }), [students, accountFor, classId, query])
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
    try {
      if (editing === 'new') await createStudent(payload)
      else await updateStudent((editing as Student).id, payload)
      setEditing(null); await load()
    } catch (reason) { window.alert(reason instanceof Error ? reason.message : '学生档案保存失败。') }
    finally { setSaving(false) }
  }

  const remove = async (student: Student) => {
    if (!window.confirm(`将“${student.name}”放入回收站吗？账号会立即停用，30天内可完整恢复。`)) return
    const account = accountFor(student)
    try {
      if(account) await adminAction(`/admin/student-accounts/${account.id}/recycle`)
      else await adminAction(`/admin/student-profiles/${student.id}/recycle`,'POST',{studentName:student.name,classId})
      await load()
    }
    catch (reason) { window.alert(reason instanceof Error ? reason.message : '操作失败') }
  }

  const openAccount=(student:Student)=>{const account=accountFor(student);setAccountEditing(student);setAccountForm({username:account?.credentialsAssigned?account.username:'',password:''});setShowPassword(false)}
  const saveAccount=async(event:React.FormEvent)=>{
    event.preventDefault();if(!accountEditing)return;const account=accountFor(accountEditing);setAccountSaving(true)
    try{
      if(account?.credentialsAssigned){
        await adminAction(`/admin/student-accounts/${account.id}`,'PATCH',{studentId:accountEditing.id,studentName:accountEditing.name,username:accountForm.username,classIds:[classId],active:true})
        if(accountForm.password)await adminAction(`/admin/student-accounts/${account.id}/reset-password`,'POST',{password:accountForm.password})
      }else{
        if(!accountForm.password)throw new Error('首次分配账号时请填写初始密码。')
        await adminAction('/admin/student-accounts','POST',{studentId:accountEditing.id,studentName:accountEditing.name,username:accountForm.username,password:accountForm.password,classIds:[classId]})
      }
      setAccountEditing(null);await load()
    }catch(reason){window.alert(reason instanceof Error?reason.message:'账号保存失败')}
    finally{setAccountSaving(false)}
  }

  const transfer = async (student:Student) => {
    const account=accountFor(student);const target=transferTargets[student.id]
    if(!account||!target)return
    if(!window.confirm(`确定将“${student.name}”及其全部课程、作业、测评和积分转入目标班级吗？`))return
    try {
      await adminAction(`/admin/student-accounts/${account.id}/transfer`,'POST',{classId:target})
      await load()
    } catch(reason){window.alert(reason instanceof Error?reason.message:'转班失败')}
  }

  const restore=async(account:FeatureAccount)=>{try{await adminAction(`/admin/student-accounts/${account.id}/restore`);await load()}catch(reason){window.alert(reason instanceof Error?reason.message:'恢复失败')}}

  const selectImportFile=async(file:File)=>{
    setImportLoading(true);setImportFileName(file.name);setImportRows([])
    try{const result=await previewStudentImport(file);setImportRows(result.rows);setImportBlankRows(result.blankRowsSkipped)}
    catch(reason){window.alert(reason instanceof Error?reason.message:'Excel读取失败');setImportFileName('')}
    finally{setImportLoading(false)}
  }
  const confirmImport=async()=>{
    if(!importRows.length)return
    setImportLoading(true)
    try{
      const joined_on=new Date().toISOString().slice(0,10)
      await commitStudentImport(classId,importRows.map(row=>({studentId:crypto.randomUUID(),studentName:row.studentName,username:row.username})),joined_on)
      window.alert(`成功导入 ${importRows.length} 名学生，学生与家长初始密码均为 123456。`)
      setImportOpen(false);setImportRows([]);setImportFileName('');await load()
    }catch(reason){window.alert(reason instanceof Error?reason.message:'批量导入失败')}
    finally{setImportLoading(false)}
  }

  if (!classId) return <EmptyState title="请先选择班级" description="选择或创建班级后，再添加学生。" />

  return (
    <div>
      <div className="admin-page-heading"><div><small>STUDENTS</small><h1>学生档案</h1><p>管理姓名、头像、转班和回收站；删除后30天内可完整恢复。</p></div><div className="student-heading-actions"><button className="admin-secondary" type="button" onClick={()=>{setImportOpen(true);setImportRows([]);setImportFileName('')}}><FileSpreadsheet/>批量导入</button><button className="admin-primary" type="button" onClick={() => open('new')}><Plus /> 添加学生</button></div></div>
      <div className="admin-table-card">
        <div className="table-tools"><div className="search-box"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生姓名" /></div><span>共 {students.length} 位学生</span></div>
        {loading ? <PageLoader label="正在读取学生档案…" /> : filtered.length ? (
          <table className="admin-table"><thead><tr><th>学生</th><th>学生/家长账号</th><th>入班日期</th><th>一键转班</th><th /></tr></thead><tbody>{filtered.map((student) => {const account=accountFor(student);const assigned=Boolean(account?.credentialsAssigned);return <tr key={student.id}><td><div className="student-cell"><span>{student.avatar_url ? <img src={student.avatar_url} alt="" /> : <UserRound />}</span><strong>{student.name}</strong></div></td><td><div className="student-account-cell"><strong>{assigned?account?.username:'尚未分配'}</strong>{assigned&&<small>家长：{account?.parentUsername}</small>}<button type="button" onClick={()=>openAccount(student)}><KeyRound/>{assigned?'管理账号':'分配账号'}</button></div></td><td><span className="date-cell"><CalendarDays /> {student.joined_on}</span></td><td><div className="student-transfer"><select value={transferTargets[student.id]||''} onChange={event=>setTransferTargets({...transferTargets,[student.id]:event.target.value})}><option value="">选择目标班级</option>{classes.filter(item=>item.id!==classId).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={!account||!transferTargets[student.id]} onClick={()=>transfer(student)}><MoveRight/>转班</button></div></td><td><div className="row-actions"><button type="button" title="编辑档案" onClick={() => open(student)}><Pencil /></button><button type="button" title="放入回收站" className="danger" onClick={() => remove(student)}><Trash2 /></button></div></td></tr>})}</tbody></table>
        ) : <EmptyState title={query ? '没有匹配的学生' : '还没有学生档案'} description={query ? '换一个名字试试。' : '点击右上角“添加学生”开始录入。'} />}
      </div>

      <details className="recycle-bin student-profile-recycle"><summary><ArchiveRestore /> 学生回收站（{recycled.length}）</summary>{recycled.length?recycled.map(account=><div key={account.id}><strong>{account.studentName}</strong><small>删除时间 {new Date(account.deletedAt!).toLocaleString('zh-CN')} · 30天内保留全部资料</small><button onClick={()=>restore(account)}>恢复学生</button></div>):<p>回收站为空</p>}</details>

      {editing && <Modal title={editing === 'new' ? '添加学生' : `编辑 ${editing.name}`} subtitle="头像可上传站外生成的 Q 版图片或普通照片。" onClose={() => setEditing(null)}><form className="admin-form" onSubmit={save}><div className="avatar-uploader"><span>{form.avatar_url ? <img src={form.avatar_url} alt="头像预览" /> : <UserRound />}</span><div><label className="upload-avatar-button"><Camera /> {avatarUploading ? '上传中…' : '上传头像'}<input hidden type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])} /></label><small>建议使用正方形图片，系统会自动压缩。</small></div></div><label>学生姓名<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="请输入真实姓名" /></label><label>入班日期<input type="date" value={form.joined_on} onChange={(event) => setForm({ ...form, joined_on: event.target.value })} required /></label><div className="form-actions"><button type="button" onClick={() => setEditing(null)}>取消</button><button className="admin-primary" disabled={saving || avatarUploading}>{saving ? '保存中…' : '保存学生'}</button></div></form></Modal>}
      {accountEditing&&<Modal title={`管理 ${accountEditing.name} 的登录账号`} subtitle="学生与家长使用同一密码；家长账号自动在学生账号前加 a。" onClose={()=>setAccountEditing(null)}><form className="admin-form account-assignment-form" onSubmit={saveAccount}><div className="account-role-preview"><span><UserRoundCog/></span><div><small>学生账号</small><strong>{accountForm.username||'等待填写'}</strong></div><div><small>家长账号</small><strong>{accountForm.username?`a${accountForm.username}`:'自动生成'}</strong><em>{accountEditing.name}家长</em></div></div><label>学生登录账号<input value={accountForm.username} onChange={event=>setAccountForm({...accountForm,username:event.target.value})} required minLength={2} maxLength={32} placeholder="2—32位字母、数字、点、横线或下划线"/></label><label>{accountFor(accountEditing)?.credentialsAssigned?'新密码（留空则不修改）':'初始密码'}<div className="password-admin-field"><input type={showPassword?'text':'password'} value={accountForm.password} onChange={event=>setAccountForm({...accountForm,password:event.target.value})} minLength={accountFor(accountEditing)?.credentialsAssigned?0:6} placeholder={accountFor(accountEditing)?.credentialsAssigned?'留空保持原密码':'至少6位'} required={!accountFor(accountEditing)?.credentialsAssigned}/><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>{accountFor(accountEditing)?.credentialsAssigned&&<div className="current-password-card"><span>当前密码</span><strong>{showPassword?(accountFor(accountEditing)?.currentPassword||'旧密码无法还原，请重置'):'••••••••'}</strong><button type="button" onClick={()=>setShowPassword(!showPassword)}>{showPassword?'隐藏':'显示明文'}</button></div>}<div className="form-actions"><button type="button" onClick={()=>setAccountEditing(null)}>取消</button><button className="admin-primary" disabled={accountSaving}>{accountSaving?'保存中…':'保存账号'}</button></div></form></Modal>}
      {importOpen&&<Modal title="批量导入本班学生" subtitle="上传.xlsx名单后先核对账号，确认后才会写入学生档案。" onClose={()=>!importLoading&&setImportOpen(false)}><div className="student-import-modal"><div className="student-import-guide"><FileSpreadsheet/><div><strong>Excel只需要“学生姓名”一列</strong><small>账号按姓名拼音首字母生成；重名依次加1、2……</small></div><button type="button" onClick={()=>downloadStudentImportTemplate().catch(reason=>window.alert(reason.message))}><Download/>下载模板</button></div><label className="student-import-picker"><Upload/><span><strong>{importFileName||'选择 .xlsx 学生名单'}</strong><small>{importLoading?'正在读取并生成账号…':'空白行会自动跳过'}</small></span><input hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={importLoading} onChange={event=>event.target.files?.[0]&&selectImportFile(event.target.files[0])}/></label>{importRows.length>0&&<><div className="student-import-summary"><strong>准备导入 {importRows.length} 名学生</strong><span>跳过 {importBlankRows} 个空白行 · 初始密码统一为 123456</span></div><div className="student-import-preview"><table><thead><tr><th>行</th><th>学生姓名</th><th>学生账号</th><th>家长账号</th><th>初始密码</th></tr></thead><tbody>{importRows.map(row=><tr key={`${row.rowNumber}-${row.username}`}><td>{row.rowNumber}</td><td><strong>{row.studentName}</strong></td><td>{row.username}</td><td>{row.parentUsername}</td><td>{row.password}</td></tr>)}</tbody></table></div></>}<div className="form-actions"><button type="button" disabled={importLoading} onClick={()=>setImportOpen(false)}>取消</button><button type="button" className="admin-primary" disabled={!importRows.length||importLoading} onClick={confirmImport}>{importLoading?'处理中…':`确认导入 ${importRows.length||''} 人`}</button></div></div></Modal>}
    </div>
  )
}
