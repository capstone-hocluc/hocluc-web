import { useEffect, useState, type RefObject } from 'react'

const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' '])

/** Brings the writing into view unless it is already well inside it, so the words do not jump while written. */
function scrollToWriting(element: HTMLElement | null, target: string | null) {
  const node = target ? element?.querySelector<HTMLElement>(target) : null
  if (!element || !node) return
  const box = node.getBoundingClientRect()
  const view = element.getBoundingClientRect()
  if (box.bottom <= view.bottom - 48 && box.top >= view.top + 24) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  // A smooth scroll runs on frames, which a hidden tab does not draw: there the sheet jumps straight to the words.
  node.scrollIntoView({ block: 'center', behavior: reduceMotion || document.hidden ? 'auto' : 'smooth' })
}

/**
 * Keeps the sheet scrolled to where the AI is writing while a run goes on: the words being written, or else the
 * question it added last. The teacher scrolling (wheel, touch, scrollbar, scroll keys outside the text) lets go;
 * {@link follow} picks the writing up again. A new run starts following.
 *
 * `target` names what to follow now (a CSS selector inside the scroller); `progress` changes whenever the writing
 * grows (more words, a new question), which is when the sheet scrolls along.
 */
export function useFollowWriting(
  scroller: RefObject<HTMLElement | null>,
  running: boolean,
  target: string | null,
  progress: unknown
) {
  const [following, setFollowing] = useState(true)
  const [wasRunning, setWasRunning] = useState(running)
  if (running !== wasRunning) {
    setWasRunning(running)
    if (running) setFollowing(true)
  }

  useEffect(() => {
    const element = scroller.current
    if (!element || !running) return
    const stop = () => setFollowing(false)
    const onPointer = (event: PointerEvent) => {
      // A press on the scroller itself, not on its content, is its scrollbar being dragged.
      if (event.target === element) stop()
    }
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest('[contenteditable="true"], input, textarea')
      if (!typing && SCROLL_KEYS.has(event.key)) stop()
    }
    element.addEventListener('wheel', stop, { passive: true })
    element.addEventListener('touchmove', stop, { passive: true })
    element.addEventListener('pointerdown', onPointer)
    element.addEventListener('keydown', onKey)
    return () => {
      element.removeEventListener('wheel', stop)
      element.removeEventListener('touchmove', stop)
      element.removeEventListener('pointerdown', onPointer)
      element.removeEventListener('keydown', onKey)
    }
  }, [scroller, running])

  useEffect(() => {
    if (!running || !following) return
    // The effect runs once the new words are in the DOM; a timer (not a frame) keeps working in a hidden tab. The
    // A4 layout then adds its page gaps, which can push the words down again: one more look once it has settled.
    const timers = [0, 500].map((delay) => window.setTimeout(() => scrollToWriting(scroller.current, target), delay))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [scroller, running, following, target, progress])

  const follow = () => {
    setFollowing(true)
    window.setTimeout(() => scrollToWriting(scroller.current, target), 0)
  }

  return { following: running && following, follow }
}
