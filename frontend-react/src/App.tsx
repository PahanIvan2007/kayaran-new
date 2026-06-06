import { useEffect, useState, useMemo } from 'react'
import { Route, Routes, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from './services/auth'
import Home from './pages/home/Home'
import Scanner from './pages/scanner/Scanner'
import Boats from './pages/boats/Boats'
import Events from './pages/events/Events'
import Rentals from './pages/rentals/Rentals'
import Sport from './pages/sport/Sport'
import Gps from './pages/gps/Gps'
import RoutesPage from './pages/routes/RoutesPage'
import Stations from './pages/stations/Stations'
import Tariffs from './pages/tariffs/Tariffs'
import Profile from './pages/profile/Profile'

const tabs = [
  { id: '', icon: '\u2302', label: 'Главная' },
  { id: 'scan', icon: '\u2694', label: 'Сканер' },
  { id: 'boats', icon: '\u26F5', label: 'Лодки' },
  { id: 'events', icon: '\uD83D\uDCDC', label: 'События' },
  { id: 'rentals', icon: '\uD83D\uDCCB', label: 'Аренда' },
  { id: 'sport', icon: '\uD83C\uDFC6', label: 'Спорт' },
  { id: 'stations', icon: '\uD83D\uDCCD', label: 'Станции' },
  { id: 'tariffs', icon: '\uD83D\uDCB0', label: 'Тарифы' },
  { id: 'profile', icon: '\uD83E\uDDD9', label: 'Профиль' },
]

export default function App() {
  const { user, refresh } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installAccepted, setInstallAccepted] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('kayran_token')) refresh()
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e) }
    const installed = () => { setDeferredPrompt(null); setInstallAccepted(true) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installed)
    return () => { window.removeEventListener('beforeinstallprompt', handler); window.removeEventListener('appinstalled', installed) }
  }, [])

  const isActive = (id: string) => {
    const p = location.pathname
    if (!id) return p === '/'
    return p === '/' + id
  }

  const statusText = user ? user.first_name : 'гость'
  const statusBg = user ? 'rgba(220,38,38,0.08)' : 'transparent'
  const statusColor = user ? 'var(--red-light)' : 'var(--text3)'

  const installPWA = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setInstallAccepted(true)
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <div className="header-crest">{'\u2694'}</div>
          <div className="header-info">
            <h1>Kayran</h1>
            <div className="sub">— платформа водных активностей —</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="status" style={{ background: statusBg, color: statusColor }}>{statusText}</span>
          <div className="bell-wrap">
            <button className="bell-btn" onClick={() => setShowNotifs(!showNotifs)}>{'\uD83D\uDD14'}</button>
            {showNotifs && (
              <div className="notif-panel">
                <div className="notif-item" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>Нет уведомлений</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {deferredPrompt && !installAccepted && (
        <div className="pwa-banner">
          <span>{'\uD83D\uDCF2'}</span>
          <span className="pwa-banner-text">Установите приложение на экран</span>
          <button className="btn btn-xs btn-primary" onClick={installPWA}>Установить</button>
          <button className="btn btn-xs btn-ghost" onClick={() => setInstallAccepted(true)}>{'\u2715'}</button>
        </div>
      )}

      <div className="tabs">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            className={`tab${isActive(tab.id) ? ' active' : ''}`}
            to={'/' + tab.id}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </Link>
        ))}
      </div>

      <div className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scan" element={<Scanner />} />
          <Route path="/boats" element={<Boats />} />
          <Route path="/events" element={<Events />} />
          <Route path="/rentals" element={<Rentals />} />
          <Route path="/sport" element={<Sport />} />
          <Route path="/gps" element={<Gps />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/stations" element={<Stations />} />
          <Route path="/tariffs" element={<Tariffs />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </div>
  )
}
