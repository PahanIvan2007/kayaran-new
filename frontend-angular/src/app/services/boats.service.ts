import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { Boat } from '../models/models';

@Injectable({ providedIn: 'root' })
export class BoatsService {
  constructor(private api: ApiService) {}

  getAll() { return this.api.get<Boat[]>('/boats'); }
  getAvailable(pointId = 'P000001') { return this.api.get<Boat[]>('/boats/available?point_id=' + pointId); }
  getById(id: string) { return this.api.get<Boat>('/boats/' + id); }
  create(data: Partial<Boat>) { return this.api.post<Boat>('/boats', data); }
  update(id: string, data: Partial<Boat>) { return this.api.put<Boat>('/boats/' + id, data); }
  delete(id: string) { return this.api.delete<void>('/boats/' + id); }
}
