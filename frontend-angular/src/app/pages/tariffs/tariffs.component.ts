import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tariffs',
  template: `
    <div class="card">
      <div class="card-title">💰 Тарифы</div>
      <p style="font-size:10px;color:var(--text3);font-style:italic;margin-bottom:6px;">
        Выгодные предложения для каждого
      </p>
    </div>

    @for (t of tariffs; track t.id) {
      <div class="route-card" style="position:relative;overflow:hidden;">
        @if (t.badge) {
          <div style="position:absolute;top:4px;right:-20px;background:var(--red);color:#fff;padding:1px 24px;font-size:6px;font-family:var(--font-display);text-transform:uppercase;letter-spacing:0.5px;transform:rotate(45deg);">
            {{ t.badge }}
          </div>
        }
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <div class="route-title">{{ t.name }}</div>
            <div class="route-meta">{{ t.desc }}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--red-light);line-height:1;">
              {{ t.price === 0 ? '0' : t.price }}
            </div>
            <div style="font-size:7px;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;">
              {{ t.price === 0 ? 'Бесплатно' : '₽ / час' }}
            </div>
          </div>
        </div>
        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:2px;">
          @for (f of t.features; track f) {
            <span class="tag tag-green">✓ {{ f }}</span>
          }
        </div>
        <a routerLink="/boats" class="btn btn-sm btn-primary" style="margin-top:6px;width:100%;">
          {{ t.price === 0 ? 'Забронировать бесплатно' : 'Выбрать тариф' }}
        </a>
      </div>
    }
  `,
  imports: [RouterLink],
  standalone: true,
})
export class TariffsComponent {
  tariffs = [
    {
      id: 'standard', name: 'Стандартный', desc: 'Базовый тариф для всех',
      price: 1500, badge: '',
      features: ['Лодка в аренду', 'Спасательный жилет', 'Весла', '1 час']
    },
    {
      id: 'family', name: 'Семейный', desc: 'Для двоих и более — выгодно',
      price: 1200, badge: '-20%',
      features: ['Лодка до 4 мест', 'Скидка 20%', 'Приоритетная посадка', 'Доп. оборудование']
    },
    {
      id: 'student', name: 'Студенческий', desc: 'При предъявлении студенческого билета',
      price: 900, badge: '-40%',
      features: ['Любая лодка', 'Скидка 40%', 'Снаряжение включено']
    },
    {
      id: 'inclusive', name: 'Инклюзивный', desc: 'Для людей с ограниченными возможностями здоровья',
      price: 0, badge: 'Бесплатно',
      features: ['Бесплатно', 'Специальные лодки', 'Помощник', 'Доступная среда']
    },
  ];
}
