import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { Team, Tournament, Match } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SportService {
  constructor(private api: ApiService) {}

  getTeams() { return this.api.get<Team[]>('/teams'); }
  getTeam(id: string) { return this.api.get<Team>('/teams/' + id); }
  createTeam(data: Partial<Team>) { return this.api.post<Team>('/teams', data); }
  updateTeam(id: string, data: Partial<Team>) { return this.api.put<Team>('/teams/' + id, data); }
  deleteTeam(id: string) { return this.api.delete<void>('/teams/' + id); }

  getTournaments() { return this.api.get<Tournament[]>('/tournaments'); }
  getTournament(id: string) { return this.api.get<Tournament>('/tournaments/' + id); }
  createTournament(data: Partial<Tournament>) { return this.api.post<Tournament>('/tournaments', data); }
  updateTournament(id: string, data: Partial<Tournament>) { return this.api.put<Tournament>('/tournaments/' + id, data); }
  deleteTournament(id: string) { return this.api.delete<void>('/tournaments/' + id); }

  getMatches(tournamentId: string) { return this.api.get<Match[]>('/matches?tournament_id=' + tournamentId); }
}
