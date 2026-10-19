import { useEffect, useState } from 'react'
import type { FocusEvent } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// Auto-advancing slide index that pauses while the pointer or focus is inside the hero,
// while the tab is hidden, and when the user prefers reduced motion.
export function useHeroCarousel(slideCount: number, intervalMs = 6500) {
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const [tabHidden, setTabHidden] = useState(() => document.hidden)
  const [reduceMotion, setReduceMotion] = useState(
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches
  )

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const onMotion = () => setReduceMotion(query.matches)
    document.addEventListener('visibilitychange', onVisibility)
    query.addEventListener('change', onMotion)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      query.removeEventListener('change', onMotion)
    }
  }, [])

  const paused = hovered || focused || tabHidden || reduceMotion || manuallyPaused
  useEffect(() => {
    if (paused || slideCount < 2) return
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % slideCount),
      intervalMs
    )
    return () => window.clearInterval(timer)
  }, [paused, slideCount, intervalMs])

  const handlers = {
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
      setFocused(false)
    },
  }

  return {
    active: slideCount ? active % slideCount : 0,
    handlers,
    manuallyPaused,
    togglePause: () => setManuallyPaused((value) => !value),
    selectSlide: (index: number) => {
      setActive(index)
      setManuallyPaused(true)
    },
  }
}
