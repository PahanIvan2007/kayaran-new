import { api } from './api'
import type { Event } from '../models/types'

export const eventsService = {
  getAll: (type?: string) =>
    api.get<Event[]>(`/events${type ? '?event_type=' + type : ''}`),
  getById: (id: number) => api.get<Event>(`/events/${id}`),
  create: (data: Partial<Event>) => api.post<Event>('/events', data),
  update: (id: number, data: Partial<Event>) => api.put<Event>(`/events/${id}`, data),
  remove: (id: number) => api.del<void>(`/events/${id}`),
  getParticipants: (id: number) => api.get<unknown[]>(`/events/${id}/participants`),
}
