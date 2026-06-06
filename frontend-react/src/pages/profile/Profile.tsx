import { useState, useEffect, useCallback } from 'react'
import { useAuth, login, register, updateProfile } from '../../services/auth'
import { dataService } from '../../services/data'

export default function Profile() {
  const { user, token, setAuth, logout } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [phone, setPhone] = useState('+79990001122')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async () => {
    setLoading(true); setError('')
    try {
      const res = await login(phone).catch(() => null)
      if (res) { setAuth(res); return }
      const r = await register(firstName || 'User', lastName, phone)
      setAuth(r)
    } catch (e: any) { setError(e.message || 'Ошибка') }
    finally { setLoading(false) }
  }

  const saveProfile = async () => {
    if (!user) return
    try { await updateProfile(user.id, { first_name: firstName || user.first_name, last_name: lastName || user.last_name }); setEditMode(false) }
    catch (e: any) { setError(e.message) }
  }

  const loadUsers = async () => { try { setUsers(await dataService.getUsers()) } catch {} }

  useEffect(() => { if (user) { setFirstName(user.first_name); setLastName(user.last_name || '') } }, [user])

  if (!token || !user) return (
    <div className="page-profile">
      <div className="card" style={{ maxWidth: 380, margin: '0 auto', padding: 20 }}>
        <h2 style={{ textAlign: 'center' }}>Вход</h2>
        <div className="form-group">
          <label>Телефон</label>
          <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Имя</label>
          <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Имя" />
        </div>
        <div className="form-group">
          <label>Фамилия</label>
          <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Фамилия" />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <button className="btn btn-primary" onClick={handleRegister} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Загрузка...' : 'Войти / Зарегистрироваться'}
        </button>
        <p className="hint" style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          Демо: +79990001122 / Анна Спортсменова
        </p>
      </div>
    </div>
  )

  return (
    <div className="page-profile">
      <div className="card profile-card">
        <div className="profile-avatar">{user.first_name[0]}{user.last_name?.[0]}</div>
        <h3>{user.first_name} {user.last_name}</h3>
        <div className="profile-role">{user.role}</div>
        <div className="profile-qr">
          <canvas id="qr-canvas" />
        </div>
        <div className="profile-detail"><span>ID:</span> {user.id}</div>
        <div className="profile-detail"><span>Телефон:</span> {user.phone}</div>
        <div className="profile-detail"><span>Статус:</span> {user.status || 'active'}</div>
      </div>

      {editMode ? (
        <div className="card" style={{ padding: 16, marginTop: 8 }}>
          <div className="form-group">
            <label>Имя</label>
            <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Фамилия</label>
            <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={saveProfile}>Сохранить</button>
            <button className="btn btn-ghost" onClick={() => setEditMode(false)}>Отмена</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={() => setEditMode(true)}>Редактировать</button>
          <button className="btn btn-ghost" onClick={logout}>Выйти</button>
        </div>
      )}

      {user?.role === 'system_admin' && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={loadUsers}>Загрузить пользователей</button>
          {users.length > 0 && (
            <div className="card" style={{ marginTop: 8, padding: 8 }}>
              {users.map((u: any) => (
                <div key={u.id} className="profile-detail">{u.first_name} {u.last_name} — {u.role}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
