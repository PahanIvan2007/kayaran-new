import { useEffect, useState } from 'react'
import { dataService } from '../../services/data'

export default function Stations() {
  const [franchises, setFranchises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dataService.getFranchises().then(setFranchises).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-stations">
      <div className="card" style={{ textAlign: 'center', padding: 20, marginBottom: 8 }}>
        <h2>Наши станции</h2>
        <p style={{ color: 'var(--text-muted)' }}>Сеть станций проката и активностей</p>
      </div>

      {loading && [1,2].map(i => <div key={i} className="card skeleton" style={{ height: 80 }} />)}
      {!loading && franchises.map((f: any) => (
        <div key={f.id} className="card franchise-card">
          <div className="franchise-name">{f.name}</div>
          <div className="franchise-address">{f.address}</div>
          <div className="franchise-coords">{f.latitude}, {f.longitude}</div>
          {f.latitude && f.longitude && (
            <a className="btn btn-ghost btn-sm" href={`https://yandex.ru/maps?pt=${f.longitude},${f.latitude}&z=15&l=map`} target="_blank">{'\uD83D\uDCCD'} Открыть карту</a>
          )}
        </div>
      ))}

      <div className="card contact-card" style={{ marginTop: 8, padding: 16 }}>
        <h3>Контакты</h3>
        <div>{'\uD83D\uDCDE'} +7 (495) 123-45-67</div>
        <div>{'\u2709'} info@kayaran.ru</div>
        <div>{'\uD83D\uDCF1'} @kayaran</div>
        <div>{'\uD83D\uDCCD'} г. Москва, ул. Водная, д. 1</div>
      </div>
    </div>
  )
}
