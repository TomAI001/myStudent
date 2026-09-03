const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')

export type AdminSession = { id: string; email: string }

async function read<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(data.error || `请求失败（${response.status}）`)
  return data
}

export async function loginAdmin(email: string, password: string) {
  const response = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (await read<{ admin: AdminSession }>(response)).admin
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const response = await fetch(`${API_BASE}/admin/session`, { credentials: 'include' })
  if (response.status === 401) return null
  return (await read<{ admin: AdminSession }>(response)).admin
}

export async function logoutAdmin() {
  await fetch(`${API_BASE}/admin/logout`, { method: 'POST', credentials: 'include' })
}
