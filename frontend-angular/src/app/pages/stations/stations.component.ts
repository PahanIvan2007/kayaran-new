import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-stations',
  template: `
    <div class="card">
      <div class="card-title">📍 Наши станции</div>
      <p style="font-size:10px;color:var(--text3);font-style:italic;margin-bottom:6px;">
        Свяжитесь с нами любым удобным способом
      </p>
    </div>

    @if (loading()) {
      <div class="skeleton"></div><div class="skeleton"></div>
    } @else {
      @for (f of franchises(); track f.id) {
        <div class="route-card" style="position:relative;padding-left:14px;">
          <div style="position:absolute;left:0;top:0;bottom:0;width:2px;background:linear-gradient(180deg,var(--red-dim),transparent);border-radius:0 2px 2px 0;"></div>
          <div class="route-title">🚤 {{ f.name }}</div>
          <div class="route-meta">{{ f.address }}</div>
          <div class="route-points" style="margin-top:2px;">
            <span style="font-size:8px;">Координаты: {{ f.lat.toFixed(4) }}, {{ f.lng.toFixed(4) }}</span>
          </div>
          <div style="margin-top:6px;display:flex;gap:4px;">
            <a [href]="'https://yandex.ru/maps/?pt=' + f.lng + ',' + f.lat + '&z=15&l=map'" target="_blank" class="btn btn-sm btn-outline">🗺 Открыть карту</a>
          </div>
        </div>
      } @empty {
        <div class="empty"><div class="icon">📍</div><p>Нет станций</p></div>
      }
    }

    <div class="card" style="margin-top:6px;">
      <div class="card-title">📞 Контакты</div>
      <div class="item">
        <span class="text-muted">Телефон</span>
        <span><a href="tel:+74951234567" style="color:var(--red-light);text-decoration:none;">+7 (495) 123-45-67</a></span>
      </div>
      <div class="item">
        <span class="text-muted">Email</span>
        <span><a href="mailto:info@kayaran.ru" style="color:var(--red-light);text-decoration:none;">info@kayaran.ru</a></span>
      </div>
      <div class="item">
        <span class="text-muted">Telegram</span>
        <span><a href="https://t.me/kayaran" target="_blank" style="color:var(--red-light);text-decoration:none;">@kayaran</a></span>
      </div>
      <div class="item">
        <span class="text-muted">Адрес</span>
        <span style="font-size:10px;">Москва, ул. Береговая, 4</span>
      </div>
    </div>
  `,
  standalone: true,
})
export class StationsComponent implements OnInit {
  private api = inject(ApiService);

  franchises = signal<any[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.api.get<any[]>('/franchises').then(f => {
      this.franchises.set(f);
      this.loading.set(false);
    }).catch(() => this.loading.set(false));
  }
}
