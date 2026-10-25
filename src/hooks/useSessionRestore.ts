import { useCallback, useEffect, useState } from 'react'
import { restoreCookieSession } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

/** Guards wait for cookie restoration; temporary connection failures remain retryable. */
export function useSessionRestore() {
  const [state, setState] = useState<{ checking: boolean; error: string | null }>({ checking: true, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    void restoreCookieSession().then(() => {
      if (!cancelled) setState({ checking: false, error: null })
    }).catch(error => {
      if (!cancelled) setState({ checking: false, error: getErrorMessage(error) })
    })
    return () => { cancelled = true }
  }, [attempt])
  const retry = useCallback(() => {
    setState({ checking: true, error: null })
    setAttempt(value => value + 1)
  }, [])
  return { ...state, retry }
}
