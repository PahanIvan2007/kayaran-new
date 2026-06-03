import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WasmService, GpsPoint, TrackStats } from '../../services/wasm.service';

@Component({
  selector: 'app-gps',
  template: `
    <div class="card">
      <div class="card-title">
        GPS-трекинг
        @if (wasm.ready()) {
          <span class="wasm-badge">WASM</span>
        } @else if (wasm.loading()) {
          <span class="wasm-badge loading">...</span>
        }
      </div>

      <div class="gps-status" [class.recording]="recording()" [class.idle]="!recording()">
        <div class="gps-dot" [class.recording]="recording()" [class.idle]="!recording()"></div>
        <span>{{ recording() ? 'ИДЁТ ЗАПИСЬ' : 'ГОТОВ К ЗАПИСИ' }}</span>
      </div>

      @if (position()) {
        <div class="gps-coord">Ш: {{ position()!.lat.toFixed(6) }}</div>
        <div class="gps-coord">Д: {{ position()!.lng.toFixed(6) }}</div>
        @if (position()!.speed != null) {
          <div class="gps-coord">Скорость: {{ (position()!.speed! * 3.6).toFixed(1) }} км/ч</div>
        }
      } @else {
        <div class="gps-coord" style="color:var(--text-muted)">Определение координат...</div>
      }

      @if (recording()) {
        <div class="gps-stats">
          <span class="gps-stat">Точек: {{ pointsCount() }}</span>
          <span class="gps-stat">ID: {{ trackId() }}</span>
        </div>
      }
    </div>

    @if (trackStats()) {
      <div class="card">
        <div class="card-title">Статистика трека</div>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Дистанция</span>
            <span class="stat-value">{{ trackStats()!.total_distance_km }} км</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Ср. скорость</span>
            <span class="stat-value">{{ trackStats()!.avg_speed_kmh }} км/ч</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Макс. скорость</span>
            <span class="stat-value">{{ trackStats()!.max_speed_kmh }} км/ч</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Длительность</span>
            <span class="stat-value">{{ formatDuration(trackStats()!.duration_secs) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Набор высоты</span>
            <span class="stat-value">{{ trackStats()!.elevation_gain_m }} м</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Точек</span>
            <span class="stat-value">{{ trackStats()!.point_count }}</span>
          </div>
        </div>
      </div>
    }

    <div class="rental-actions">
      @if (!recording()) {
        <button class="btn btn-primary btn-block" (click)="startRecording()" [disabled]="!canRecord()">▶ Начать запись</button>
      } @else {
        <button class="btn btn-danger btn-block" (click)="stopRecording()">⏹ Остановить</button>
      }
    </div>

    @if (!canRecord()) {
      <div class="card">
        <div class="card-title">⚠ Требуется авторизация</div>
        <p style="font-size:10px;color:var(--text3);font-style:italic;">
          Войдите в профиль, чтобы записывать GPS-треки.
        </p>
        <a routerLink="/profile" class="btn btn-primary btn-block">Войти</a>
      </div>
    }
  `,
  styles: [`
    .wasm-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      background: #805ad5;
      color: #fff;
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 6px;
      vertical-align: middle;
      letter-spacing: 0.5px;
    }
    .wasm-badge.loading {
      background: #a0aec0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .stat-item {
      background: var(--bg2, #f7fafc);
      border-radius: 8px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 9px;
      color: var(--text-muted, #718096);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--text, #2d3748);
      margin-top: 2px;
    }
  `],
  imports: [RouterLink],
  standalone: true,
})
export class GpsComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  protected wasm = inject(WasmService);

  recording = signal(false);
  position = signal<{lat: number; lng: number; speed?: number; altitude?: number} | null>(null);
  trackId = signal('');
  pointsCount = signal(0);
  canRecord = signal(false);
  trackStats = signal<TrackStats | null>(null);
  private watchId: number | null = null;
  private pointInterval: any = null;
  private currentTrackId = '';
  private pendingPoints: {lat: number; lng: number; timestamp: string; speed?: number; altitude?: number}[] = [];
  private recordedPoints: GpsPoint[] = [];

  ngOnInit() {
    this.wasm.init();
    this.canRecord.set(!!this.api.currentUser());
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(p => {
        this.position.set({ lat: p.coords.latitude, lng: p.coords.longitude, speed: p.coords.speed || undefined, altitude: p.coords.altitude || undefined });
      }, () => {}, { enableHighAccuracy: true });
    }
  }

  ngOnDestroy() {
    this.stopWatching();
  }

  private stopWatching() {
    if (this.watchId != null) { navigator.geolocation.clearWatch(this.watchId); this.watchId = null; }
    if (this.pointInterval) { clearInterval(this.pointInterval); this.pointInterval = null; }
  }

  async startRecording() {
    if (!this.api.currentUser()) return;
    try {
      const ev = await this.api.post<any>('/events', {
        event_type: 'route', title: 'GPS-трек ' + new Date().toLocaleDateString(),
        start_time: new Date().toISOString(), point_id: 'P000001',
      });
      const track = await this.api.post<{id: string; status: string}>('/gps/tracks', {
        event_id: ev.id, device_id: 'browser-' + Date.now(),
      });
      this.currentTrackId = track.id;
      this.trackId.set(track.id);
      this.recording.set(true);
      this.pointsCount.set(0);
      this.pendingPoints = [];
      this.recordedPoints = [];
      this.trackStats.set(null);

      this.watchId = navigator.geolocation.watchPosition(p => {
        this.position.set({ lat: p.coords.latitude, lng: p.coords.longitude, speed: p.coords.speed || undefined, altitude: p.coords.altitude || undefined });
        const ts = Date.now();
        this.pendingPoints.push({
          lat: p.coords.latitude, lng: p.coords.longitude,
          timestamp: new Date(ts).toISOString(),
          speed: p.coords.speed || undefined,
          altitude: p.coords.altitude || undefined,
        });
        this.recordedPoints.push({
          lat: p.coords.latitude, lng: p.coords.longitude,
          timestamp: ts,
          speed: p.coords.speed || 0,
          altitude: p.coords.altitude || 0,
        });
        this.pointsCount.update(c => c + 1);
      }, () => {}, { enableHighAccuracy: true, maximumAge: 1000 });

      this.pointInterval = setInterval(() => {
        if (this.pendingPoints.length > 0) {
          const batch = this.pendingPoints.splice(0);
          this.api.post('/gps/tracks/' + this.currentTrackId + '/points', { points: batch }).catch(() => {});
        }
      }, 5000);
    } catch (e: any) { alert(e.message); }
  }

  async stopRecording() {
    this.stopWatching();
    if (this.pendingPoints.length > 0) {
      try {
        await this.api.post('/gps/tracks/' + this.currentTrackId + '/points', { points: this.pendingPoints });
      } catch {}
    }
    try {
      await this.api.put('/gps/tracks/' + this.currentTrackId + '/stop', {});
    } catch {}
    this.recording.set(false);
    this.pendingPoints = [];
    this.trackStats.set(this.wasm.calculateTrackStats(this.recordedPoints));
    this.recordedPoints = [];
  }

  formatDuration(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}ч ${m}м ${s}с`;
    if (m > 0) return `${m}м ${s}с`;
    return `${s}с`;
  }
}
