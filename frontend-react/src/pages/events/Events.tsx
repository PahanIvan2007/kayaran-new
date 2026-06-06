import { useEffect, useState } from 'react'
import { eventsService } from '../../services/events'

export default function Events() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [filterType, setFilterType] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('rental')

  const loadEvents = async () => {
    setLoading(true)
    try { setEvents(await eventsService.getAll(filterType || undefined)) }
    catch {}
    setLoading(false)
  }

  useEffect(() => { loadEvents() }, [filterType])

  const saveEvent = async () => {
    try {
      if (editingId) {
        await eventsService.update(editingId, { title, description, event_type: eventType })
      } else {
        await eventsService.create({ title, description, event_type: eventType })
      }
      setShowForm(false); setEditingId(null); loadEvents()
    } catch (e: any) { alert(e.message) }
  }

  const editEvent = (e: any) => {
    setEditingId(e.id); setTitle(e.title); setDescription(e.description || ''); setEventType(e.event_type); setShowForm(true)
  }

  const deleteEvent = async (e: any) => {
    if (!confirm('Удалить?')) return
    try { await eventsService.remove(e.id); loadEvents() }
    catch {}
  }

  const typeLabels: Record<string, string> = { rental: 'Аренда', route: 'Маршрут', competition: 'Соревнование', training: 'Тренировка' }

  return (
    <div className="page-events">
      <div className="toolbar">
        <button className="btn btn-ghost btn-sm" onClick={loadEvents}>{'\uD83D\uDD04'}</button>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setEditingId(null); setTitle(''); setDescription(''); setEventType('rental') }}>+ Событие</button>
        <select className="input input-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Все</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 12, marginBottom: 8 }}>
          <div className="form-group">
            <select className="input" value={eventType} onChange={e => setEventType(e.target.value)}>
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название" />
          </div>
          <div className="form-group">
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={saveEvent}>Сохранить</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditingId(null) }}>Отмена</button>
          </div>
        </div>
      )}

      <div className="events-list">
        {loading && [1,2,3].map(i => <div key={i} className="card skeleton" style={{ height: 60 }} />)}
        {!loading && events.map((e: any) => (
          <div key={e.id} className="card event-card">
            <div className="event-info">
              <div className="event-title">{e.title}</div>
              <div className="event-meta">{typeLabels[e.event_type] || e.event_type} • <span className={`badge badge-${e.status}`}>{e.status}</span></div>
              {e.description && <div className="event-desc">{e.description}</div>}
            </div>
            <div className="event-actions">
              <button className="btn btn-ghost btn-xs" onClick={() => editEvent(e)}>{'\u270F'}</button>
              <button className="btn btn-ghost btn-xs" onClick={() => deleteEvent(e)}>{'\uD83D\uDDD1'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
