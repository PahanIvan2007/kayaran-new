export interface User {
  readonly id: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly phone: string;
  readonly role: string;
  readonly status: string;
}

export interface Boat {
  readonly id: string;
  readonly point_id: string;
  readonly serial_number: string;
  readonly title?: string;
  readonly boat_type: string;
  readonly color?: string;
  readonly capacity: number;
  readonly status: string;
  readonly condition_level: string;
}

export interface Event {
  readonly id: string;
  readonly event_type: string;
  readonly title: string;
  readonly description?: string;
  readonly status: string;
  readonly start_time: string;
  readonly end_time?: string;
  readonly point_id?: string;
}

export interface Team {
  readonly id: string;
  readonly title: string;
  readonly captain_user_id: string;
  readonly status: string;
}

export interface Tournament {
  readonly id: string;
  readonly title: string;
  readonly format: string;
  readonly status: string;
}

export interface Match {
  readonly id: string;
  readonly tournament_id: string;
  readonly round: number;
  readonly team_a_id: string;
  readonly team_b_id: string;
  readonly score_a: number;
  readonly score_b: number;
  readonly status: string;
}

export interface Rental {
  readonly id: string;
  readonly event_id: string;
  readonly boat_id: string;
  readonly user_id?: string;
  readonly start_time: string;
  readonly end_time?: string;
  readonly status: string;
  readonly boat?: Boat;
  readonly event?: Event;
}

export interface GpsTrack {
  readonly id: string;
  readonly event_id: string;
  readonly user_id?: string;
  readonly device_id?: string;
  readonly started_at?: string;
  readonly stopped_at?: string;
  readonly status: string;
}

export interface Route {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly difficulty?: string;
  readonly distance_km?: number;
  readonly status: string;
  readonly start_point_id?: string;
  readonly end_point_id?: string;
}

export interface AuthResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly user: User;
}

export interface Franchise {
  readonly id: string;
  readonly name: string;
  readonly status: string;
}

export type BoatStatus = 'available' | 'rented' | 'maintenance' | 'deleted';
export type UserRole = 'system_admin' | 'participant' | 'instructor' | 'judge' | 'deleted';
export type RentalStatus = 'active' | 'completed' | 'cancelled';
export type EventStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'deleted';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';
