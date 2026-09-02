/* eslint-disable @typescript-eslint/no-explicit-any -- 文件记录来自可扩展聚合接口 */
import { ArrowDownToLine, ArrowLeft, FileArchive, FileCode2, FileImage, FileText, FolderDown, Trash2, UploadCloud } from 'lucide-react'
import { useMemo, useState } from 'react'
import { studentAction, uploadStudentSharedFile, type StudentFeatureState } from '../../lib/featureApi'

function FileIcon({name}:{name:string}) {
  const ext=name.split('.').pop()?.toLowerCase()
  if(ext==='py') return <FileCode2/>
  if(ext==='zip'||ext==='rar'||ext==='7z') return <FileArchive/>
  if(['png','jpg','jpeg','gif','webp'].includes(ext||'')) return <FileImage/>
  return <FileText/>
}

function sizeLabel(value:number){if(value>=1024*1024)return `${(value/1024/1024).toFixed(1)} MB`;return `${Math.max(1,Math.ceil(value/1024))} KB`}

export default function StudentFiles({features,onRefresh,onBack}:{features:StudentFeatureState|null;onRefresh:()=>Promise<void>;onBack:()=>void}){
  const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [query,setQuery]=useState('')
  const files=useMemo(()=>(features?.files||[]).filter((item:any)=>String(item.displayName||'').toLowerCase().includes(query.trim().toLowerCase())),[features,query])
  const upload=async()=>{if(!file||!features)return;setBusy(true);try{await uploadStudentSharedFile(file,features.classId,'class');setFile(null);await onRefresh();alert('文件已上传到班级文件区。')}catch(reason){alert(reason instanceof Error?reason.message:'上传失败')}finally{setBusy(false)}}
  const remove=async(id:string)=>{if(!confirm('确定删除自己上传的这个文件吗？'))return;await studentAction(`/student/files/${id}`,'DELETE');await onRefresh()}
  return <main className="student-module-page student-file-center"><header><button onClick={onBack}><ArrowLeft/>返回冒险大厅</button><div><small>CLASS FILE STATION</small><h1>文件下载</h1><p>下载老师分享的资料，也可以把作品文件分享给班级。</p></div></header><section className="file-center-hero"><div><FolderDown/><span><small>班级资料站</small><strong>{features?.files.length||0} 个文件可用</strong></span></div><div className="student-shared-upload"><label><UploadCloud/>{file?file.name:'选择 Python、ZIP、图片或文档'}<input hidden type="file" accept=".py,.zip,.pdf,.txt,.doc,.docx,.ppt,.pptx,image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button disabled={!file||busy} onClick={upload}>{busy?'上传中…':'上传文件'}</button></div></section><div className="file-center-tools"><strong>全部文件</strong><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索文件名称"/></div><section className="file-download-list">{files.map((item:any)=><article key={item.id}><span className="download-file-icon"><FileIcon name={item.displayName}/></span><div><strong>{item.displayName}</strong><small>{item.ownerKind==='admin'?'老师发布':`${item.ownerName||'同学'}分享`} · {sizeLabel(Number(item.size||0))} · {new Date(item.createdAt||item.created_at).toLocaleDateString('zh-CN')}</small></div><a href={item.downloadUrl} download><ArrowDownToLine/>下载</a>{item.ownerKind==='student'&&item.ownerId===features?.student.id&&<button className="delete-own-file" title="删除自己的文件" onClick={()=>remove(item.id)}><Trash2/></button>}</article>)}{!files.length&&<div className="portal-empty"><FolderDown/><strong>{query?'没有找到这个文件':'暂时没有班级文件'}</strong><span>{query?'换个关键词试试。':'老师上传资料后会显示在这里。'}</span></div>}</section></main>
}
