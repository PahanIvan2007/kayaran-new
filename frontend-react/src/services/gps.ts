import { api } from './api'

export const gpsService = {
  startTrack: (eventId: number, deviceId?: string) =>
    api.post<any>('/gps/tracks', { event_id: eventId, device_id: deviceId }),
  stopTrack: (id: number) => api.put<any>(`/gps/tracks/${id}/stop`),
  addPoints: (trackId: number, points: any[]) =>
    api.post<any>(`/gps/tracks/${trackId}/points`, { points }),
}
