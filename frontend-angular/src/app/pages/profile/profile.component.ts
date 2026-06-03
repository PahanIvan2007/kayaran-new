import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { QrComponent } from '../../components/qr/qr.component';

@Component({
  selector: 'app-profile',
  template: `
    @if (api.currentUser(); as user) {
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar">🧙</div>
          <div class="profile-name">
            <div class="profile-fullname">{{ user.first_name }} {{ user.last_name }}</div>
            <div class="profile-role">{{ user.role }} · {{ user.status }}</div>
          </div>
        </div>
        <div class="profile-qr">
          <div class="qr-label">QR-код участника</div>
          <app-qr [value]="user.id" [size]="120"></app-qr>
          <div class="qr-id">{{ user.id }}</div>
        </div>
        <div class="profile-details">
          <div class="detail-row">
            <span class="detail-label">ID</span>
            <span class="detail-value">{{ user.id }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Телефон</span>
            <span class="detail-value">{{ user.phone }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Статус</span>
            <span class="detail-value">{{ user.status }}</span>
          </div>
        </div>

        @if (editMode) {
          <div class="edit-section">
            <div class="edit-title">✏️ Редактировать профиль</div>
            <form [formGroup]="editForm" (ngSubmit)="saveProfile()">
              <div class="form-row">
                <input formControlName="firstName" placeholder="Имя">
                <input formControlName="lastName" placeholder="Фамилия">
              </div>
              <input formControlName="phone" placeholder="Телефон">
              <div class="row">
                <button class="btn btn-secondary btn-sm" type="submit">Сохранить</button>
                <button class="btn btn-outline btn-sm" type="button" (click)="editMode = false">Отмена</button>
              </div>
            </form>
          </div>
        }

        <div class="profile-actions">
          <button class="btn btn-outline" (click)="toggleEdit()">✏️ Редактировать</button>
          <button class="btn btn-danger" (click)="logout()">🚪 Выйти</button>
        </div>
      </div>

      @if (user.role === 'admin') {
        <div class="card">
          <div class="card-title">👥 Пользователи <span class="counter">{{ users().length }}</span></div>
          <button class="btn btn-outline btn-sm mb-2" (click)="loadUsers()">🔄 Обновить</button>
          @if (usersLoading()) {
            <div class="skeleton"></div>
          } @else {
            @for (u of users(); track u.id) {
              <div class="item">
                <div class="item-left">
                  <div class="title">{{ u.first_name }} {{ u.last_name }}</div>
                  <div class="sub">{{ u.role }} · {{ u.phone }}</div>
                </div>
                <div class="item-right">
                  <span class="badge" [class.badge-active]="u.status==='active'" [class.badge-completed]="u.status!=='active'">{{ u.status }}</span>
                  <span class="tag">{{ u.id }}</span>
                </div>
              </div>
            }
          }
        </div>
      }
    } @else {
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">⚔</div>
          <h2>Вход в Kayran</h2>
          <p class="login-sub">Платформа водных активностей</p>
        </div>
        <form [formGroup]="loginForm" (ngSubmit)="register()">
          <input formControlName="phone" type="text" placeholder="Телефон" autocomplete="tel">
          <div class="form-row">
            <input formControlName="firstName" type="text" placeholder="Имя" autocomplete="given-name">
            <input formControlName="lastName" type="text" placeholder="Фамилия" autocomplete="family-name">
          </div>
          <button class="btn btn-primary btn-block" type="submit" [disabled]="loginForm.invalid">Войти</button>
        </form>
        <div class="login-hint">Демо: +79990001122 / Анна Спортсменова</div>
      </div>
    }
  `,
  imports: [ReactiveFormsModule, QrComponent],
})
export class ProfileComponent implements OnInit {
  api = inject(ApiService);
  private auth = inject(AuthService);
  private data = inject(DataService);

  editMode = false;
  users = signal<any[]>([]);
  usersLoading = signal(false);

  editForm = new FormGroup({
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required),
    phone: new FormControl('', [Validators.required, Validators.minLength(5)]),
  });

  loginForm = new FormGroup({
    phone: new FormControl('+79990001122', [Validators.required, Validators.minLength(5)]),
    firstName: new FormControl('Анна', Validators.required),
    lastName: new FormControl('Спортсменова', Validators.required),
  });

  ngOnInit() {
    if (localStorage.getItem('kayran_token')) {
      this.auth.getMe().catch(() => {});
    }
  }

  toggleEdit() {
    const u = this.api.currentUser();
    if (!u) return;
    this.editForm.patchValue({ firstName: u.first_name, lastName: u.last_name, phone: u.phone });
    this.editMode = !this.editMode;
  }

  async saveProfile() {
    if (this.editForm.invalid) return;
    try {
      await this.auth.updateProfile({
        first_name: this.editForm.value.firstName!,
        last_name: this.editForm.value.lastName!,
        phone: this.editForm.value.phone!,
      });
      this.editMode = false;
    } catch (e: any) { alert(e.message); }
  }

  async register() {
    if (this.loginForm.invalid) return;
    const { phone, firstName, lastName } = this.loginForm.value;
    try {
      await this.auth.login(phone!);
    } catch {
      try {
        await this.auth.register(firstName!, lastName!, phone!);
      } catch (e: any) { alert(e.message); return; }
    }
    this.loadUsers();
  }

  async loadUsers() {
    this.usersLoading.set(true);
    try { this.users.set(await this.data.getUsers()); }
    catch { this.users.set([]); }
    this.usersLoading.set(false);
  }

  logout() { this.auth.logout(); }
}
