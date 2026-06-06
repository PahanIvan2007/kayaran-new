import { createContext, useContext } from 'react'
import type { User, AuthResponse } from '../models/types'
import { api } from './api'

export interface AuthState {
  user: User | null
  token: string | null
  setAuth: (res: AuthResponse) => void
  logout: () => void
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthState>(null!)

export function useAuth() {
  return useContext(AuthContext)
}

export async function login(phone: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { phone })
}

export async function register(first_name: string, last_name: string, phone: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/register', { first_name, last_name, phone })
}

export async function getMe(): Promise<User> {
  return api.get<User>('/auth/me')
}

export async function updateProfile(id: number, data: Partial<User>): Promise<User> {
  return api.put<User>(`/users/${id}`, data)
}
