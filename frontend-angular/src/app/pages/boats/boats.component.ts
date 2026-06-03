import { Component, OnInit, signal, inject } from '@angular/core';
import { BoatsService } from '../../services/boats.service';
import { ApiService } from '../../services/api.service';
import { QrComponent } from '../../components/qr/qr.component';
import type { Boat } from '../../models/models';

@Component({
  selector: 'app-boats',
  template: `
    <div class="card toolbar">
      <div class="row">
        <button class="btn btn-primary" (click)="loadBoats()" aria-label="Обновить">🔄</button>
        <button class="btn btn-outline" (click)="filterAvailable.set(!filterAvailable()); loadBoats()">
          {{ filterAvailable() ? 'Все' : 'Доступные' }}
        </button>
        <span class="toolbar-count">{{ boats().length }}</span>
      </div>
    </div>

    @if (loading()) {
      <div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>
    } @else if (boats().length === 0) {
      <div class="empty"><div class="icon">🚣</div><p>Нет лодок в базе</p></div>
    } @else {
      <div class="boat-grid">
        @for (b of boats(); track b.id) {
          <div class="boat-card">
            <div class="boat-qr">
              <app-qr [value]="b.id" [size]="80"></app-qr>
              <div class="boat-id">{{ b.id }}</div>
            </div>
            <div class="boat-info">
              <div class="boat-title">{{ b.title || b.serial_number }}</div>
              <div class="boat-meta">
                <span class="boat-tag">{{ b.boat_type }}</span>
                @if (b.color) { <span class="boat-tag">{{ b.color }}</span> }
                <span class="boat-tag">{{ b.capacity }} чел</span>
                <span class="boat-stars">
                  @for (s of [1,2,3,4,5]; track s) {
                    <span class="star" [class.filled]="s <= conditionScore(b.condition_level)" [class.empty]="s > conditionScore(b.condition_level)">{{ s <= conditionScore(b.condition_level) ? '★' : '☆' }}</span>
                  }
                </span>
              </div>
              <div class="boat-status-row">
                <span class="badge" [class.badge-available]="b.status==='available'" [class.badge-rented]="b.status==='rented'" [class.badge-completed]="b.status!=='available'&&b.status!=='rented'">{{ b.status }}</span>
                @if (b.status === 'available' && api.currentUser()) {
                  <button class="btn btn-sm btn-primary" (click)="openBooking(b)">🧾 Забронировать</button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }

    @if (showBooking()) {
      <div class="card" style="border:1px solid rgba(220,38,38,0.1);">
        <div class="card-title">🚣 Бронирование <span style="color:var(--text);font-family:var(--font-body);text-transform:none;letter-spacing:0;">{{ bookingBoat()?.title || bookingBoat()?.serial_number }}</span></div>
        <form (ngSubmit)="confirmBooking()">
          <label class="text-xs text-muted" style="display:block;margin-bottom:2px;">Дата и время начала</label>
          <input #startDate type="datetime-local" [value]="defaultStart()" style="margin-bottom:6px;">

          <label class="text-xs text-muted" style="display:block;margin-bottom:2px;">Длительность (часов)</label>
          <select #duration style="margin-bottom:6px;">
            <option value="1">1 час</option>
            <option value="2" selected>2 часа</option>
            <option value="3">3 часа</option>
            <option value="4">4 часа</option>
            <option value="6">6 часов</option>
            <option value="8">8 часов (день)</option>
          </select>

          <label class="text-xs text-muted" style="display:block;margin-bottom:2px;">Тариф</label>
          <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:6px;">
            @for (t of tariffs; track t.id) {
              <label style="display:flex;align-items:center;gap:6px;padding:4px 6px;background:rgba(0,0,0,0.2);border-radius:4px;cursor:pointer;font-size:10px;color:var(--text2);" [style.border]="selectedTariff() === t.id ? '1px solid rgba(220,38,38,0.15)' : '1px solid transparent'">
                <input type="radio" name="tariff" [value]="t.id" (change)="selectedTariff.set(t.id)" [checked]="selectedTariff() === t.id">
                <span style="flex:1;"><strong style="color:var(--text)">{{ t.name }}</strong> — <em>{{ t.desc }}</em></span>
                <span style="font-family:var(--font-display);color:var(--red-light);font-weight:700;">{{ t.price === 0 ? 'Бесплатно' : t.price + ' ₽' }}</span>
              </label>
            }
          </div>

          <div style="background:rgba(0,0,0,0.15);padding:6px 8px;border-radius:4px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:9px;color:var(--text3);">Итого:</span>
            <span style="font-family:var(--font-display);color:var(--red-light);font-weight:700;font-size:14px;">{{ totalPrice() }} ₽</span>
          </div>

          <div class="row">
            <button class="btn btn-primary" type="submit">✅ Подтвердить бронирование</button>
            <button class="btn btn-outline" type="button" (click)="closeBooking()">Отмена</button>
          </div>
        </form>
      </div>
    }
  `,
  imports: [QrComponent],
})
export class BoatsComponent implements OnInit {
  private boatsService = inject(BoatsService);
  api = inject(ApiService);

