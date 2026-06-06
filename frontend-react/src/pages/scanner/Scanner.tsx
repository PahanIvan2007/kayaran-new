import { useState, useRef, useEffect, useCallback } from 'react'
import { boatsService } from '../../services/boats'
import { eventsService } from '../../services/events'
import { dataService } from '../../services/data'

const typeLabels: Record<string, string> = {
  B: 'Лодка', E: 'Событие', P: 'Точка', U: 'Пользователь', R: 'Маршрут',
}

export default function Scanner() {
  const [scannerActive, setScannerActive] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualId, setManualId] = useState('')
  const [qrResult, setQrResult] = useState<any>(null)
  const [qrResultTitle, setQrResultTitle] = useState('')
  const [qrResultBody, setQrResultBody] = useState('')
  const [scanHistory, setScanHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('kayran_scan_history') || '[]') } catch { return [] }
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<number>(0)

  const stopScanner = useCallback(() => {
    clearInterval(scanTimerRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setScannerActive(false)
  }, [])

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setScannerActive(true)
    } catch { alert('Нет доступа к камере') }
  }

  const scanFrame = () => {
    const video = videoRef.current, canvas = canvasRef.current, jsQR = window.jsQR
    if (!video || !canvas || !jsQR) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth; canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(new Uint8Array(imageData.data.buffer), canvas.width, canvas.height)
    if (code) {
      const url = code.data
      const match = url.match(/[BEPRSUPG][A-F0-9]{6}/)
      if (match) { handleQRId(match[0]); stopScanner() }
    }
  }

  useEffect(() => {
    if (scannerActive) scanTimerRef.current = window.setInterval(scanFrame, 300)
    return () => clearInterval(scanTimerRef.current)
  }, [scannerActive])

  const handleQRId = async (id: string) => {
    const prefix = id[0]
    addToHistory(id)
    try {
      let title = '', body = ''
      switch (prefix) {
        case 'B': {
          const b = await boatsService.getById(Number(id.slice(1)))
          title = `${typeLabels[prefix]} #${b.id}`
          body = `${b.title || b.serial_number} — ${b.boat_type}, ${b.status}`
          break
        }
        case 'E': {
          const e = await eventsService.getById(Number(id.slice(1)))
          title = `${typeLabels[prefix]} #${e.id}`
          body = `${e.title} — ${e.status}`
          break
        }
        case 'U': {
          const u = await dataService.getUser(Number(id.slice(1)))
          title = `${typeLabels[prefix]} #${u.id}`
          body = `${u.first_name} ${u.last_name || ''} — ${u.role}`
          break
        }
        case 'R': {
          const r = await dataService.getRoute(Number(id.slice(1)))
          title = `${typeLabels[prefix]} #${r.id}`
          body = `${r.title} — ${r.difficulty || ''}`
          break
        }
        default: title = typeLabels[prefix] || 'Неизвестно'; body = `ID: ${id}`
      }
      setQrResult(id); setQrResultTitle(title); setQrResultBody(body)
    } catch { setQrResult(id); setQrResultTitle(typeLabels[prefix] || 'Объект'); setQrResultBody(`ID: ${id}`) }
  }

  const handleQRInput = () => {
    const id = manualId.trim().toUpperCase()
    if (/^[BEPRSUPG][A-F0-9]{6}$/.test(id)) handleQRId(id)
    else alert('Неверный формат ID')
  }

  const addToHistory = (id: string) => {
    const item = { id, time: new Date().toLocaleString(), type: typeLabels[id[0]] || '?' }
    const updated = [item, ...scanHistory.filter((h: any) => h.id !== id)].slice(0, 20)
    setScanHistory(updated)
    localStorage.setItem('kayran_scan_history', JSON.stringify(updated))
  }

  const rescan = (id: string) => {
    handleQRId(id)
  }

  return (
    <div className="page-scanner">
      <div className="scanner-view">
        {scannerActive ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 8 }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div className="scanner-overlay">
              <div className="scanner-frame">
                <div className="scanner-corner tl" /><div className="scanner-corner tr" />
                <div className="scanner-corner bl" /><div className="scanner-corner br" />
                <div className="scanner-line" />
              </div>
            </div>
          </>
        ) : (
          <div className="scanner-placeholder">
            <div className="scanner-icon">{'\uD83D\uDCF7'}</div>
            <p>Наведите камеру на QR-код</p>
          </div>
        )}

        <div className="scanner-controls">
          {!scannerActive ? (
            <button className="btn btn-primary" onClick={startScanner}>{'\uD83D\uDCF7'} Сканировать</button>
          ) : (
            <button className="btn btn-ghost" onClick={stopScanner}>Остановить</button>
          )}
          <button className="btn btn-ghost" onClick={() => setShowManual(!showManual)}>{'\u2328'} Вручную</button>
        </div>

        {showManual && (
          <div className="card" style={{ padding: 12, marginTop: 8 }}>
            <input className="input" value={manualId} onChange={e => setManualId(e.target.value)} placeholder="ID (B, E, P, U, R + 6 символов)" />
            <button className="btn btn-primary btn-sm" onClick={handleQRInput}>Найти</button>
          </div>
        )}
      </div>

      {qrResult && (
        <div className="card qr-result">
          <h3>{qrResultTitle}</h3>
          <p>{qrResultBody}</p>
          <button className="btn btn-ghost btn-sm" onClick={() => { setQrResult(null); setQrResultTitle(''); setQrResultBody('') }}>{'\u2715'}</button>
        </div>
      )}

      {scanHistory.length > 0 && (
        <div className="scan-history">
          <h4>История сканирований</h4>
          {scanHistory.map((h: any) => (
            <div key={h.id} className="scan-history-item" onClick={() => rescan(h.id)}>
              <span className="scan-history-id">{h.id}</span>
              <span className="scan-history-type">{h.type}</span>
              <span className="scan-history-time">{h.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
