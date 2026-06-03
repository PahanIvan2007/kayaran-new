import { Injectable, signal } from '@angular/core';

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  speed: number;
  altitude: number;
}

export interface TrackStats {
  total_distance_km: number;
  avg_speed_kmh: number;
  max_speed_kmh: number;
  duration_secs: number;
  elevation_gain_m: number;
  point_count: number;
}

@Injectable({ providedIn: 'root' })
export class WasmService {
  private wasm: any = null;
  ready = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);

  async init(): Promise<void> {
    if (this.wasm) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const resp = await fetch('/assets/wasm/gps_ops.wasm');
      if (!resp.ok) throw new Error('WASM not found');
      const bytes = await resp.arrayBuffer();
      const result = await WebAssembly.instantiate(bytes, {});
      this.wasm = result.instance.exports;
      this.ready.set(true);
    } catch (e: any) {
      console.warn('WASM not available, using JS fallback:', e.message);
      this.wasm = new JsGpsFallback();
      this.ready.set(true);
    }
    this.loading.set(false);
  }

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.wasm?.calculate_distance?.(lat1, lng1, lat2, lng2)
      ?? new JsGpsFallback().calculate_distance(lat1, lng1, lat2, lng2);
  }

  calculateTrackStats(points: GpsPoint[]): TrackStats {
    if (this.wasm?.calculate_track_stats) {
      return this.wasm.calculate_track_stats(points);
    }
    return new JsGpsFallback().calculate_track_stats(points);
  }

  calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.wasm?.calculate_bearing?.(lat1, lng1, lat2, lng2)
      ?? new JsGpsFallback().calculate_bearing(lat1, lng1, lat2, lng2);
  }

  interpolatePoints(points: GpsPoint[], maxGapSeconds: number = 30): GpsPoint[] {
    if (this.wasm?.interpolate_points) {
      return this.wasm.interpolate_points(points, maxGapSeconds);
    }
    return new JsGpsFallback().interpolate_points(points, maxGapSeconds);
  }

  simplifyTrack(points: GpsPoint[], epsilon: number = 0.001): GpsPoint[] {
    if (this.wasm?.simplify_track) {
      return this.wasm.simplify_track(points, epsilon);
    }
    return new JsGpsFallback().simplify_track(points, epsilon);
  }
}

class JsGpsFallback {
  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  calculate_distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.haversine(lat1, lng1, lat2, lng2);
  }

  calculate_track_stats(points: GpsPoint[]): TrackStats {
    if (points.length === 0) return { total_distance_km: 0, avg_speed_kmh: 0, max_speed_kmh: 0, duration_secs: 0, elevation_gain_m: 0, point_count: 0 };
    let totalDist = 0, maxSpeed = points[0].speed, elevGain = 0, speedSum = 0, speedCount = 0;
    for (let i = 1; i < points.length; i++) {
      totalDist += this.haversine(points[i-1].lat, points[i-1].lng, points[i].lat, points[i].lng);
      if (points[i].speed > maxSpeed) maxSpeed = points[i].speed;
      if (points[i].speed > 0) { speedSum += points[i].speed; speedCount++; }
      const altDiff = points[i].altitude - points[i-1].altitude;
      if (altDiff > 0) elevGain += altDiff;
    }
    const duration = points[points.length-1].timestamp - points[0].timestamp;
    const avgSpeed = duration > 0 ? totalDist / (duration / 3600) : (speedCount > 0 ? speedSum / speedCount : 0);
    return {
      total_distance_km: Math.round(totalDist * 1000) / 1000,
      avg_speed_kmh: Math.round(Math.abs(avgSpeed) * 1000) / 1000,
      max_speed_kmh: Math.round(maxSpeed * 1000) / 1000,
      duration_secs: Math.round(duration * 1000) / 1000,
      elevation_gain_m: Math.round(elevGain * 1000) / 1000,
      point_count: points.length,
    };
  }

  calculate_bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  interpolate_points(points: GpsPoint[], maxGapSeconds: number): GpsPoint[] {
    if (points.length < 2) return [...points];
    const result: GpsPoint[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const prev = points[i-1], curr = points[i];
      const dt = curr.timestamp - prev.timestamp;
      if (dt > maxGapSeconds && dt > 0) {
        const steps = Math.ceil(dt / maxGapSeconds);
        for (let j = 1; j < steps; j++) {
          const t = j / steps;
          result.push({
            lat: prev.lat + (curr.lat - prev.lat) * t,
            lng: prev.lng + (curr.lng - prev.lng) * t,
            timestamp: prev.timestamp + dt * t,
            speed: prev.speed + (curr.speed - prev.speed) * t,
            altitude: prev.altitude + (curr.altitude - prev.altitude) * t,
          });
        }
      }
      result.push(curr);
    }
    return result;
  }

  private pointLineDistance(point: GpsPoint, start: GpsPoint, end: GpsPoint): number {
    const dx = end.lng - start.lng, dy = end.lat - start.lat;
    const lenSq = dx*dx + dy*dy;
    if (lenSq === 0) return this.haversine(point.lat, point.lng, start.lat, start.lng);
    const t = Math.max(0, Math.min(1, ((point.lng - start.lng)*dx + (point.lat - start.lat)*dy) / lenSq));
    return this.haversine(point.lat, point.lng, start.lat + t*dy, start.lng + t*dx);
  }

  simplify_track(points: GpsPoint[], epsilon: number): GpsPoint[] {
    if (points.length <= 2) return [...points];
    let dmax = 0, idx = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const d = this.pointLineDistance(points[i], points[0], points[points.length-1]);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > epsilon) {
      const left = this.simplify_track(points.slice(0, idx+1), epsilon);
      const right = this.simplify_track(points.slice(idx), epsilon);
      return [...left.slice(0, -1), ...right];
    }
    return [points[0], points[points.length-1]];
  }
}
