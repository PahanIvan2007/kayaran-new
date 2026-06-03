import { Component, OnInit, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventsService } from '../../services/events.service';
import type { Event } from '../../models/models';

@Component({
  selector: 'app-events',
  template: `
    <div class="card">
      <div class="row">
        <button class="btn btn-primary" (click)="loadEvents()">🔄</button>
        <button class="btn btn-secondary" (click)="showForm.set(!showForm())">+ Событие</button>
        <select class="filter-select" (change)="filterType.set($any($event.target).value); loadEvents()">
          <option value="">Все</option>
          <option value="training">Тренировка</option>
          <option value="rental">Аренда</option>
          <option value="route">Маршрут</option>
          <option value="match">Матч</option>
          <option value="festival">Фестиваль</option>
        </select>
      </div>
    </div>

    @if (showForm()) {
      <div class="card">
        <div class="card-title">{{ editingId() ? '✏️ Редактировать' : '➕ Новое событие' }}</div>
        <form [formGroup]="eventForm" (ngSubmit)="saveEvent()">
          <select formControlName="eventType">
            <option value="training">Тренировка</option>
            <option value="rental">Аренда</option>
            <option value="route">Маршрут</option>
            <option value="match">Матч</option>
            <option value="festival">Фестиваль</option>
          </select>
          <input formControlName="title" placeholder="Название">
          <textarea formControlName="description" placeholder="Описание"></textarea>
          <div class="row">
            <button class="btn btn-secondary" type="submit">{{ editingId() ? 'Сохранить' : 'Создать' }}</button>
            <button class="btn btn-outline" type="button" (click)="cancelForm()">Отмена</button>
          </div>
        </form>
      </div>
    }

    @if (loading()) {
      <div class="skeleton"></div><div class="skeleton"></div>
    } @else if (events().length === 0) {
      <div class="empty"><div class="icon">📋</div><p>Нет событий</p></div>
    } @else {
      <div class="card">
        <div class="card-title">События <span class="counter">{{ events().length }}</span></div>
        <div class="grid">
          @for (e of events(); track e.id) {
            <div class="item">
              <div class="item-left">
                <div class="title">{{ e.title }}</div>
                <div class="sub">{{ e.event_type }} · {{ formatDate(e.start_time) }}</div>
              </div>
              <div class="item-right">
                <span class="badge" [class.badge-active]="e.status==='active'" [class.badge-completed]="e.status==='completed'" [class.badge-planned]="e.status==='planned'">{{ e.status }}</span>
                <div class="actions">
                  <button class="btn btn-xs btn-outline" (click)="editEvent(e)" title="Редактировать">✏️</button>
                  <button class="btn btn-xs btn-danger" (click)="deleteEvent(e)" title="Удалить">🗑</button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  imports: [ReactiveFormsModule],
})
export class EventsComponent implements OnInit {
  private eventsService = inject(EventsService);

  events = signal<Event[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  filterType = signal('');

  eventForm = new FormGroup({
    eventType: new FormControl('training', Validators.required),
    title: new FormControl('', Validators.required),
    description: new FormControl(''),
  });

  ngOnInit() { this.loadEvents(); }

  formatDate(d: string) { return new Date(d).toLocaleString(); }

  async loadEvents() {
    this.loading.set(true);
    try { this.events.set(await this.eventsService.getAll(this.filterType() || undefined)); }
    catch (e: any) { alert(e.message); }
    finally { this.loading.set(false); }
  }

  editEvent(e: Event) {
    this.editingId.set(e.id);
    this.eventForm.patchValue({ eventType: e.event_type, title: e.title, description: e.description || '' });
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.eventForm.reset({ eventType: 'training', title: '', description: '' });
  }

  async saveEvent() {
    if (this.eventForm.invalid) return;
    const data = {
      event_type: this.eventForm.value.eventType!,
      title: this.eventForm.value.title!,
      description: this.eventForm.value.description || undefined,
    };
    try {
      if (this.editingId()) {
        await this.eventsService.update(this.editingId()!, data);
      } else {
        await this.eventsService.create({ ...data, start_time: new Date().toISOString(), point_id: 'P000001' });
      }
      this.cancelForm();
      this.loadEvents();
    } catch (e: any) { alert(e.message); }
  }

  async deleteEvent(e: Event) {
    if (!confirm('Удалить событие "' + e.title + '"?')) return;
    try {
      await this.eventsService.delete(e.id);
      this.loadEvents();
    } catch (e: any) { alert(e.message); }
  }
}
