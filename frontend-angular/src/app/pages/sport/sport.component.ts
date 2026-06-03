import { Component, OnInit, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SportService } from '../../services/sport.service';
import type { Team, Tournament, Match } from '../../models/models';

@Component({
  selector: 'app-sport',
  template: `
    <div class="card">
      <div class="row">
        <button class="btn btn-primary" (click)="loadTeams(); loadTournaments()">🔄</button>
        <button class="btn btn-secondary" (click)="showTeamForm.set(!showTeamForm()); showTournamentForm.set(false)">+ Команда</button>
        <button class="btn btn-outline" (click)="showTournamentForm.set(!showTournamentForm()); showTeamForm.set(false)">+ Турнир</button>
      </div>
    </div>

    @if (showTeamForm()) {
      <div class="card">
        <div class="card-title">{{ editingTeamId() ? '✏️ Редактировать команду' : '➕ Новая команда' }}</div>
        <form [formGroup]="teamForm" (ngSubmit)="saveTeam()">
          <input formControlName="title" placeholder="Название команды">
          <div class="row">
            <button class="btn btn-secondary" type="submit">{{ editingTeamId() ? 'Сохранить' : 'Создать' }}</button>
            <button class="btn btn-outline" type="button" (click)="cancelTeamForm()">Отмена</button>
          </div>
        </form>
      </div>
    }

    @if (showTournamentForm()) {
      <div class="card">
        <div class="card-title">{{ editingTournamentId() ? '✏️ Редактировать турнир' : '➕ Новый турнир' }}</div>
        <form [formGroup]="tournamentForm" (ngSubmit)="saveTournament()">
          <input formControlName="title" placeholder="Название турнира">
          <select formControlName="format">
            <option value="single_elimination">Single Elimination</option>
            <option value="round_robin">Round Robin</option>
            <option value="time_trial">Time Trial</option>
          </select>
          <div class="row">
            <button class="btn btn-secondary" type="submit">{{ editingTournamentId() ? 'Сохранить' : 'Создать' }}</button>
            <button class="btn btn-outline" type="button" (click)="cancelTournamentForm()">Отмена</button>
          </div>
        </form>
      </div>
    }

    <div class="card">
      <div class="card-title">Команды <span class="counter">{{ teams().length }}</span></div>
      @if (teamsLoading()) {
        <div class="skeleton"></div>
      } @else if (teams().length === 0) {
        <div class="empty"><div class="icon">👥</div><p>Нет команд</p></div>
      } @else {
        @for (t of teams(); track t.id) {
          <div class="item">
            <div class="item-left">
              <div class="title">{{ t.title }}</div>
              <div class="sub">{{ t.status }} · Капитан: {{ t.captain_user_id }}</div>
            </div>
            <div class="item-right">
              <div class="actions">
                <button class="btn btn-xs btn-outline" (click)="editTeam(t)">✏️</button>
                <button class="btn btn-xs btn-danger" (click)="deleteTeam(t)">🗑</button>
              </div>
            </div>
          </div>
        }
      }
    </div>

    <div class="card">
      <div class="card-title">Турниры <span class="counter">{{ tournaments().length }}</span></div>
      @if (tournamentsLoading()) {
        <div class="skeleton"></div>
      } @else if (tournaments().length === 0) {
        <div class="empty"><div class="icon">🏆</div><p>Нет турниров</p></div>
      } @else {
        @for (t of tournaments(); track t.id) {
          <div class="item" (click)="selectTournament(t)" style="cursor:pointer;">
            <div class="item-left">
              <div class="title">{{ t.title }}</div>
              <div class="sub">{{ formatLabel(t.format) }} · {{ t.status }}</div>
            </div>
            <div class="item-right">
              <span class="tag" style="margin-right:4px;">{{ matchesCount(t.id) }} матчей</span>
              <div class="actions">
                <button class="btn btn-xs btn-outline" (click)="$event.stopPropagation(); editTournament(t)">✏️</button>
                <button class="btn btn-xs btn-danger" (click)="$event.stopPropagation(); deleteTournament(t)">🗑</button>
              </div>
            </div>
          </div>
          @if (selectedTournamentId() === t.id) {
            <div style="padding:4px 0 0 8px;border-left:1px solid rgba(220,38,38,0.06);margin-bottom:4px;">
              @if (matchesLoading()) {
                <div class="skeleton" style="height:20px"></div>
              } @else if (tournamentMatches().length === 0) {
                <div style="font-size:9px;color:var(--text-muted);font-style:italic;padding:4px 0;">Нет матчей</div>
              } @else {
                <div class="bracket-round">
                  <div class="bracket-round-title">🗓 Матчи турнира</div>
                  @for (m of tournamentMatches(); track m.id) {
                    <div class="match-card">
                      <div class="match-teams">
                        <span>{{ m.team1_id || '—' }}</span>
                        <span class="match-vs">vs</span>
                        <span>{{ m.team2_id || '—' }}</span>
                      </div>
                      <div class="match-score">
                        {{ m.score_team1 ?? '?' }}:{{ m.score_team2 ?? '?' }}
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      }
    </div>
  `,
  imports: [ReactiveFormsModule],
})
export class SportComponent implements OnInit {
  private sport = inject(SportService);

