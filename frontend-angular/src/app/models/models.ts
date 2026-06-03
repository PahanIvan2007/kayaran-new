export interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  status: string;
}

export interface Boat {
  id: string;
  point_id: string;
  serial_number: string;
  title?: string;
  boat_type: string;
  color?: string;
  capacity: number;
  status: string;
  condition_level: string;
}

export interface Event {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  status: string;
  start_time: string;
  end_time?: string;
  point_id?: string;
}

export interface Team {
  id: string;
  title: string;
  captain_user_id: string;
  status: string;
}

export interface Tournament {
  id: string;
  title: string;
  format: string;
  status: string;
  start_time?: string;
  end_time?: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  team1_id?: string;
  team2_id?: string;
  score_team1?: number;
  score_team2?: number;
  status: string;
  start_time?: string;
}

export interface Rental {
  id: string;
  event_id: string;
  boat_id: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  status: string;
  boat?: Boat;
  event?: Event;
}

export interface GpsTrack {
  id: string;
  event_id: string;
  user_id?: string;
  device_id?: string;
  started_at?: string;
  stopped_at?: string;
  status: string;
}

export interface Route {
  id: string;
  title: string;
  description?: string;
  difficulty?: string;
  distance_km?: number;
  status: string;
  start_point_id?: string;
  end_point_id?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Franchise {
  id: string;
  name: string;
  status: string;
}
