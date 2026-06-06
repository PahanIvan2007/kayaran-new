import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../services/auth'
import { dataService } from '../../services/data'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dataService.getStats().then(setStats).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-home">
      <div className="hero">
        <div className="hero-crest">{'\u2694'}</div>
        <h1>Каяран</h1>
        <p className="hero-sub">Платформа водных активностей</p>
      </div>

      <div className="stats-grid">
        {loading ? (
          <>
            {[1,2,3,4,5,6].map(i => <div key={i} className="stat-card skeleton" />)}
          </>
        ) : stats ? (
          <>
            <div className="stat-card"><div className="stat-value">{stats.available_boats}</div><div className="stat-label">Лодок свободно</div></div>
            <div className="stat-card"><div className="stat-value">{stats.active_events}</div><div className="stat-label">Событий активных</div></div>
            <div className="stat-card"><div className="stat-value">{stats.total_boats}</div><div className="stat-label">Всего лодок</div></div>
            <div className="stat-card"><div className="stat-value">{stats.tournaments}</div><div className="stat-label">Турниров</div></div>
            <div className="stat-card"><div className="stat-value">{stats.teams}</div><div className="stat-label">Команд</div></div>
            <div className="stat-card"><div className="stat-value">{stats.routes}</div><div className="stat-label">Маршрутов</div></div>
          </>
        ) : null}
      </div>

      {!user && (
        <div className="card" style={{ textAlign: 'center', padding: 20 }}>
          <h3>Добро пожаловать!</h3>
          <p style={{ color: 'var(--text-muted)' }}>Войдите, чтобы получить полный доступ</p>
          <button className="btn btn-primary" onClick={() => navigate('/profile')} style={{ marginTop: 10 }}>Войти</button>
        </div>
      )}

      <div className="quick-actions">
        <h3>Быстрые действия</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => navigate('/scan')}>{'\u2694'} Сканер</button>
          <button className="action-btn" onClick={() => navigate('/boats')}>{'\u26F5'} Лодки</button>
          <button className="action-btn" onClick={() => navigate('/rentals')}>{'\uD83D\uDCCB'} Аренда</button>
          <button className="action-btn" onClick={() => navigate('/gps')}>{'\uD83D\uDCCD'} GPS</button>
          <button className="action-btn" onClick={() => navigate('/routes')}>{'\uD83D\uDEE4'} Маршруты</button>
          <button className="action-btn" onClick={() => navigate('/events')}>{'\uD83D\uDCDC'} События</button>
          <button className="action-btn" onClick={() => navigate('/tariffs')}>{'\uD83D\uDCB0'} Тарифы</button>
          <button className="action-btn" onClick={() => navigate('/stations')}>{'\uD83D\uDCCD'} Станции</button>
        </div>
      </div>
    </div>
  )
}
