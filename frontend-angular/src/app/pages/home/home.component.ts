import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-home',
  template: `
    <div class="card" style="background:linear-gradient(135deg, rgba(8,2,4,0.98), rgba(30,4,4,0.95));border:1px solid rgba(220,38,38,0.06);text-align:center;padding:18px 14px;margin-bottom:8px;">
      <div style="font-size:32px;margin-bottom:4px;">🚣</div>
      <h1 style="font-family:var(--font-display);font-size:20px;font-weight:900;color:var(--red-light);text-shadow:0 0 20px rgba(220,38,38,0.1);letter-spacing:4px;text-transform:uppercase;">Каяран</h1>
      <p style="font-size:11px;color:var(--text2);font-style:italic;margin:4px 0 8px;letter-spacing:0.5px;">Платформа водных активностей</p>
      <div style="display:flex;gap:3px;flex-wrap:wrap;justify-content:center;">
        <span class="tag" style="font-size:7px;">🏄 Прокат лодок</span>
        <span class="tag" style="font-size:7px;">🗺 Маршруты</span>
        <span class="tag" style="font-size:7px;">🏆 Соревнования</span>
        <span class="tag" style="font-size:7px;">♿ Инклюзив</span>
      </div>
    </div>

    @if (loading()) {
      <div class="skeleton" style="height:80px"></div>
    } @else {
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">⛵</div>
          <div class="stat-number">{{ stats().availableBoats }}</div>
          <div class="stat-label">Доступно лодок</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📜</div>
          <div class="stat-number">{{ stats().activeEvents }}</div>
          <div class="stat-label">Активных событий</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🚣</div>
          <div class="stat-number">{{ stats().boats }}</div>
          <div class="stat-label">Всего лодок</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-number">{{ stats().tournaments }}</div>
          <div class="stat-label">Турниров</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-number">{{ stats().teams }}</div>
          <div class="stat-label">Команд</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🗺</div>
          <div class="stat-number">{{ stats().routes }}</div>
          <div class="stat-label">Маршрутов</div>
        </div>
      </div>
    }

    @if (!api.currentUser()) {
      <div class="card">
        <div class="card-title">🔐 Добро пожаловать</div>
        <p style="font-size:10px;color:var(--text3);font-style:italic;margin-bottom:6px;">
          Авторизуйтесь, чтобы арендовать лодки, участвовать в событиях и записывать GPS-треки.
        </p>
        <a routerLink="/profile" class="btn btn-primary btn-block">Войти</a>
      </div>
    }

    <div class="card">
      <div class="card-title">📡 Быстрые действия</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">
        <a routerLink="/scan" class="btn btn-secondary" style="flex:0 0 auto;">⚔ Сканировать</a>
        <a routerLink="/boats" class="btn btn-primary" style="flex:0 0 auto;">⛵ Выбрать лодку</a>
        <a routerLink="/rentals" class="btn btn-secondary" style="flex:0 0 auto;">📋 Моя аренда</a>
        <a routerLink="/gps" class="btn btn-secondary" style="flex:0 0 auto;">📍 GPS-трек</a>
        <a routerLink="/routes" class="btn btn-outline" style="flex:0 0 auto;">🗺 Маршруты</a>
        <a routerLink="/events" class="btn btn-outline" style="flex:0 0 auto;">📜 События</a>
        <a routerLink="/tariffs" class="btn btn-outline" style="flex:0 0 auto;">💰 Тарифы</a>
        <a routerLink="/stations" class="btn btn-outline" style="flex:0 0 auto;">📍 Станции</a>
      </div>
    </div>
  `,
  imports: [RouterLink],
  standalone: true,
})
export class HomeComponent implements OnInit {
  private data = inject(DataService);
  api = inject(ApiService);

  stats = signal({ boats: 0, events: 0, teams: 0, tournaments: 0, routes: 0, availableBoats: 0, activeEvents: 0 });
  loading = signal(true);

  ngOnInit() {
    this.data.getStats().then(s => {
      this.stats.set(s);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }
}
