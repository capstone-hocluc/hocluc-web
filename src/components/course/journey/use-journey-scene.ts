import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { JourneyEngine } from './journey-engine'
import { createPlan } from './journey-plan'
import { createWorld } from './journey-world'

/** The site header, which stays on screen above the page; the pinned scene sits right under it. */
const SITE_HEADER = '.public-chrome'

// Runs the journey scene: wires the engine to the page elements, keeps it ticking while the trip
// is on screen, and reports what should be showing. `mode` is 0 for the opening, 1..n for a
// stage, n + 1 for the finish and -1 while driving between them; `step` is the last step reached.
export function useJourneyScene(stageCount: number) {
  const tripRef = useRef<HTMLElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const landmarksRef = useRef<HTMLDivElement>(null)
  const progressRestRef = useRef<HTMLElement>(null)
  const engineRef = useRef<JourneyEngine | null>(null)
  const [shown, setShown] = useState({ mode: 0, step: 0 })
  const plan = useMemo(() => createPlan(stageCount), [stageCount])

  useEffect(() => {
    const trip = tripRef.current
    const scene = sceneRef.current
    const canvas = canvasRef.current
    const landmarks = landmarksRef.current
    if (!trip || !scene || !canvas || !landmarks) return

    const engine = new JourneyEngine(
      createWorld(stageCount),
      plan,
      { trip, scene, canvas, landmarks, progressRest: progressRestRef.current },
      (mode, step) => setShown({ mode, step })
    )
    engineRef.current = engine

    let frame = 0
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      engine.frame(now)
    }
    // Off screen the scene costs nothing.
    const visibility = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(frame)
      if (entry.isIntersecting) frame = requestAnimationFrame(tick)
    })
    visibility.observe(trip)

    const header = document.querySelector<HTMLElement>(SITE_HEADER)
    const headerSize = new ResizeObserver(() => {
      if (header) trip.style.setProperty('--cj-top', `${header.offsetHeight}px`)
    })
    if (header) headerSize.observe(header)

    return () => {
      cancelAnimationFrame(frame)
      visibility.disconnect()
      headerSize.disconnect()
      engineRef.current = null
    }
  }, [stageCount, plan])

  const goTo = useCallback((step: number) => engineRef.current?.goTo(step), [])
  const leave = useCallback(() => engineRef.current?.leave(), [])

  return {
    tripRef,
    sceneRef,
    canvasRef,
    landmarksRef,
    progressRestRef,
    /** How many screens tall the trip is: one to show the scene plus the scrolling it takes. */
    screens: plan.span / 100 + 1,
    mode: shown.mode,
    step: shown.step,
    goTo,
    leave,
  }
}
