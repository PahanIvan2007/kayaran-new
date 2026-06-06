import { useEffect, useState } from 'react'
import { boatsService } from '../../services/boats'
import { eventsService } from '../../services/events'
import { rentalsService } from '../../services/rentals'

export default function Boats() {
  const [boats, setBoats] = useState<any[]>([])
  const [filterAvailable, setFilterAvailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [bookingBoat, setBookingBoat] = useState<any>(null)
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState(1)
  const [selectedTariff, setSelectedTariff] = useState('Standard')
  const [showPayment, setShowPayment] = useState<any>(null)

  const tariffs = [
    { id: 'Standard', price: 1500, label: 'Стандарт', desc: 'Базовый тариф', badge: '' },
    { id: 'Family', price: 1200, label: 'Семейный', desc: 'Для двоих', badge: '-20%' },
    { id: 'Student', price: 900, label: 'Студенческий', desc: 'Для учащихся', badge: '-40%' },
    { id: 'Inclusive', price: 0, label: 'Инклюзив', desc: 'Для людей с ОВЗ', badge: 'Бесплатно' },
  ]

  const loadBoats = async () => {
    setLoading(true)
    try {
      const data = filterAvailable
        ? await boatsService.getAvailable('P000001')
        : await boatsService.getAll()
      setBoats(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadBoats() }, [filterAvailable])

  const openBooking = (b: any) => {
    setBookingBoat(b)
    setShowBooking(true)
    setStartTime(new Date().toISOString().slice(0, 16))
    setDuration(1)
    setSelectedTariff('Standard')
  }

  const confirmBooking = async () => {
    if (!bookingBoat) return
    try {
      const ev = await eventsService.create({ event_type: 'rental', title: `Аренда ${bookingBoat.title || bookingBoat.serial_number}`, start_time: new Date(startTime).toISOString() })
      const rental = await rentalsService.create({ event_id: ev.id, boat_id: bookingBoat.id, start_time: new Date(startTime).toISOString() })
      const tariff = tariffs.find(t => t.id === selectedTariff)
      setShowPayment({ amount: (tariff?.price || 1500) * duration, rental_id: rental.id, payment_id: `PAY-${Date.now()}` })
      setShowBooking(false)
    } catch (e: any) { alert(e.message) }
  }

  const conditionScore = (cl?: string) => {
    if (!cl) return 5
    const m: Record<string, number> = { 'excellent': 5, 'good': 4, 'fair': 3, 'poor': 2, 'damaged': 1 }
    return m[cl] || 3
  }

  return (
    <div className="page-boats">
      <div className="toolbar">
        <button className="btn btn-ghost btn-sm" onClick={loadBoats}>{'\uD83D\uDD04'}</button>
        <label className="tgl">
          <input type="checkbox" checked={filterAvailable} onChange={e => setFilterAvailable(e.target.checked)} />
          <span className="tgl-slider" />
        </label>
        <span className="toolbar-count">{boats.length}</span>
      </div>

      <div className="boats-grid">
        {loading && [1,2,3,4].map(i => <div key={i} className="boat-card skeleton" />)}
        {!loading && boats.map((b: any) => (
          <div key={b.id} className="boat-card card">
            <div className="boat-qr"><canvas id={`qr-${b.id}`} /></div>
            <div className="boat-info">
              <div className="boat-title">{b.title || b.serial_number}</div>
              <div className="boat-meta">{b.boat_type} • {b.color}</div>
              <div className="boat-capacity">{'\uD83D\uDC65'} {b.capacity} чел.</div>
              <div className="stars">{'★'.repeat(conditionScore(b.condition_level))}{'☆'.repeat(5 - conditionScore(b.condition_level))}</div>
              <span className={`badge badge-${b.status}`}>{b.status}</span>
            </div>
            {b.status === 'available' && (
              <button className="btn btn-primary btn-sm" onClick={() => openBooking(b)}>Забронировать</button>
            )}
          </div>
        ))}
      </div>

      {showPayment && (
        <div className="modal-overlay" onClick={() => setShowPayment(null)}>
          <div className="card modal" onClick={e => e.stopPropagation()}>
            <h3>Оплата</h3>
            <p>Сумма: {showPayment.amount} ₽</p>
            <p>ID аренды: {showPayment.rental_id}</p>
            <p>ID платежа: {showPayment.payment_id}</p>
            <button className="btn btn-primary" onClick={() => setShowPayment(null)}>OK</button>
          </div>
        </div>
      )}

      {showBooking && (
        <div className="modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="card modal" onClick={e => e.stopPropagation()}>
            <h3>Бронирование</h3>
            <p>{bookingBoat?.title || bookingBoat?.serial_number}</p>
            <div className="form-group">
              <label>Начало</label>
              <input className="input" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Длительность (часы)</label>
              <input className="input" type="number" min={1} value={duration} onChange={e => setDuration(Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Тариф</label>
              <select className="input" value={selectedTariff} onChange={e => setSelectedTariff(e.target.value)}>
                {tariffs.map(t => <option key={t.id} value={t.id}>{t.label} — {t.price} ₽/ч{t.badge ? ` (${t.badge})` : ''}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, margin: '8px 0' }}>
              Итого: {(tariffs.find(t => t.id === selectedTariff)?.price || 1500) * duration} ₽
            </div>
            <button className="btn btn-primary" onClick={confirmBooking}>Подтвердить</button>
          </div>
        </div>
      )}
    </div>
  )
}
