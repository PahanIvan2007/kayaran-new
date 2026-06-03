import { Component, signal, ViewChild, ElementRef } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { BoatsService } from '../../services/boats.service';
import { EventsService } from '../../services/events.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-scanner',
  template: `
    <div class="card">
      <div class="card-title">⚔ Сканировать QR</div>
      <div class="scanner-wrap">
        <video #qrVideo autoplay playsinline muted></video>
        <div class="scanner-overlay">
          <div class="scanner-frame"></div>
          <div class="scanner-corner tl"></div>
          <div class="scanner-corner tr"></div>
          <div class="scanner-corner bl"></div>
          <div class="scanner-corner br"></div>
          <div class="scanner-line"></div>
        </div>
      </div>
      <div class="scanner-hint">{{ scannerHint() }}</div>
      <div class="row">
        <button class="btn btn-primary" (click)="toggleScanner()">{{ scanBtnText() }}</button>
        <button class="btn btn-outline" (click)="showManualInput()">⌨ Ввести</button>
      </div>
      @if (showManual()) {
        <div class="mt-2">
          <input #qrInput type="text" placeholder="B000001, E000001, P000001..." (keydown.enter)="handleQRInput(qrInput.value)">
          <button class="btn btn-primary btn-block mt-2" (click)="handleQRInput(qrInput.value)">Найти</button>
        </div>
      }
    </div>

    @if (qrResult()) {
      <div class="card">
        <div class="card-title">{{ qrResultTitle() }}</div>
        <div [innerHTML]="qrResultBody()"></div>
      </div>
    }

    @if (scanHistory().length > 0) {
      <div class="card">
        <div class="card-title">📜 История сканирований <span class="counter">{{ scanHistory().length }}</span></div>
        @for (h of scanHistory(); track h.id + h.time) {
          <div class="item" style="cursor:pointer;" (click)="rescan(h.id)">
            <div class="item-left">
              <div class="title">{{ h.title }}</div>
              <div class="sub">{{ h.type }} · {{ formatTime(h.time) }}</div>
            </div>
            <div class="item-right">
              <span class="tag">{{ h.id }}</span>
            </div>
          </div>
        }
      </div>
    }
  `
})
export class ScannerComponent {
  @ViewChild('qrVideo') qrVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('qrInput') qrInputRef!: ElementRef<HTMLInputElement>;

  scannerActive = false;
  scanStream: MediaStream | null = null;
  scannerHint = signal('Наведите камеру на QR-код');
  scanBtnText = signal('▶ Включить камеру');
  showManual = signal(false);
  qrResult = signal(false);
  qrResultTitle = signal('—');
  qrResultBody = signal('');
  scanHistory = signal<{id: string; type: string; title: string; time: number}[]>([]);
  private animationId = 0;

  conditionScore(cl: string): number {
    return { excellent: 5, good: 4, fair: 3, poor: 2, damaged: 1 }[cl] || 3;
  }

  constructor(
    private api: ApiService,
    private boats: BoatsService,
    private events: EventsService,
    private data: DataService,
  ) {
    const saved = localStorage.getItem('kayran_scan_history');
    if (saved) { try { this.scanHistory.set(JSON.parse(saved)); } catch {} }
  }

  private saveHistory() {
    localStorage.setItem('kayran_scan_history', JSON.stringify(this.scanHistory().slice(0, 20)));
  }

  private addToHistory(id: string, type: string, title: string) {
    this.scanHistory.update(h => [{ id, type, title, time: Date.now() }, ...h.filter(x => x.id !== id)].slice(0, 20));
    this.saveHistory();
  }

  formatTime(ts: number) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  rescan(id: string) {
    this.handleQRId(id);
  }

  toggleScanner() {
    if (this.scannerActive) { this.stopScanner(); return; }
    this.startScanner();
  }

