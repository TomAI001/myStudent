import { supabase } from './supabase'

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

export interface ServerStudentAccount {
  id: string
  studentId: string | null
  studentName: string
  username: string
  classIds: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface StudentServerSession {
  studentId: string
  studentName: string
  username: string
  classIds: string[]
}

export interface ParentServerSession {
  parentName: string
  parentUsername: string
  studentId: string | null
  studentName: string
  classIds: string[]
}

let parentSessionCache: { value: ParentServerSession | null; expiresAt: number } | null = null
let parentSessionPending: Promise<ParentServerSession | null> | null = null

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`)
  return data
}

async function adminHeaders(json = true) {
  const localToken = import.meta.env.VITE_ADMIN_TEST_TOKEN?.trim()
  if (localToken) return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${localToken}`,
  }
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) throw new Error('管理员登录已失效，请重新登录。')
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${data.session.access_token}`,
  }
}

export async function loginStudentOnServer(username: string, password: string): Promise<StudentServerSession> {
  const response = await fetch(`${API_BASE}/student/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await readResponse<{ account: ServerStudentAccount }>(response)
  return toSession(data.account)
}

export async function getStudentServerSession(): Promise<StudentServerSession | null> {
  const response = await fetch(`${API_BASE}/student/session`, { credentials: 'include' })
  if (response.status === 401) return null
  const data = await readResponse<{ account: ServerStudentAccount }>(response)
  return toSession(data.account)
}

export async function logoutStudentOnServer() {
  await fetch(`${API_BASE}/student/logout`, { method: 'POST', credentials: 'include' })
}

export async function loginParentOnServer(username:string,password:string):Promise<ParentServerSession>{
  const response=await fetch(`${API_BASE}/parent/login`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})})
  const data=await readResponse<{parent:{name:string;username:string};student:ServerStudentAccount}>(response)
  const session={parentName:data.parent.name,parentUsername:data.parent.username,studentId:data.student.studentId,studentName:data.student.studentName,classIds:data.student.classIds}
  parentSessionCache={value:session,expiresAt:Date.now()+1500}
  return session
}

export function getParentServerSession():Promise<ParentServerSession|null>{
  if(parentSessionCache&&parentSessionCache.expiresAt>Date.now())return Promise.resolve(parentSessionCache.value)
  if(parentSessionPending)return parentSessionPending
  parentSessionPending=fetch(`${API_BASE}/parent/session`,{credentials:'include'}).then(async response=>{
    if(response.status===401)return null
    const data=await readResponse<{parent:{name:string;username:string};student:ServerStudentAccount}>(response)
    return {parentName:data.parent.name,parentUsername:data.parent.username,studentId:data.student.studentId,studentName:data.student.studentName,classIds:data.student.classIds}
  }).then(session=>{parentSessionCache={value:session,expiresAt:Date.now()+1500};return session}).finally(()=>{parentSessionPending=null})
  return parentSessionPending
}

export async function logoutParentOnServer(){parentSessionCache=null;parentSessionPending=null;await fetch(`${API_BASE}/parent/logout`,{method:'POST',credentials:'include'})}

export async function changeStudentPasswordOnServer(currentPassword: string, nextPassword: string) {
  const response = await fetch(`${API_BASE}/student/password`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, nextPassword }),
  })
  await readResponse<{ ok: boolean }>(response)
}

export async function listServerStudentAccounts(classId: string) {
  const response = await fetch(`${API_BASE}/admin/student-accounts?class_id=${encodeURIComponent(classId)}`, {
    headers: await adminHeaders(false), credentials: 'include',
  })
  return (await readResponse<{ accounts: ServerStudentAccount[] }>(response)).accounts
}

export async function createServerStudentAccount(payload: {
  studentId?: string | null
  studentName: string
  username: string
  password: string
  classIds: string[]
}) {
  const response = await fetch(`${API_BASE}/admin/student-accounts`, {
    method: 'POST', headers: await adminHeaders(), credentials: 'include', body: JSON.stringify(payload),
  })
  return (await readResponse<{ account: ServerStudentAccount }>(response)).account
}

export async function updateServerStudentAccount(id: string, payload: {
  studentId?: string | null
  studentName: string
  username: string
  classIds: string[]
  active: boolean
}) {
  const response = await fetch(`${API_BASE}/admin/student-accounts/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: await adminHeaders(), credentials: 'include', body: JSON.stringify(payload),
  })
  return (await readResponse<{ account: ServerStudentAccount }>(response)).account
}

export async function resetServerStudentPassword(id: string, password: string) {
  const response = await fetch(`${API_BASE}/admin/student-accounts/${encodeURIComponent(id)}/reset-password`, {
    method: 'POST', headers: await adminHeaders(), credentials: 'include', body: JSON.stringify({ password }),
  })
  await readResponse<{ ok: boolean }>(response)
}

export async function uploadMediaToServer(file: File, folder: string) {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)
  const localToken = import.meta.env.VITE_ADMIN_TEST_TOKEN?.trim()
  const { data } = await supabase.auth.getSession()
  const token = localToken || data.session?.access_token
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const response = await fetch(`${API_BASE}/media/upload`, {
    method: 'POST', headers, credentials: 'include', body: form,
  })
  return readResponse<{ id: string; url: string; path: string; size: number }>(response)
}

export async function deleteMediaFromServer(uploadId: string) {
  const response = await fetch(`${API_BASE}/media/${encodeURIComponent(uploadId)}`, {
    method: 'DELETE', headers: await adminHeaders(false), credentials: 'include',
  })
  await readResponse<{ ok: boolean }>(response)
}

function toSession(account: ServerStudentAccount): StudentServerSession {
  return {
    studentId: account.id,
    studentName: account.studentName,
    username: account.username,
    classIds: account.classIds,
  }
}
