import { useEffect, useRef, useState } from 'react'

export function useRoomDisplay(connected: boolean) {
  const roomRef = useRef<HTMLElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === roomRef.current)
    document.addEventListener('fullscreenchange', change)
    return () => document.removeEventListener('fullscreenchange', change)
  }, [])
  useEffect(() => {
    if (!connected) return
    const start = Date.now()
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [connected])
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === roomRef.current) await document.exitFullscreen()
      else await roomRef.current?.requestFullscreen()
    } catch { /* Fullscreen may be unavailable in the browser. */ }
  }
  const elapsed = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((part) => String(part).padStart(2, '0')).join(':')
  return { roomRef, fullscreen, toggleFullscreen, elapsed }
}
