import { useCallback, useSyncExternalStore } from 'react'

/** Whether the window is at least `px` wide, kept up to date as it is resized. */
export function useMinWidth(px: number) {
  const query = `(min-width: ${px}px)`
  const subscribe = useCallback(
    (change: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', change)
      return () => list.removeEventListener('change', change)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}
