import { useEffect, useState } from 'react'
import { sportService } from '../../services/sport'

const formatLabels: Record<string, string> = {
  single_elimination: 'Олимпийская система',
  round_robin: 'Круговая',
  time_trial: 'На время',
}

export default function Sport() {
  const [teams, setTeams] = useState<any[]>([])
  const [tournaments, setTournaments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showTeamForm, setShowTeamForm] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null)
  const [teamTitle, setTeamTitle] = useState('')

  const [showTournamentForm, setShowTournamentForm] = useState(false)
  const [editingTournamentId, setEditingTournamentId] = useState<number | null>(null)
  const [tournamentTitle, setTournamentTitle] = useState('')
  const [tournamentFormat, setTournamentFormat] = useState('single_elimination')

  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null)
  const [tournamentMatches, setTournamentMatches] = useState<any[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [allMatches, setAllMatches] = useState<Record<string, any[]>>({})

  const loadData = async () => {
    setLoading(true)
    try { const [tms, trns] = await Promise.all([sportService.getTeams(), sportService.getTournaments()]); setTeams(tms); setTournaments(trns) }
    catch {}
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const saveTeam = async () => {
    try {
      if (editingTeamId) await sportService.updateTeam(editingTeamId, { title: teamTitle })
      else await sportService.createTeam({ title: teamTitle })
      setShowTeamForm(false); setEditingTeamId(null); setTeamTitle(''); loadData()
    } catch (e: any) { alert(e.message) }
  }

  const deleteTeam = async (id: number) => {
    if (!confirm('Удалить команду?')) return
    try { await sportService.deleteTeam(id); loadData() } catch {}
  }

  const saveTournament = async () => {
    try {
      if (editingTournamentId) await sportService.updateTournament(editingTournamentId, { title: tournamentTitle, format: tournamentFormat })
      else await sportService.createTournament({ title: tournamentTitle, format: tournamentFormat })
      setShowTournamentForm(false); setEditingTournamentId(null); setTournamentTitle(''); setTournamentFormat('single_elimination'); loadData()
    } catch (e: any) { alert(e.message) }
  }

  const deleteTournament = async (id: number) => {
    if (!confirm('Удалить турнир?')) return
    try { await sportService.deleteTournament(id); loadData() } catch {}
  }

  const selectTournament = async (t: any) => {
    if (selectedTournamentId === t.id) { setSelectedTournamentId(null); return }
    setSelectedTournamentId(t.id)
    if (allMatches[t.id]) { setTournamentMatches(allMatches[t.id]); return }
    setMatchesLoading(true)
    try {
      const matches = await sportService.getMatches(t.id)
      setAllMatches(prev => ({ ...prev, [t.id]: matches }))
      setTournamentMatches(matches)
    } catch {}
    setMatchesLoading(false)
  }

  const matchesCount = (tournamentId: number) => allMatches[tournamentId]?.length ?? 0

  return (
    <div className="page-sport">
      <div className="toolbar">
        <button className="btn btn-ghost btn-sm" onClick={loadData}>{'\uD83D\uDD04'}</button>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowTeamForm(true); setEditingTeamId(null); setTeamTitle('') }}>+ Команда</button>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowTournamentForm(true); setEditingTournamentId(null); setTournamentTitle(''); setTournamentFormat('single_elimination') }}>+ Турнир</button>
      </div>

      {showTeamForm && (
        <div className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div className="form-group"><input className="input" value={teamTitle} onChange={e => setTeamTitle(e.target.value)} placeholder="Название команды" /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveTeam}>Сохранить</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowTeamForm(false); setEditingTeamId(null) }}>Отмена</button>
          </div>
        </div>
      )}

      {showTournamentForm && (
        <div className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div className="form-group"><input className="input" value={tournamentTitle} onChange={e => setTournamentTitle(e.target.value)} placeholder="Название турнира" /></div>
          <div className="form-group">
            <select className="input" value={tournamentFormat} onChange={e => setTournamentFormat(e.target.value)}>
              {Object.entries(formatLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveTournament}>Сохранить</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowTournamentForm(false); setEditingTournamentId(null) }}>Отмена</button>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 8 }}>Команды ({teams.length})</h3>
      {teams.map(t => (
        <div key={t.id} className="card team-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{t.title}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-xs" onClick={() => { setEditingTeamId(t.id); setTeamTitle(t.title); setShowTeamForm(true) }}>{'\u270F'}</button>
            <button className="btn btn-ghost btn-xs" onClick={() => deleteTeam(t.id)}>{'\uD83D\uDDD1'}</button>
          </div>
        </div>
      ))}

      <h3 style={{ marginTop: 12 }}>Турниры ({tournaments.length})</h3>
      {tournaments.map(t => (
        <div key={t.id} className="card tournament-card" onClick={() => selectTournament(t)} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="tournament-title">{t.title}</div>
              <div className="tournament-meta">{formatLabels[t.format] || t.format} • {matchesCount(t.id)} матч(ей)</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); setEditingTournamentId(t.id); setTournamentTitle(t.title); setTournamentFormat(t.format); setShowTournamentForm(true) }}>{'\u270F'}</button>
              <button className="btn btn-ghost btn-xs" onClick={e => { e.stopPropagation(); deleteTournament(t.id) }}>{'\uD83D\uDDD1'}</button>
            </div>
          </div>
          {selectedTournamentId === t.id && (
            <div className="tournament-brackets" style={{ marginTop: 8 }}>
              {matchesLoading ? <div className="skeleton" style={{ height: 40 }} /> : (
                tournamentMatches.length === 0
                  ? <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>Нет матчей</div>
                  : tournamentMatches.map((m: any) => (
                      <div key={m.id} className="match-card">
                        <div className="match-teams">
                          <span className="match-team">{m.team_a_id}</span>
                          <span className="match-score">{m.score_a} : {m.score_b}</span>
                          <span className="match-team">{m.team_b_id}</span>
                        </div>
                        <div className="match-status">{m.status}</div>
                      </div>
                    ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
