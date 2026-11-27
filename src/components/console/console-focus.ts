import { createContext, useContext, useLayoutEffect } from 'react'

interface ConsoleFocus {
  focused: boolean
  setFocused: (focused: boolean) => void
}

export const ConsoleFocusContext = createContext<ConsoleFocus>({ focused: false, setFocused: () => {} })

/**
 * Hides the console sidebar and header while the calling screen is mounted, so a workspace can use the whole window.
 * `enabled` false keeps them (a screen that lets the viewer choose).
 */
export function useConsoleFocus(enabled = true) {
  const { setFocused } = useContext(ConsoleFocusContext)
  useLayoutEffect(() => {
    if (!enabled) return
    setFocused(true)
    return () => setFocused(false)
  }, [setFocused, enabled])
}

/** True while a screen below the console shell has asked for the full window. */
export function useConsoleFocused() {
  return useContext(ConsoleFocusContext).focused
}
