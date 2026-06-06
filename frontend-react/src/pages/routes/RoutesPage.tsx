import { useEffect, useState } from 'react'
import { dataService } from '../../services/data'

const difficultyLabels: Record<string, string> = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный', extreme: 'Экстрим' }

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [distance, setDistance] = useState('')

  const loadRoutes = async () => {
    setLoading(true)
    try { setRoutes(await dataService.getRoutes()) }
    catch {}
    setLoading(false)
  }

  useEffect(() => { loadRoutes() }, [])

  const saveRoute = async () => {
    try {
      await dataService.createRoute({ title, description, difficulty, distance_km: distance ? Number(distance) : undefined })
      setShowForm(false); setTitle(''); setDescription(''); setDifficulty('easy'); setDistance(''); loadRoutes()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="page-routes">
      <div className="toolbar">
        <button className="btn btn-ghost btn-sm" onClick={loadRoutes}>{'\uD83D\uDD04'}</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Маршрут</button>
        <span className="toolbar-count">{routes.length}</span>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div className="form-group">
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название" />
          </div>
          <div className="form-group">
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание" />
          </div>
          <div className="form-group">
            <select className="input" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              {Object.entries(difficultyLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <input className="input" type="number" value={distance} onChange={e => setDistance(e.target.value)} placeholder="Дистанция (км)" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveRoute}>Сохранить</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </div>
      )}

      {loading && [1,2].map(i => <div key={i} className="card skeleton" style={{ height: 60 }} />)}
      {!loading && routes.map((r: any) => (
        <div key={r.id} className="card route-card" style={{ borderLeft: `4px solid ${r.difficulty === 'easy' ? 'var(--green, #22c55e)' : r.difficulty === 'medium' ? 'var(--yellow, #eab308)' : 'var(--red, #dc2626)'}` }}>
          <div className="route-title">{r.title}</div>
          <div className="route-meta">
            <span className="badge">{difficultyLabels[r.difficulty] || r.difficulty}</span>
            {r.distance_km && <span>{r.distance_km} км</span>}
          </div>
          {r.description && <div className="route-desc">{r.description}</div>}
        </div>
      ))}
    </div>
  )
}
