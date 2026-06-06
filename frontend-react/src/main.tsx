import { StrictMode, useState, useCallback, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthContext } from './services/auth'
import * as authService from './services/auth'
import type { User, AuthResponse } from './models/types'

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kayran_token'))

  const setAuth = useCallback((res: AuthResponse) => {
    localStorage.setItem('kayran_token', res.access_token)
    setToken(res.access_token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('kayran_token')
    setToken(null)
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const t = localStorage.getItem('kayran_token')
    if (!t) return
    try {
      const u = await authService.getMe()
      setUser(u)
    } catch {
      logout()
    }
  }, [logout])

  useEffect(() => { if (token) refresh() }, [])

  return (
    <AuthContext.Provider value={{ user, token, setAuth, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
