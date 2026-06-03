import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { Boat, Event, Team, Tournament, Route, Franchise } from '../models/models';

@Injectable({ providedIn: 'root' })
export class DataService {
  constructor(private api: ApiService) {}

  getStats() {
    return Promise.all([
      this.api.get<Boat[]>('/boats').catch(() => [] as Boat[]),
      this.api.get<Event[]>('/events').catch(() => [] as Event[]),
      this.api.get<Team[]>('/teams').catch(() => [] as Team[]),
      this.api.get<Tournament[]>('/tournaments').catch(() => [] as Tournament[]),
      this.api.get<Route[]>('/routes').catch(() => [] as Route[]),
    ]).then(([boats, events, teams, tournaments, routes]) => ({
      boats: boats.length,
      events: events.length,
      teams: teams.length,
      tournaments: tournaments.length,
      routes: routes.length,
      availableBoats: boats.filter(b => b.status === 'available').length,
      activeEvents: events.filter(e => e.status === 'active').length,
    }));
  }

  getRoutes() { return this.api.get<Route[]>('/routes'); }
  getRoute(id: string) { return this.api.get<Route>('/routes/' + id); }
  createRoute(data: Partial<Route>) { return this.api.post<Route>('/routes', data); }

  getUsers() { return this.api.get<any[]>('/users'); }
  getUser(id: string) { return this.api.get<any>('/users/' + id); }

  getFranchises() { return this.api.get<Franchise[]>('/franchises'); }
}
