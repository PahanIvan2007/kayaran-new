import type { GpsPoint, TrackStats } from '../models/types'

class JsFallback {
  haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  calculateTrackStats(points: GpsPoint[]): TrackStats {
    let dist = 0, maxSpd = 0, elev = 0
    for (let i = 1; i < points.length; i++) {
      dist += this.haversine(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
      maxSpd = Math.max(maxSpd, points[i].speed || 0)
      if (points[i].altitude && points[i - 1].altitude) {
        const d = points[i].altitude - points[i - 1].altitude
        if (d > 0) elev += d
      }
    }
    const secs = points.length > 1
      ? (new Date(points[points.length - 1].timestamp).getTime() - new Date(points[0].timestamp).getTime()) / 1000
      : 0
    return { total_distance_km: dist, avg_speed_kmh: secs > 0 ? (dist / secs) * 3600 : 0, max_speed_kmh: maxSpd, duration_secs: secs, elevation_gain_m: elev, point_count: points.length }
  }
  calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = (lng2 - lng1) * Math.PI / 180
    const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180)
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng)
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
  }
}

const fallback = new JsFallback()

let wasmReady = false
let wasmExports: any = null

export const wasmService = {
  ready: false,
  loading: false,
  error: false,

  async init() {
    this.loading = true
    try {
      const resp = await fetch('/assets/wasm/gps_ops.wasm')
      const bytes = await resp.arrayBuffer()
      const mod = await WebAssembly.instantiate(bytes, { env: { memory: new WebAssembly.Memory({ initial: 256 }) } })
      wasmExports = mod.instance.exports
      wasmReady = true
      this.ready = true
    } catch {
      this.error = true
    }
    this.loading = false
  },

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return fallback.haversine(lat1, lng1, lat2, lng2)
  },

  calculateTrackStats(points: GpsPoint[]): TrackStats {
    if (wasmReady && wasmExports && points.length > 1) {
      try {
        const stride = 5; const len = points.length
        const ptr = wasmExports.alloc(len * stride * 8)
        const buf = new Float64Array(wasmExports.memory.buffer, ptr, len * stride)
        for (let i = 0; i < len; i++) {
          buf[i * stride] = points[i].lat; buf[i * stride + 1] = points[i].lng
          buf[i * stride + 2] = new Date(points[i].timestamp).getTime() / 1000
          buf[i * stride + 3] = points[i].speed || 0; buf[i * stride + 4] = points[i].altitude || 0
        }
        const result = wasmExports.calculate(len, ptr)
        wasmExports.free(ptr)
        return { total_distance_km: result.distance, avg_speed_kmh: result.avgSpeed, max_speed_kmh: result.maxSpeed, duration_secs: result.duration, elevation_gain_m: result.elevation, point_count: len }
      } catch { /* fall through to JS */ }
    }
    return fallback.calculateTrackStats(points)
  },

  calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return fallback.calculateBearing(lat1, lng1, lat2, lng2)
  },
}
