import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { Rental } from '../models/models';

@Injectable({ providedIn: 'root' })
export class RentalsService {
  constructor(private api: ApiService) {}

  create(data: Partial<Rental>) { return this.api.post<Rental>('/rentals', data); }
  returnRental(id: string) { return this.api.put<any>('/rentals/' + id + '/return', {}); }
  reportDamage(id: string, condition_level: string, notes: string) {
    return this.api.put<any>('/rentals/' + id + '/damage', { condition_level, notes });
  }
}