  async startScanner() {
    try {
      this.scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 480, height: 480 }
      });
      const video = this.qrVideoRef.nativeElement;
      video.srcObject = this.scanStream;
      await video.play();
      this.scannerActive = true;
      this.scanBtnText.set('⏹ Остановить');
      this.scannerHint.set('📷 Наведите на QR-код');
      this.scanFrame();
    } catch (e: any) {
      this.scannerHint.set('⚠ Камера недоступна');
    }
  }

  stopScanner() {
    if (this.scanStream) {
      this.scanStream.getTracks().forEach(t => t.stop());
      this.scanStream = null;
    }
    this.scannerActive = false;
    this.scanBtnText.set('▶ Включить камеру');
    this.scannerHint.set('Наведите камеру на QR-код');
    cancelAnimationFrame(this.animationId);
  }

  scanFrame() {
    if (!this.scannerActive) return;
    const video = this.qrVideoRef.nativeElement;
    if (video.readyState < 2) { this.animationId = requestAnimationFrame(() => this.scanFrame()); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = (window as any).jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      this.stopScanner();
      const url: string = code.data.trim();
      const match = url.match(/[BEPRSUPG][A-Fa-f0-9]{6}/);
      if (match) {
        this.handleQRId(match[0].toUpperCase());
      }
      return;
    }
    this.animationId = requestAnimationFrame(() => this.scanFrame());
  }

  showManualInput() {
    this.showManual.set(!this.showManual());
    setTimeout(() => {
      this.qrInputRef?.nativeElement?.focus();
    }, 100);
  }

  handleQRInput(value: string) {
    const val = value.trim().toUpperCase();
    if (!val) return;
    const match = val.match(/^([BEPRSUPG])([A-F0-9]{6})$/);
    if (!match) return;
    this.handleQRId(val);
  }

  async handleQRId(id: string) {
    this.qrResult.set(false);
    const prefix = id[0];
    try {
      if (prefix === 'B') {
        const b = await this.boats.getById(id);
        this.qrResultTitle.set('🚣 ' + (b.title || b.serial_number));
        this.qrResultBody.set(`
          <div class="item"><span class="text-muted">Тип</span><span>${b.boat_type}</span></div>
          <div class="item"><span class="text-muted">Цвет</span><span>${b.color || '—'}</span></div>
          <div class="item"><span class="text-muted">Вместимость</span><span>${b.capacity} чел.</span></div>
          <div class="item"><span class="text-muted">Статус</span><span class="badge ${b.status === 'available' ? 'badge-available' : b.status === 'rented' ? 'badge-rented' : 'badge-completed'}">${b.status}</span></div>
           <div class="item"><span class="text-muted">Состояние</span><span>${'★'.repeat(this.conditionScore(b.condition_level))}${'☆'.repeat(5-this.conditionScore(b.condition_level))}</span></div>
        `);
        this.addToHistory(id, 'Лодка', b.title || b.serial_number);
      } else if (prefix === 'E') {
        const e = await this.events.getById(id);
        this.qrResultTitle.set('📋 ' + e.title);
        this.qrResultBody.set(`
          <div class="item"><span class="text-muted">Тип</span><span>${e.event_type}</span></div>
          <div class="item"><span class="text-muted">Статус</span><span class="badge badge-${e.status}">${e.status}</span></div>
          <div class="item"><span class="text-muted">Начало</span><span>${new Date(e.start_time).toLocaleString()}</span></div>
          ${e.description ? `<div class="item"><span class="text-muted">Описание</span><span>${e.description}</span></div>` : ''}
        `);
        this.addToHistory(id, 'Событие', e.title);
      } else if (prefix === 'P') {
        alert('📍 Точка: ' + id);
        return;
      } else if (prefix === 'U') {
        const u = await this.data.getUser(id);
        this.qrResultTitle.set('🧙 ' + (u.first_name + ' ' + u.last_name));
        this.qrResultBody.set(`
          <div class="item"><span class="text-muted">Роль</span><span>${u.role || '—'}</span></div>
          <div class="item"><span class="text-muted">Телефон</span><span>${u.phone || '—'}</span></div>
          <div class="item"><span class="text-muted">Статус</span><span class="badge badge-${u.status}">${u.status}</span></div>
        `);
        this.addToHistory(id, 'Пользователь', u.first_name + ' ' + u.last_name);
      } else if (prefix === 'R') {
        this.qrResultTitle.set('🗺 Маршрут #' + id);
        try {
          const route = await this.data.getRoute(id);
          this.qrResultBody.set(`
            <div class="item"><span class="text-muted">Название</span><span>${route.title}</span></div>
            <div class="item"><span class="text-muted">Сложность</span><span>${route.difficulty || '—'}</span></div>
            <div class="item"><span class="text-muted">Дистанция</span><span>${route.distance_km ? route.distance_km + ' км' : '—'}</span></div>
          `);
          this.addToHistory(id, 'Маршрут', route.title);
        } catch {
          this.qrResultBody.set(`<div class="text-muted">ID: ${id}</div>`);
          this.addToHistory(id, 'Маршрут', id);
        }
      } else {
        this.qrResultTitle.set('🔗 ' + id);
        this.qrResultBody.set(`<div class="item"><span class="text-muted">ID</span><span>${id}</span></div>`);
        return;
      }
      this.qrResult.set(true);
    } catch (e: any) {
      alert(e.message);
    }
  }
}
