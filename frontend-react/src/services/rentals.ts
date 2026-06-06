import { api } from './api'

export const rentalsService = {
  create: (data: any) => api.post<any>('/rentals', data),
  returnRental: (id: number) => api.put<any>(`/rentals/${id}/return`),
  reportDamage: (id: number, level: number, notes?: string) =>
    api.put<any>(`/rentals/${id}/damage`, { condition_level: level, notes }),
}
