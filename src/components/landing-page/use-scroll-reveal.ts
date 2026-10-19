import { useLayoutEffect, type RefObject } from 'react'

// Blocks that fade in as they enter the viewport. Only containers without their own
// transform/transition belong here, so hover effects on inner cards stay intact.
const REVEAL_TARGETS = [
  '.subjects-heading',
  '.subject-list',
  '.subject-preview',
  '.section-heading',
  '.lesson',
  '.feature-copy',
  '.journey-step',
  '.practice-compact',
  '.support-intro',
  '.support-items > *',
  '.exam-layout > *',
  '.faq-intro',
  '.faq-list details',
  '.closing-cta-inner',
].join(',')

export function useScrollReveal(rootRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const items = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_TARGETS))
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    )
    items.forEach((item) => {
      const index = item.parentElement ? Array.from(item.parentElement.children).indexOf(item) : 0
      item.style.setProperty('--reveal-i', String(Math.min(index, 4)))
      item.classList.add('reveal')
      observer.observe(item)
    })

    return () => {
      observer.disconnect()
      items.forEach((item) => item.classList.remove('reveal', 'is-in'))
    }
  }, [rootRef])
}
