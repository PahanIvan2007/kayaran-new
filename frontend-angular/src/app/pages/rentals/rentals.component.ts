import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import type { Rental, Boat, Event } from '../../models/models';

@Component({
  selector: 'app-rentals',
  template: `
    <div class="card">
      <div class="row">
        <button class="btn btn-primary" (click)="loadRentals()">🔄</button>
        <button class="btn btn-outline" (click)="showOnlyActive.set(!showOnlyActive()); loadRentals()">
          {{ showOnlyActive() ? 'Все' : 'Активные' }}
        </button>
        <span class="toolbar-count">{{ rentals().length }}</span>
      </div>
    </div>

    @if (loading()) {
      <div class="skeleton"></div><div class="skeleton"></div>
    } @else if (rentals().length === 0) {
      <div class="empty"><div class="icon">📋</div><p>Нет аренд</p></div>
    } @else {
      @for (r of rentals(); track r.id) {
        <div class="rental-card" [class.active]="r.status==='active'" [class.completed]="r.status==='completed'">
          <div class="rental-header">
            <div class="rental-title">{{ getBoatTitle(r) }}</div>
            <span class="badge" [class.badge-rented]="r.status==='active'" [class.badge-completed]="r.status==='completed'">{{ r.status }}</span>
          </div>
          <div class="rental-meta">
            {{ formatDate(r.start_time) }}
            @if (r.end_time) {
              <span> — {{ formatDate(r.end_time) }}</span>
            }
          </div>
          <div class="rental-meta">ID: {{ r.id }} · Лодка: {{ r.boat_id }}</div>
          @if (r.status === 'active') {
            <div class="rental-actions">
              <button class="btn btn-sm btn-success" (click)="returnRental(r)">✅ Вернуть</button>
              <button class="btn btn-sm btn-danger" (click)="reportDamage(r)">⚠ Повреждение</button>
            </div>
          }
        </div>
      }
    }
  `,
  standalone: true,
})
export class RentalsComponent implements OnInit {
  private api = inject(ApiService);

  rentals = signal<any[]>([]);
  loading = signal(true);
  showOnlyActive = signal(false);

  ngOnInit() { this.loadRentals(); }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString() + ' ' + new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getBoatTitle(r: any): string {
    if (r.boat && r.boat.title) return r.boat.title;
    if (r.boat && r.boat.serial_number) return r.boat.serial_number;
    return r.boat_id;
  }

  async loadRentals() {
    this.loading.set(true);
    try {
      const all: any[] = await this.api.get<any[]>('/events?event_type=rental');
      const enriched: any[] = [];
      for (const ev of all) {
        try {
          const participants = await this.api.get<any[]>('/events/' + ev.id + '/participants');
          for (const p of participants) {
            enriched.push({ ...p, event: ev, event_id: ev.id, boat_id: p.id, start_time: ev.start_time, end_time: ev.end_time, status: ev.status });
          }
        } catch {}
      }
      this.rentals.set(
        this.showOnlyActive()
          ? enriched.filter(r => r.status === 'active')
          : enriched
      );
    } catch (e: any) {
      this.rentals.set([]);
    }
    this.loading.set(false);
  }

  async returnRental(r: any) {
    try {
      await this.api.put<any>('/rentals/' + r.event_id + '/return', {});
      this.loadRentals();
    } catch (e: any) { alert(e.message); }
  }

  private conditionLabel(score: string): string {
    const map: Record<string, string> = { '1': 'damaged', '2': 'poor', '3': 'fair', '4': 'good', '5': 'excellent' };
    return map[score] || 'fair';
  }

  async reportDamage(r: any) {
    const level = prompt('Уровень повреждения (1-5):', '3');
    if (!level) return;
    const notes = prompt('Примечания:', '') || '';
    try {
      await this.api.put<any>('/rentals/' + r.event_id + '/damage', {
        condition_level: this.conditionLabel(level),
        notes,
      });
      this.loadRentals();
    } catch (e: any) { alert(e.message); }
  }
}
