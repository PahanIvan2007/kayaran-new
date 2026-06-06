import { api } from './api'

export const dataService = {
  getStats: async () => {
    const [boats, events, teams, tournaments, routes] = await Promise.all([
      api.get<any[]>('/boats').catch(() => []),
      api.get<any[]>('/events').catch(() => []),
      api.get<any[]>('/teams').catch(() => []),
      api.get<any[]>('/tournaments').catch(() => []),
      api.get<any[]>('/routes').catch(() => []),
    ])
    return {
      available_boats: boats.filter((b: any) => b.status === 'available').length,
      active_events: events.filter((e: any) => e.status === 'active').length,
      total_boats: boats.length,
      tournaments: tournaments.length,
      teams: teams.length,
      routes: routes.length,
    }
  },
  getRoutes: () => api.get<any[]>('/routes'),
  getRoute: (id: number) => api.get<any>(`/routes/${id}`),
  createRoute: (data: any) => api.post<any>('/routes', data),
  getUsers: () => api.get<any[]>('/users'),
  getUser: (id: number) => api.get<any>(`/users/${id}`),
  getFranchises: () => api.get<any[]>('/franchises'),
}
