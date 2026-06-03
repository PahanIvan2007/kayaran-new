import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { Event } from '../models/models';

@Injectable({ providedIn: 'root' })
export class EventsService {
  constructor(private api: ApiService) {}

  getAll(type?: string) {
    const url = type ? '/events?event_type=' + type : '/events';
    return this.api.get<Event[]>(url);
  }
  getById(id: string) { return this.api.get<Event>('/events/' + id); }
  create(data: Partial<Event>) { return this.api.post<Event>('/events', data); }
  update(id: string, data: Partial<Event>) { return this.api.put<Event>('/events/' + id, data); }
  delete(id: string) { return this.api.delete<void>('/events/' + id); }
  getParticipants(eventId: string) { return this.api.get<any[]>('/events/' + eventId + '/participants'); }
}
