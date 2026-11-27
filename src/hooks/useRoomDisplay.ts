import { useEffect, useState } from 'react'

export function useRoomDisplay(connected: boolean) {
  const [fullscreen, setFullscreen] = useState(false)
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', change)
    return () => document.removeEventListener('fullscreenchange', change)
  }, [])
  useEffect(() => {
    if (!connected) return
    const start = Date.now()
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [connected])
  // The whole page goes fullscreen, not just the room: dialogs render in a portal on <body> and must stay visible.
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch { /* Fullscreen may be unavailable in the browser. */ }
  }
  const elapsed = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':')
  return { fullscreen, toggleFullscreen, elapsed }
}
