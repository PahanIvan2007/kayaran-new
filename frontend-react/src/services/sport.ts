import { api } from './api'

export const sportService = {
  getTeams: () => api.get<any[]>('/teams'),
  getTeam: (id: number) => api.get<any>(`/teams/${id}`),
  createTeam: (data: any) => api.post<any>('/teams', data),
  updateTeam: (id: number, data: any) => api.put<any>(`/teams/${id}`, data),
  deleteTeam: (id: number) => api.del<void>(`/teams/${id}`),
  getTournaments: () => api.get<any[]>('/tournaments'),
  getTournament: (id: number) => api.get<any>(`/tournaments/${id}`),
  createTournament: (data: any) => api.post<any>('/tournaments', data),
  updateTournament: (id: number, data: any) => api.put<any>(`/tournaments/${id}`, data),
  deleteTournament: (id: number) => api.del<void>(`/tournaments/${id}`),
  getMatches: (tournamentId: number) => api.get<any[]>(`/matches?tournament_id=${tournamentId}`),
}
