export type BoatStatus = 'available' | 'rented' | 'maintenance' | 'deleted'
export type UserRole = 'system_admin' | 'participant' | 'instructor' | 'judge' | 'deleted'
export type RentalStatus = 'active' | 'completed' | 'cancelled'
export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'deleted'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

export interface User {
  id: number
  first_name: string
  last_name?: string
  phone: string
  role: UserRole
  status?: string
}

export interface Boat {
  id: number
  point_id: string
  serial_number: string
  title?: string
  boat_type: string
  color?: string
  capacity: number
  status: BoatStatus
  condition_level?: string
}

export interface Event {
  id: number
  event_type: string
  title: string
  description?: string
  status: EventStatus
  start_time?: string
  end_time?: string
  point_id?: string
}

export interface Team {
  id: number
  title: string
  captain_user_id: number
  status?: string
}

export interface Tournament {
  id: number
  title: string
  format: string
  status?: string
}

export interface Match {
  id: number
  tournament_id: number
  round: string
  team_a_id: number
  team_b_id: number
  score_a: number
  score_b: number
  status: string
}

export interface Rental {
  id: number
  event_id: number
  boat_id: number
  user_id?: number
  start_time: string
  end_time?: string
  status: RentalStatus
  boat?: Boat
  event?: Event
}

export interface GpsTrack {
  id: number
  event_id: number
  user_id?: number
  device_id?: string
  started_at?: string
  stopped_at?: string
  status?: string
}

export interface Route {
  id: number
  title: string
  description?: string
  difficulty?: Difficulty
  distance_km?: number
  status?: string
  start_point_id?: string
  end_point_id?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Franchise {
  id: number
  name: string
  status?: string
}

export interface GpsPoint {
  lat: number
  lng: number
  timestamp: string
  speed: number
  altitude: number
}

export interface TrackStats {
  total_distance_km: number
  avg_speed_kmh: number
  max_speed_kmh: number
  duration_secs: number
  elevation_gain_m: number
  point_count: number
}
