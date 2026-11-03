import { useEffect, useRef } from 'react'

// Tilts an element toward the pointer by writing --tilt-x / --tilt-y (degrees) on it; the element's
// own transform reads them. Only for a mouse or trackpad, and never when reduced motion is set.
export function usePointerTilt<T extends HTMLElement>(maxDegrees = 6) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0

    const reset = () => {
      cancelAnimationFrame(frame)
      element.style.setProperty('--tilt-x', '0deg')
      element.style.setProperty('--tilt-y', '0deg')
    }
    const onMove = (event: PointerEvent) => {
      if (!finePointer.matches || reducedMotion.matches) return
      const box = element.getBoundingClientRect()
      const x = (event.clientX - box.left) / box.width - 0.5
      const y = (event.clientY - box.top) / box.height - 0.5
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--tilt-x', `${(-y * maxDegrees).toFixed(2)}deg`)
        element.style.setProperty('--tilt-y', `${(x * maxDegrees).toFixed(2)}deg`)
      })
    }

    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerleave', reset)
    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', reset)
      cancelAnimationFrame(frame)
    }
  }, [maxDegrees])

  return ref
}

/** Tailwind classes for an element tilted by usePointerTilt. */
export const tiltClass =
  '[transform:perspective(1100px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] transition-[transform,translate,box-shadow] duration-300 ease-out'
