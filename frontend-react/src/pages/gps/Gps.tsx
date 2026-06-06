import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../../services/auth'
import { eventsService } from '../../services/events'
import { gpsService } from '../../services/gps'
import { wasmService } from '../../services/wasm'
import type { GpsPoint, TrackStats } from '../../models/types'

export default function Gps() {
  const { user } = useAuth()
  const [recording, setRecording] = useState(false)
  const [position, setPosition] = useState<{ lat: number; lng: number; speed: number } | null>(null)
  const [trackId, setTrackId] = useState<number | null>(null)
  const [pointsCount, setPointsCount] = useState(0)
  const [trackStats, setTrackStats] = useState<TrackStats | null>(null)
  const [wasmReady, setWasmReady] = useState(false)

  const watchId = useRef<number>(0)
  const pendingPoints = useRef<GpsPoint[]>([])
  const recordedPoints = useRef<GpsPoint[]>([])
  const pointInterval = useRef<number>(0)
  const eventId = useRef<number>(0)

  useEffect(() => {
    wasmService.init().then(() => setWasmReady(true))
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, speed: pos.coords.speed || 0 }),
        () => {}
      )
    }
  }, [])

  const flushPoints = useCallback(async () => {
    if (pendingPoints.current.length === 0 || !trackId) return
    try {
      await gpsService.addPoints(trackId, pendingPoints.current)
      pendingPoints.current = []
    } catch {}
  }, [trackId])

  const startRecording = async () => {
    if (!user) return
    try {
      const ev = await eventsService.create({ event_type: 'route', title: 'GPS-трек' })
      eventId.current = ev.id
      const track = await gpsService.startTrack(ev.id)
      setTrackId(track.id)
      setRecording(true)
      setTrackStats(null)
      recordedPoints.current = []
      pendingPoints.current = []
      setPointsCount(0)

      watchId.current = navigator.geolocation.watchPosition(
        pos => {
          const pt: GpsPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: new Date().toISOString(), speed: pos.coords.speed || 0, altitude: pos.coords.altitude || 0 }
          pendingPoints.current.push(pt)
          recordedPoints.current.push(pt)
          setPosition({ lat: pt.lat, lng: pt.lng, speed: pt.speed })
          setPointsCount(recordedPoints.current.length)
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000 }
      )

      pointInterval.current = window.setInterval(flushPoints, 5000)
    } catch (e: any) { alert(e.message) }
  }

  const stopRecording = async () => {
    navigator.geolocation.clearWatch(watchId.current)
    clearInterval(pointInterval.current)
    await flushPoints()
    setRecording(false)

    if (trackId) {
      try {
        await gpsService.stopTrack(trackId)
        const stats = wasmService.calculateTrackStats(recordedPoints.current)
        setTrackStats(stats)
      } catch {}
    }
  }

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); const s = Math.floor(secs % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="page-gps">
      <div className="card gps-card">
        <div className="gps-header">
          <h3>GPS-трекер</h3>
          {wasmReady && <span className="wasm-badge">WASM</span>}
        </div>
        <div className={`gps-status ${recording ? 'recording' : 'idle'}`}>
          <span className="gps-dot" />
          {recording ? 'Идет запись' : 'Ожидание'}
        </div>
        {position && (
          <div className="gps-position">
            <div>{'\uD83C\uDF10'} {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</div>
            <div>{'\uD83D\uDCA8'} {position.speed.toFixed(1)} км/ч</div>
          </div>
        )}
        {recording && (
          <div className="gps-points">
            {'\uD83D\uDCCD'} Точек записано: {pointsCount}
            {trackId && <div>Track ID: {trackId}</div>}
          </div>
        )}
        {trackStats && (
          <div className="gps-stats">
            <h4>Статистика трека</h4>
            <div className="stat-row"><span>Дистанция</span><span>{trackStats.total_distance_km.toFixed(2)} км</span></div>
            <div className="stat-row"><span>Ср. скорость</span><span>{trackStats.avg_speed_kmh.toFixed(1)} км/ч</span></div>
            <div className="stat-row"><span>Макс. скорость</span><span>{trackStats.max_speed_kmh.toFixed(1)} км/ч</span></div>
            <div className="stat-row"><span>Длительность</span><span>{formatDuration(trackStats.duration_secs)}</span></div>
            <div className="stat-row"><span>Набор высоты</span><span>{trackStats.elevation_gain_m.toFixed(0)} м</span></div>
            <div className="stat-row"><span>Точек</span><span>{trackStats.point_count}</span></div>
          </div>
        )}
        <div className="gps-controls">
          {!recording ? (
            <button className="btn btn-primary" onClick={startRecording} disabled={!user}>
              {'\u25B6'} Начать запись
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={stopRecording}>
              {'\u25A0'} Остановить
            </button>
          )}
        </div>
        {!user && <div className="alert alert-warning" style={{ fontSize: 12, marginTop: 8 }}>Войдите, чтобы использовать GPS</div>}
      </div>
    </div>
  )
}
