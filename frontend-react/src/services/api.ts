const BASE = window.__API_URL__ || window.location.origin

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('kayran_token')
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`
  const cacheKey = `api:${path}`
  let res: Response | undefined

  try {
    res = await fetch(url, { ...opts, headers: { ...getHeaders(), ...(opts?.headers as Record<string, string>) } })
  } catch {
    const cached = localStorage.getItem(cacheKey)
    if (cached) return JSON.parse(cached)
    throw new Error('Network error')
  }

  if (!res.ok) {
    let detail = res.statusText
    try { const j = await res.json(); detail = j.detail || detail } catch { /* ignore */ }
    throw new Error(detail)
  }

  const data = await res.json()
  if (!opts?.method || opts.method === 'GET') {
    localStorage.setItem(cacheKey, JSON.stringify(data))
  }
  return data
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export type { User, Boat, Event, Team, Tournament, Match, Rental, GpsTrack, Route, AuthResponse, GpsPoint, TrackStats } from '../models/types'
