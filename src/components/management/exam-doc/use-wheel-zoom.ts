import { useEffect, useRef, type RefObject } from 'react'
import { ZOOM_LEVELS } from './exam-doc-context'

/** How much wheel travel makes one zoom step: a mouse notch is about 100, a touchpad pinch sends many small ones. */
const STEP_DELTA = 50

/** The zoom level one step in `direction` (+1 larger, -1 smaller) from `zoom`, within the levels the menu offers. */
export function steppedZoom(zoom: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_LEVELS.find((level) => level > zoom + 0.001) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
  return [...ZOOM_LEVELS].reverse().find((level) => level < zoom - 0.001) ?? ZOOM_LEVELS[0]
}

/**
 * Ctrl + wheel (and a touchpad pinch, which the browser reports the same way) over the sheet zooms the paper, not
 * the page: one step of the zoom menu per notch, keeping the point under the pointer where it was.
 */
export function useWheelZoom(scroller: RefObject<HTMLElement | null>, zoom: number, setZoom: (zoom: number) => void) {
  const state = useRef({ zoom, setZoom, travel: 0 })
  useEffect(() => {
    state.current.zoom = zoom
    state.current.setZoom = setZoom
  }, [zoom, setZoom])

  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return
      // The browser would zoom the whole page.
      event.preventDefault()
      const current = state.current
      current.travel += event.deltaY
      if (Math.abs(current.travel) < STEP_DELTA) return
      const next = steppedZoom(current.zoom, current.travel < 0 ? 1 : -1)
      current.travel = 0
      if (next === current.zoom) return
      // The paper scales by next / zoom; the point under the pointer keeps its place on the screen.
      const box = element.getBoundingClientRect()
      const offsetY = event.clientY - box.top
      const offsetX = event.clientX - box.left
      const ratio = next / current.zoom
      const top = (element.scrollTop + offsetY) * ratio - offsetY
      const left = (element.scrollLeft + offsetX) * ratio - offsetX
      current.zoom = next
      current.setZoom(next)
      window.requestAnimationFrame(() => {
        element.scrollTop = Math.max(0, top)
        element.scrollLeft = Math.max(0, left)
      })
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [scroller])
}
