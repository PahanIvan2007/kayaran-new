import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class GpsService {
  constructor(private api: ApiService) {}

  startTrack(eventId: string, deviceId: string) {
    return this.api.post<{id: string; status: string}>('/gps/tracks', { event_id: eventId, device_id: deviceId });
  }

  stopTrack(id: string) {
    return this.api.put<{status: string}>('/gps/tracks/' + id + '/stop', {});
  }

  addPoints(trackId: string, points: {lat: number; lng: number; timestamp: string; speed?: number; altitude?: number}[]) {
    return this.api.post<{status: string; count: number}>('/gps/tracks/' + trackId + '/points', { points });
  }
}
