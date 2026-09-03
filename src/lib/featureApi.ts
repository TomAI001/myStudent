/* eslint-disable @typescript-eslint/no-explicit-any -- 后端聚合状态包含多种可扩展记录 */
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

async function headers(json = true): Promise<Record<string, string>> {
  const local = import.meta.env.VITE_ADMIN_TEST_TOKEN?.trim()
  if (local) return { ...(json ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${local}` }
  return json ? { 'Content-Type': 'application/json' } : {}
}

async function read<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`)
  return data
}

export type FeatureAccount = { id:string; studentId:string|null; studentName:string; username:string; classIds:string[]; active:boolean; points:number; deletedAt:string|null; credentialsAssigned:boolean; currentPassword?:string|null; parentUsername?:string|null; parentName?:string }
export type ClassResource = { id:string; kind:'course'|'assessment'|'typing'|'homework'|'file'|'community'; sourceId:string|null; title:string; description:string; payload:Record<string,unknown>; assigned:boolean; enabled:boolean }
export type FeatureCourse = { id:string; class_id:string; sequence:number; title:string; subtitle:string; path:string; published:boolean }
export type FeatureQuestion = { id:string; type?:'choice'|'programming'; points?:number; title:string; options?:string[]; answer?:string; starterCode?:string }
export type FeatureAssessment = { id:string; classId:string; lessonId:string; title:string; description:string; published:boolean; questions:FeatureQuestion[] }
export type TypingProgress = { account_id:string; student_name?:string; level:number; best_speed:number; best_accuracy:number; completed:boolean; attempts:number; updated_at:string }
export type AttendanceStatus = 'unmarked'|'present'|'leave'
export type AttendanceRecord = { sessionId:string; studentKey:string; accountId:string|null; studentId:string|null; studentName:string; status:AttendanceStatus; source:'system'|'auto'|'manual'; updatedAt:string }
export type AttendanceSession = { id:string; classId:string; className:string; termId:string; termName:string; date:string; courseId:string|null; courseTitle:string; state:'open'|'closed'; createdAt:string; updatedAt:string; counts:Record<AttendanceStatus,number>; records:AttendanceRecord[] }
export type StudentImportRow = { rowNumber:number; studentName:string; username:string; parentUsername:string; password:string }
export type FeatureState = {
  accounts:FeatureAccount[]; courses:FeatureCourse[]; assessments:FeatureAssessment[]; attempts:any[];
  homework:any[]; submissions:any[]; posts:any[]; files:any[]; pointEvents:any[]; typingProgress:TypingProgress[]; resourceLibrary:ClassResource[]; deepseekConfigured:boolean
}
export type StudentFeatureState = {
  student:FeatureAccount; classId:string; courses:FeatureCourse[]; progress:any[]; assessments:FeatureAssessment[];
  attempts:any[]; homework:any[]; submissions:any[]; posts:any[]; files:any[]; leaderboard:any[]; projects:any[]; typingProgress:TypingProgress[]; typingEnabled:boolean; communityEnabled:boolean
}

export async function getAdminFeatureState(classId:string) {
  return read<FeatureState>(await fetch(`${API_BASE}/admin/feature-state?class_id=${encodeURIComponent(classId)}`, { headers:await headers(false), credentials:'include' }))
}
export async function getStudentFeatureState(classId='') { return read<StudentFeatureState>(await fetch(`${API_BASE}/student/feature-state${classId?`?class_id=${encodeURIComponent(classId)}`:''}`, { credentials:'include' })) }
export async function adminAction(path:string, method='POST', body?:unknown) {
  return read<any>(await fetch(`${API_BASE}${path}`, { method, headers:await headers(body !== undefined), credentials:'include', body:body === undefined?undefined:JSON.stringify(body) }))
}
export async function studentAction(path:string, method='POST', body?:unknown) {
  return read<any>(await fetch(`${API_BASE}${path}`, { method, credentials:'include', headers:body === undefined?undefined:{'Content-Type':'application/json'}, body:body === undefined?undefined:JSON.stringify(body) }))
}
export async function uploadSharedFile(file:File,classId:string) {
  const form=new FormData();form.append('file',file);form.append('classId',classId)
  return read<any>(await fetch(`${API_BASE}/files`,{method:'POST',headers:await headers(false),body:form,credentials:'include'}))
}
export async function uploadCoursePackage(payload:{file:File;classId:string;title:string;subtitle:string;sequence:number;syncAssessment:boolean}) {
  const form=new FormData();form.append('file',payload.file);form.append('classId',payload.classId);form.append('title',payload.title);form.append('subtitle',payload.subtitle);form.append('sequence',String(payload.sequence));form.append('syncAssessment',String(payload.syncAssessment))
  return read<{ok:boolean;courseResourceId:string;assessmentResourceId:string|null;path:string;message:string}>(await fetch(`${API_BASE}/admin/course-packages`,{method:'POST',headers:await headers(false),body:form,credentials:'include'}))
}
export async function uploadStudentSharedFile(file:File,classId:string,purpose:'class'|'homework'='class') {
  const form=new FormData();form.append('file',file);form.append('classId',classId);form.append('purpose',purpose)
  return read<any>(await fetch(`${API_BASE}/files`,{method:'POST',body:form,credentials:'include'}))
}
export async function generateCourseDraft(payload:{title:string;prompt:string;style:string;ppt:File|null;url?:string}) {
  const form=new FormData();form.append('title',payload.title);form.append('prompt',payload.prompt);form.append('style',payload.style);if(payload.ppt)form.append('ppt',payload.ppt);if(payload.url?.trim())form.append('url',payload.url.trim())
  return read<{title:string;content:string;style:string}>(await fetch(`${API_BASE}/admin/ai/course-draft`,{method:'POST',headers:await headers(false),body:form,credentials:'include'}))
}
export async function getAttendance(classId:string,termId:string) {
  return read<{sessions:AttendanceSession[]}>(await fetch(`${API_BASE}/admin/attendance?class_id=${encodeURIComponent(classId)}&term_id=${encodeURIComponent(termId)}`,{headers:await headers(false),credentials:'include'}))
}
export async function touchAttendance(classId:string) { return studentAction('/student/attendance/touch','POST',{classId}) as Promise<{checkedIn:boolean;sessionId?:string}> }
export async function downloadAttendance(classId:string,termId:string,className:string,termName:string) {
  const query=new URLSearchParams({class_id:classId,term_id:termId,class_name:className,term_name:termName})
  const response=await fetch(`${API_BASE}/admin/attendance/export?${query}`,{headers:await headers(false),credentials:'include'})
  if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'签到表导出失败。')}
  const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=decodeURIComponent(response.headers.get('content-disposition')?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]||`${className}_${termName}_签到表.xlsx`);anchor.click();URL.revokeObjectURL(url)
}
export async function previewStudentImport(file:File) {
  const form=new FormData();form.append('file',file)
  return read<{rows:StudentImportRow[];blankRowsSkipped:number}>(await fetch(`${API_BASE}/admin/student-import/preview`,{method:'POST',headers:await headers(false),credentials:'include',body:form}))
}
export async function commitStudentImport(classId:string,students:Array<{studentId:string;studentName:string;username:string}>,joinedOn:string) {
  return adminAction('/admin/student-import/commit','POST',{classId,students,joinedOn}) as Promise<{accounts:FeatureAccount[]}>
}
export async function downloadStudentImportTemplate() {
  const response=await fetch(`${API_BASE}/admin/student-import/template`,{headers:await headers(false),credentials:'include'})
  if(!response.ok)throw new Error('模板下载失败。')
  const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='学生批量导入模板.xlsx';anchor.click();URL.revokeObjectURL(url)
}
