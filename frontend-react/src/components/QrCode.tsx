import { useEffect, useRef, useState } from 'react'

export default function QrCode({ value, size = 100 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    import('qrcode').then(mod => {
      mod.default.toDataURL(value, {
        width: size,
        margin: 1,
        color: { dark: '#f1f5f9', light: 'transparent' },
      }).then((url: string) => {
        if (mounted.current) setDataUrl(url)
      })
    }).catch(() => {})
    return () => { mounted.current = false }
  }, [value, size])

  if (dataUrl) return <img src={dataUrl} alt="QR" style={{ width: size, height: size, borderRadius: 4 }} className="qr-img" />
  return <div className="qr-placeholder" style={{ width: size, height: size }}>{value.slice(0, 2)}</div>
}
