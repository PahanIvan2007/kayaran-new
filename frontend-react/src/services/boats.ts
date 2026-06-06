import { api } from './api'
import type { Boat } from '../models/types'

export const boatsService = {
  getAll: () => api.get<Boat[]>('/boats'),
  getAvailable: (pointId?: string) => api.get<Boat[]>(`/boats/available${pointId ? '?point_id=' + pointId : ''}`),
  getById: (id: number) => api.get<Boat>(`/boats/${id}`),
  create: (data: Partial<Boat>) => api.post<Boat>('/boats', data),
  update: (id: number, data: Partial<Boat>) => api.put<Boat>(`/boats/${id}`, data),
  remove: (id: number) => api.del<void>(`/boats/${id}`),
}
