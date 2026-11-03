import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import Fade from 'embla-carousel-fade'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const AUTOPLAY_DELAY_MS = 6500

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches

// The hero pictures on Embla: slides cross-fade in place, follow a swipe or a mouse drag, and loop.
// Autoplay advances every 6.5s. It holds while a mouse rests on the picture, while keyboard focus is
// inside the carousel, while the tab is hidden (handled by the plugin) and whenever the OS asks for
// reduced motion. Picking a slide by hand restarts the countdown, so the carousel keeps cycling after
// a click.
export function useHeroCarousel() {
  const [plugins] = useState(() => [
    Fade(),
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      playOnInit: false,
      stopOnInteraction: false,
      stopOnFocusIn: false,
    }),
  ])
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 32 }, plugins)
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [keyboardFocus, setKeyboardFocus] = useState(false)
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion)
  const paused = hovered || keyboardFocus || reduceMotion
  const pausedRef = useRef(paused)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setActive(emblaApi.selectedScrollSnap())
    // A drag restarts the plugin's timer when it ends; keep holding if the carousel is paused.
    const onPointerUp = () => {
      if (pausedRef.current) emblaApi.plugins().autoplay?.stop()
    }
    emblaApi.on('select', onSelect).on('reInit', onSelect).on('pointerUp', onPointerUp)
    return () => {
      emblaApi.off('select', onSelect).off('reInit', onSelect).off('pointerUp', onPointerUp)
    }
  }, [emblaApi])

  useEffect(() => {
    pausedRef.current = paused
    const autoplay = emblaApi?.plugins().autoplay
    if (!autoplay) return
    if (paused) autoplay.stop()
    else autoplay.play()
  }, [emblaApi, paused])

  const selectSlide = useCallback(
    (index: number) => {
      if (!emblaApi) return
      emblaApi.scrollTo(index, reduceMotion)
      emblaApi.plugins().autoplay?.reset()
    },
    [emblaApi, reduceMotion]
  )
  const step = useCallback(
    (by: 1 | -1) => {
      if (!emblaApi) return
      if (by > 0) emblaApi.scrollNext(reduceMotion)
      else emblaApi.scrollPrev(reduceMotion)
      emblaApi.plugins().autoplay?.reset()
    },
    [emblaApi, reduceMotion]
  )

  // Spread on the element that wraps the picture and its controls.
  const rootProps = {
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      // Leave Alt+Arrow (browser back/forward) and other shortcuts to the browser.
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      event.preventDefault()
      step(event.key === 'ArrowRight' ? 1 : -1)
    },
    // A mouse click on a dot also focuses it; only focus that came from the keyboard holds autoplay.
    onFocus: (event: FocusEvent) => setKeyboardFocus(event.target.matches(':focus-visible')),
    onBlur: (event: FocusEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false)
    },
  }
  // Spread on the Embla viewport. Touch never counts as hovering, so a swipe does not stop autoplay.
  const viewportProps = {
    ref: viewportRef,
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') setHovered(true)
    },
    onPointerLeave: () => setHovered(false),
  }

  return { active, paused, selectSlide, step, rootProps, viewportProps }
}
