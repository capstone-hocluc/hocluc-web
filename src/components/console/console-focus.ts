import { createContext, useContext, useLayoutEffect } from 'react'

interface ConsoleFocus {
  focused: boolean
  setFocused: (focused: boolean) => void
}

export const ConsoleFocusContext = createContext<ConsoleFocus>({ focused: false, setFocused: () => {} })

/** Hides the console sidebar and header while the calling screen is mounted, so a workspace can use the whole window. */
export function useConsoleFocus() {
  const { setFocused } = useContext(ConsoleFocusContext)
  useLayoutEffect(() => {
    setFocused(true)
    return () => setFocused(false)
  }, [setFocused])
}

/** True while a screen below the console shell has asked for the full window. */
export function useConsoleFocused() {
  return useContext(ConsoleFocusContext).focused
}
