import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DataService } from '../../services/data.service';
import type { Route } from '../../models/models';

@Component({
  selector: 'app-routes',
  template: `
    <div class="card">
      <div class="row">
        <button class="btn btn-primary" (click)="loadRoutes()">🔄</button>
        <button class="btn btn-secondary" (click)="showForm.set(!showForm())">+ Маршрут</button>
        <span class="toolbar-count">{{ routes().length }}</span>
      </div>
    </div>

    @if (showForm()) {
      <div class="card">
        <div class="card-title">➕ Новый маршрут</div>
        <form (ngSubmit)="saveRoute(formTitle.value, formDesc.value, formDiff.value, formDist.valueAsNumber)" #routeForm>
          <input #formTitle placeholder="Название маршрута" required>
          <textarea #formDesc placeholder="Описание" rows="2"></textarea>
          <div class="form-row">
            <select #formDiff>
              <option value="easy">Лёгкий</option>
              <option value="medium">Средний</option>
              <option value="hard">Сложный</option>
            </select>
            <input #formDist type="number" placeholder="Расстояние (км)" step="0.1" style="flex:2;">
          </div>
          <div class="row">
            <button class="btn btn-secondary" type="submit">Создать</button>
            <button class="btn btn-outline" type="button" (click)="showForm.set(false)">Отмена</button>
          </div>
        </form>
      </div>
    }

    @if (loading()) {
      <div class="skeleton"></div><div class="skeleton"></div>
    } @else if (routes().length === 0) {
      <div class="empty"><div class="icon">🗺</div><p>Нет маршрутов</p></div>
    } @else {
      @for (r of routes(); track r.id) {
        <div class="route-card">
          <div class="route-title">{{ r.title }}</div>
          <div class="route-meta">
            {{ difficultyLabel(r.difficulty) }} · {{ r.distance_km ? r.distance_km + ' км' : '—' }}
          </div>
          @if (r.description) {
            <div class="route-meta" style="margin-top:2px;">{{ r.description }}</div>
          }
          <div class="route-points">ID: {{ r.id }}</div>
        </div>
      }
    }
  `,
  imports: [FormsModule],
  standalone: true,
})
export class RoutesComponent implements OnInit {
  private data = inject(DataService);
  private api = inject(ApiService);

  routes = signal<Route[]>([]);
  loading = signal(true);
  showForm = signal(false);

  ngOnInit() { this.loadRoutes(); }

  difficultyLabel(d?: string): string {
    const map: Record<string, string> = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' };
    return d ? (map[d] || d) : '—';
  }

  async loadRoutes() {
    this.loading.set(true);
    try { this.routes.set(await this.data.getRoutes()); }
    catch { this.routes.set([]); }
    this.loading.set(false);
  }

  async saveRoute(title: string, desc: string, difficulty: string, dist: number | null) {
    if (!title) return;
    try {
      await this.data.createRoute({
        title, description: desc || undefined,
        difficulty, distance_km: dist || undefined,
      } as Route);
      this.showForm.set(false);
      this.loadRoutes();
    } catch (e: any) { alert(e.message); }
  }
}
