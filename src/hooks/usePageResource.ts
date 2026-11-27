import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

export type ResourceStatus = 'loading' | 'ready' | 'error' | 'forbidden' | 'not-found'

interface Options<T> {
  /** Called with the loaded data right before status becomes 'ready' (e.g. to hydrate local state). */
  onLoaded?: (data: T) => void
  /** Map HTTP 403 / 404 to their own statuses instead of a generic 'error'. Both default to true. */
  forbidden?: boolean
  notFound?: boolean
}

// Loading / ready / error / forbidden / not-found for one page-level request.
// Owns the cancelled-flag effect and the retry counter that every Student page
// used to copy by hand. A background reload keeps the current data visible and reports transient errors separately.
export function usePageResource<T>(
  load: () => Promise<T>,
  deps: readonly unknown[],
  { onLoaded, forbidden = true, notFound = true }: Options<T> = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<ResourceStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadRequest, setReloadRequest] = useState<{ background: boolean } | null>(null)
  const lastRefresh = useRef<typeof reloadRequest>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')

  useEffect(() => {
    let cancelled = false
    const background = reloadRequest?.background && lastRefresh.current !== reloadRequest
    load()
      .then((result) => {
        if (cancelled) return
        onLoaded?.(result)
        setData(result)
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        if (forbidden && error instanceof ApiError && error.status === 403) {
          setStatus('forbidden')
          return
        }
        if (notFound && error instanceof ApiError && error.status === 404) {
          setStatus('not-found')
          return
        }
        const message = getErrorMessage(error)
        if (background) {
          setRefreshError(message)
        } else {
          setErrorMessage(message)
          setStatus('error')
        }
      })
      .finally(() => {
        if (!cancelled && background) {
          lastRefresh.current = reloadRequest
          setRefreshing(false)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadRequest])

  const reload = useCallback(() => {
    setStatus('loading')
    setRefreshing(false)
    setRefreshError('')
    setReloadRequest({ background: false })
  }, [])

  const reloadInBackground = useCallback(() => {
    if (status !== 'ready') {
      reload()
      return
    }
    setRefreshing(true)
    setRefreshError('')
    setReloadRequest({ background: true })
  }, [reload, status])

  return { data, setData, status, errorMessage, reload, reloadInBackground, refreshing, refreshError }
}
