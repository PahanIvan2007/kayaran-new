import { useNavigate } from 'react-router-dom'

const tariffs = [
  { id: 'Standard', label: 'Стандарт', price: 1500, desc: 'Базовый тариф проката. Включено: лодка, спасательный жилет, весла.', features: ['Лодка', 'Спасательный жилет', 'Весла', 'Инструктаж'], badge: '' },
  { id: 'Family', label: 'Семейный', price: 1200, desc: 'Для двоих. Скидка 20% при аренде двух мест.', features: ['Всё из Стандарта', 'Двухместная лодка', 'Скидка 20%'], badge: '-20%' },
  { id: 'Student', label: 'Студенческий', price: 900, desc: 'Для учащихся при предъявлении студенческого билета.', features: ['Всё из Стандарта', 'Скидка 40%'], badge: '-40%' },
  { id: 'Inclusive', label: 'Инклюзив', price: 0, desc: 'Для людей с ограниченными возможностями здоровья. Бесплатно.', features: ['Всё из Стандарта', 'Адаптивное оборудование', 'Сопровождение'], badge: 'Бесплатно' },
]

export default function Tariffs() {
  const navigate = useNavigate()

  return (
    <div className="page-tariffs">
      <div className="card" style={{ textAlign: 'center', padding: 20, marginBottom: 8 }}>
        <h2>Тарифы</h2>
        <p style={{ color: 'var(--text-muted)' }}>Выберите подходящий тариф для аренды</p>
      </div>

      <div className="tariffs-grid">
        {tariffs.map(t => (
          <div key={t.id} className="card tariff-card">
            {t.badge && <span className="tariff-badge">{t.badge}</span>}
            <h3 className="tariff-name">{t.label}</h3>
            <div className="tariff-price">
              {t.price === 0 ? 'Бесплатно' : `${t.price} ₽`}
              {t.price > 0 && <span className="tariff-period">/ час</span>}
            </div>
            <p className="tariff-desc">{t.desc}</p>
            <div className="tariff-features">
              {t.features.map((f, i) => <span key={i} className="tariff-feature">{'\u2713'} {f}</span>)}
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/boats')}>Забронировать</button>
          </div>
        ))}
      </div>
    </div>
  )
}
