interface Window {
  __API_URL__?: string
  jsQR?: (data: Uint8Array, width: number, height: number) => { data: string } | null
  DeferredPrompt?: Event
}
