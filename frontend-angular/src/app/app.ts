import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <div class="header">
        <div class="header-left">
          <div class="header-crest">⚔</div>
          <div class="header-info"><h1>Kayran</h1><div class="sub">— платформа водных активностей —</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <span class="status" [style.background]="statusBg()" [style.color]="statusColor()">{{ statusText() }}</span>
          <div class="bell-wrap">
            <button class="bell-btn" (click)="showNotifs.set(!showNotifs())">🔔</button>
            @if (notifications().length > 0) { <div class="bell-dot"></div> }
            @if (showNotifs()) {
              <div class="notif-panel">
                @for (n of notifications(); track n.id) {
                  <div class="notif-item" (click)="showNotifs.set(false)">
                    <div>{{ n.text }}</div>
                    <div class="notif-time">{{ n.time }}</div>
                  </div>
                } @empty {
                  <div class="notif-item" style="text-align:center;color:var(--text-muted);font-style:italic;">Нет уведомлений</div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      @if (pwaPrompt() && !installAccepted()) {
        <div class="pwa-banner">
          <span>📲</span>
          <span class="pwa-banner-text">Установите приложение на экран</span>
          <button class="btn btn-xs btn-primary" (click)="installPWA()">Установить</button>
          <button class="btn btn-xs btn-ghost" (click)="installAccepted.set(true)">✕</button>
        </div>
      }

      <div class="alert alert-info" [style.display]="api.isOffline() ? 'block' : 'none'">
        ✦ Офлайн — данные из кэша ✦
      </div>

      <div class="tabs">
        @for (tab of tabs; track tab.id) {
          <a class="tab" [class.active]="isActive(tab.id)" [routerLink]="'/' + tab.id">
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </a>
        }
      </div>

      <div class="page-content">
        <router-outlet />
      </div>
    </div>
  `,
  imports: [RouterOutlet, RouterLink],
})
export class App {
  api = inject(ApiService);
  auth = inject(AuthService);

  showNotifs = signal(false);
  pwaPrompt = signal(false);
  installAccepted = signal(false);
  private deferredPrompt: any = null;

  readonly tabs = [
    { id: '', icon: '⌂', label: 'Главная' },
    { id: 'scan', icon: '⚔', label: 'Сканер' },
    { id: 'boats', icon: '⛵', label: 'Лодки' },
    { id: 'events', icon: '📜', label: 'События' },
    { id: 'rentals', icon: '📋', label: 'Аренда' },
    { id: 'sport', icon: '🏆', label: 'Спорт' },
    { id: 'stations', icon: '📍', label: 'Станции' },
    { id: 'tariffs', icon: '💰', label: 'Тарифы' },
    { id: 'profile', icon: '🧙', label: 'Профиль' },
  ];

  notifications = signal<{id: number; text: string; time: string}[]>([]);

  constructor() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.pwaPrompt.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.pwaPrompt.set(false);
      this.installAccepted.set(true);
    });
  }

  isActive(id: string): boolean {
    const p = window.location.pathname;
    if (!id) return p === '/';
    return p === '/' + id;
  }

  statusText = computed(() => {
    if (this.api.isOffline()) return 'офлайн';
    const user = this.api.currentUser();
    return user ? user.first_name : 'гость';
  });

  statusBg = computed(() => {
    if (this.api.isOffline()) return 'rgba(139,0,0,0.2)';
    return this.api.currentUser() ? 'rgba(220,38,38,0.08)' : 'transparent';
  });

  statusColor = computed(() => {
    if (this.api.isOffline()) return '#cc6666';
    return this.api.currentUser() ? 'var(--red-light)' : 'var(--text3)';
  });

  async installPWA() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    this.pwaPrompt.set(false);
    this.installAccepted.set(true);
    this.deferredPrompt = null;
  }
}
