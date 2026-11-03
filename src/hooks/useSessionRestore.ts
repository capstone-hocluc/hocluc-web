import { useCallback, useEffect, useState } from 'react'
import { restoreCookieSession } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

/** Guards wait for cookie restoration; temporary connection failures remain retryable. */
export function useSessionRestore() {
  const [state, setState] = useState<{ checking: boolean; error: string | null; unavailable: boolean }>({ checking: true, error: null, unavailable: false })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    void restoreCookieSession().then(() => {
      if (!cancelled) setState({ checking: false, error: null, unavailable: false })
    }).catch(error => {
      if (!cancelled) setState({ checking: false, error: getErrorMessage(error), unavailable: [502, 503, 504].includes(error?.status) })
    })
    return () => { cancelled = true }
  }, [attempt])
  const retry = useCallback(() => {
    setState({ checking: true, error: null, unavailable: false })
    setAttempt(value => value + 1)
  }, [])
  return { ...state, retry }
}
