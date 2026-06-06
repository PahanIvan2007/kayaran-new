import { useEffect, useState } from 'react'
import { eventsService } from '../../services/events'
import { rentalsService } from '../../services/rentals'

export default function Rentals() {
  const [rentals, setRentals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnlyActive, setShowOnlyActive] = useState(false)

  const loadRentals = async () => {
    setLoading(true)
    try {
      const events = await eventsService.getAll('rental')
      const enriched = await Promise.all(
        events.map(async (e: any) => {
          let participants: any[] = []
          try { participants = await eventsService.getParticipants(e.id) } catch {}
          return { ...e, participants }
        })
      )
      setRentals(enriched)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadRentals() }, [])

  const returnRental = async (r: any) => {
    try { await rentalsService.returnRental(r.id); loadRentals() }
    catch (e: any) { alert(e.message) }
  }

  const reportDamage = async (r: any) => {
    const level = prompt('Уровень повреждения (1-5):', '1')
    if (!level) return
    const notes = prompt('Примечания:') || ''
    try { await rentalsService.reportDamage(r.id, Number(level), notes); loadRentals() }
    catch (e: any) { alert(e.message) }
  }

  const filtered = showOnlyActive ? rentals.filter((r: any) => r.status === 'active' || r.status === 'draft') : rentals

  return (
    <div className="page-rentals">
      <div className="toolbar">
        <button className="btn btn-ghost btn-sm" onClick={loadRentals}>{'\uD83D\uDD04'}</button>
        <label className="tgl">
          <input type="checkbox" checked={showOnlyActive} onChange={e => setShowOnlyActive(e.target.checked)} />
          <span className="tgl-slider" />
        </label>
        <span className="toolbar-count">{filtered.length}</span>
      </div>

      {loading && [1,2,3].map(i => <div key={i} className="card skeleton" style={{ height: 60 }} />)}
      {!loading && filtered.map((r: any) => (
        <div key={r.id} className="card rental-card">
          <div className="rental-info">
            <div className="rental-title">{r.title || `Аренда #${r.id}`}</div>
            <div className="rental-status"><span className={`badge badge-${r.status}`}>{r.status}</span></div>
            {r.start_time && <div className="rental-date">{new Date(r.start_time).toLocaleDateString()} — {r.end_time ? new Date(r.end_time).toLocaleDateString() : 'текущая'}</div>}
            <div className="rental-id">ID: {r.id}</div>
            {r.event && <div className="rental-id">Лодка: {r.boat_id || '—'}</div>}
          </div>
          {r.status === 'active' && (
            <div className="rental-actions" style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-primary btn-xs" onClick={() => returnRental(r)}>Вернуть</button>
              <button className="btn btn-ghost btn-xs" onClick={() => reportDamage(r)}>{'\u26A0'} Повреждение</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
