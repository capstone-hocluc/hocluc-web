import { useEffect, useState } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// Slide index that keeps cycling. Choosing a slide jumps to it and restarts the countdown;
// it only holds still while the tab is hidden or the user asks the OS for reduced motion.
export function useHeroCarousel(slideCount: number, intervalMs = 6500) {
  const [active, setActive] = useState(0)
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

  useEffect(() => {
    if (tabHidden || reduceMotion || slideCount < 2) return
    const timer = window.setTimeout(
      () => setActive((index) => (index + 1) % slideCount),
      intervalMs
    )
    return () => window.clearTimeout(timer)
  }, [active, tabHidden, reduceMotion, slideCount, intervalMs])

  return {
    active: slideCount ? active % slideCount : 0,
    selectSlide: setActive,
  }
}
