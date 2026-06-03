import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { User, AuthResponse } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService) {}

  async register(first_name: string, last_name: string, phone: string): Promise<User> {
    const data = await this.api.post<AuthResponse>('/auth/register', { first_name, last_name, phone });
    this.api.setToken(data.access_token);
    this.api.currentUser.set(data.user);
    return data.user;
  }

  async getMe(): Promise<User> {
    const data = await this.api.get<User>('/auth/me');
    this.api.currentUser.set(data);
    return data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const updated = await this.api.put<User>('/users/' + this.api.currentUser()?.id, data);
    this.api.currentUser.set(updated);
    return updated;
  }

  logout() {
    this.api.setToken(null);
    this.api.currentUser.set(null);
  }
}
