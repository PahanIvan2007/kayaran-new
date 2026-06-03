import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private token: string | null = localStorage.getItem('kayran_token');
  readonly isOffline = signal(!navigator.onLine);
  readonly currentUser = signal<any>(null);

  constructor() {
    window.addEventListener('online', () => this.isOffline.set(false));
    window.addEventListener('offline', () => this.isOffline.set(true));
  }

  setToken(t: string | null) {
    this.token = t;
    if (t) localStorage.setItem('kayran_token', t);
    else localStorage.removeItem('kayran_token');
  }

  private getHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = 'Bearer ' + this.token;
    return h;
  }

  async request<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const cacheKey = 'api:' + path;
    const apiUrl = window.location.origin;
    try {
      if (this.isOffline()) throw new Error('offline');
      const res = await fetch(apiUrl + path, { ...opts, headers: { ...this.getHeaders(), ...(opts.headers as Record<string, string> || {}) } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Ошибка ' + res.status);
      }
      const data: T = await res.json();
      if (!opts.method || opts.method === 'GET') localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    } catch (e: any) {
      if (e.message === 'offline' || e.message.includes('fetch') || e.message.includes('NetworkError')) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
        throw new Error('Нет соединения');
      }
      throw e;
    }
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: any) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  put<T>(path: string, body: any) { return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}