  boats = signal<Boat[]>([]);
  loading = signal(true);
  filterAvailable = signal(false);

  showBooking = signal(false);
  bookingBoat = signal<Boat | null>(null);
  selectedTariff = signal('standard');
  tariffs = [
    { id: 'standard', name: 'Стандартный', desc: 'базовый тариф', price: 1500, multiplier: 1.0 },
    { id: 'family', name: 'Семейный (-20%)', desc: 'для двоих и более', price: 1200, multiplier: 0.8 },
    { id: 'student', name: 'Студенческий (-40%)', desc: 'при предъявлении студенческого', price: 900, multiplier: 0.6 },
    { id: 'inclusive', name: 'Инклюзивный', desc: 'для людей с ОВЗ', price: 0, multiplier: 0 },
  ];

  conditionScore(cl: string): number {
    const map: Record<string, number> = { excellent: 5, good: 4, fair: 3, poor: 2, damaged: 1 };
    return map[cl] || 3;
  }

  defaultStart() {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }

  totalPrice() {
    const t = this.tariffs.find(x => x.id === this.selectedTariff());
    return t ? t.price : 1500;
  }

  ngOnInit() { this.loadBoats(); }

  async loadBoats() {
    this.loading.set(true);
    try {
      this.boats.set(
        this.filterAvailable()
          ? await this.boatsService.getAvailable()
          : await this.boatsService.getAll()
      );
    } catch (e: any) { alert(e.message); }
    finally { this.loading.set(false); }
  }

  openBooking(b: Boat) {
    this.bookingBoat.set(b);
    this.selectedTariff.set('standard');
    this.showBooking.set(true);
  }

  closeBooking() {
    this.showBooking.set(false);
    this.bookingBoat.set(null);
  }

  async confirmBooking() {
    const boat = this.bookingBoat();
    if (!boat) return;
    const startInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    const durSelect = document.querySelector('select') as HTMLSelectElement;
    const startTime = startInput?.value || new Date().toISOString();
    const hours = parseInt(durSelect?.value || '2');
    const tariff = this.tariffs.find(t => t.id === this.selectedTariff());
    try {
      const ev = await this.api.post<any>('/events', {
        event_type: 'rental',
        title: 'Аренда ' + (boat.title || boat.serial_number) + ' (' + tariff?.name + ')',
        start_time: new Date(startTime).toISOString(),
        point_id: boat.point_id || 'P000001',
      });
      await this.api.post<any>('/rentals', {
        event_id: ev.id,
        boat_id: boat.id,
        start_time: new Date(startTime).toISOString(),
      });
      this.closeBooking();
      this.loadBoats();
    } catch (e: any) { alert(e.message); }
  }
}