  teams = signal<Team[]>([]);
  tournaments = signal<Tournament[]>([]);
  teamsLoading = signal(true);
  tournamentsLoading = signal(true);

  showTeamForm = signal(false);
  editingTeamId = signal<string | null>(null);
  showTournamentForm = signal(false);
  editingTournamentId = signal<string | null>(null);

  selectedTournamentId = signal<string | null>(null);
  tournamentMatches = signal<Match[]>([]);
  matchesLoading = signal(false);
  private allMatches: Record<string, Match[]> = {};

  teamForm = new FormGroup({
    title: new FormControl('', Validators.required),
  });

  tournamentForm = new FormGroup({
    title: new FormControl('', Validators.required),
    format: new FormControl('single_elimination', Validators.required),
  });

  ngOnInit() { this.loadTeams(); this.loadTournaments(); }

  formatLabel(f: string): string {
    const map: Record<string, string> = { single_elimination: '1v1', round_robin: 'Round Robin', time_trial: 'Time Trial' };
    return map[f] || f;
  }

  matchesCount(tournamentId: string): number {
    return (this.allMatches[tournamentId] || []).length;
  }

  async selectTournament(t: Tournament) {
    if (this.selectedTournamentId() === t.id) {
      this.selectedTournamentId.set(null);
      return;
    }
    this.selectedTournamentId.set(t.id);
    if (!this.allMatches[t.id]) {
      this.matchesLoading.set(true);
      try {
        const matches = await this.sport.getMatches(t.id);
        this.allMatches[t.id] = matches;
        this.tournamentMatches.set(matches);
      } catch {
        this.allMatches[t.id] = [];
        this.tournamentMatches.set([]);
      }
      this.matchesLoading.set(false);
    } else {
      this.tournamentMatches.set(this.allMatches[t.id]);
    }
  }

  async loadTeams() {
    this.teamsLoading.set(true);
    try { this.teams.set(await this.sport.getTeams()); }
    catch { this.teams.set([]); }
    finally { this.teamsLoading.set(false); }
  }

  async loadTournaments() {
    this.tournamentsLoading.set(true);
    try { this.tournaments.set(await this.sport.getTournaments()); }
    catch { this.tournaments.set([]); }
    finally { this.tournamentsLoading.set(false); }
  }

  editTeam(t: Team) {
    this.editingTeamId.set(t.id);
    this.teamForm.patchValue({ title: t.title });
    this.showTeamForm.set(true);
  }

  cancelTeamForm() {
    this.showTeamForm.set(false);
    this.editingTeamId.set(null);
    this.teamForm.reset({ title: '' });
  }

  async saveTeam() {
    if (this.teamForm.invalid) return;
    try {
      if (this.editingTeamId()) {
        await this.sport.updateTeam(this.editingTeamId()!, { title: this.teamForm.value.title! });
      } else {
        await this.sport.createTeam({ title: this.teamForm.value.title! } as Team);
      }
      this.cancelTeamForm();
      this.loadTeams();
    } catch (e: any) { alert(e.message); }
  }

  async deleteTeam(t: Team) {
    if (!confirm('Удалить команду "' + t.title + '"?')) return;
    try { await this.sport.deleteTeam(t.id); this.loadTeams(); }
    catch (e: any) { alert(e.message); }
  }

  editTournament(t: Tournament) {
    this.editingTournamentId.set(t.id);
    this.tournamentForm.patchValue({ title: t.title, format: t.format });
    this.showTournamentForm.set(true);
  }

  cancelTournamentForm() {
    this.showTournamentForm.set(false);
    this.editingTournamentId.set(null);
    this.tournamentForm.reset({ title: '', format: 'single_elimination' });
  }

  async saveTournament() {
    if (this.tournamentForm.invalid) return;
    try {
      if (this.editingTournamentId()) {
        await this.sport.updateTournament(this.editingTournamentId()!, {
          title: this.tournamentForm.value.title!,
          format: this.tournamentForm.value.format!,
        });
      } else {
        await this.sport.createTournament({
          title: this.tournamentForm.value.title!,
          format: this.tournamentForm.value.format!,
        } as Tournament);
      }
      this.cancelTournamentForm();
      this.loadTournaments();
    } catch (e: any) { alert(e.message); }
  }

  async deleteTournament(t: Tournament) {
    if (!confirm('Удалить турнир "' + t.title + '"?')) return;
    try { await this.sport.deleteTournament(t.id); this.loadTournaments(); }
    catch (e: any) { alert(e.message); }
  }
}
