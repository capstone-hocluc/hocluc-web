import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

export type ScheduleResourceStatus = 'idle' | 'loading' | 'ready' | 'error' | 'forbidden' | 'not-found'

interface StoredResource<T> {
  key: string | null
  data: T | null
  status: ScheduleResourceStatus
  errorMessage: string
}

/** A keyed page resource: changing course/date hides old rows and ignores late responses. */
export function useScheduleResource<T>(key: string | null, load: () => Promise<T>) {
  const [reloadKey, setReloadKey] = useState(0)
  const [stored, setStored] = useState<StoredResource<T> & { reloadKey: number }>({
    key: null,
    data: null,
    status: 'idle',
    errorMessage: '',
    reloadKey: -1,
  })

  useEffect(() => {
    if (!key) return
    let cancelled = false
    load()
      .then((data) => {
        if (!cancelled) setStored({ key, reloadKey, data, status: 'ready', errorMessage: '' })
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 403) {
          setStored({ key, reloadKey, data: null, status: 'forbidden', errorMessage: '' })
          return
        }
        if (error instanceof ApiError && error.status === 404) {
          setStored({ key, reloadKey, data: null, status: 'not-found', errorMessage: '' })
          return
        }
        setStored({ key, reloadKey, data: null, status: 'error', errorMessage: getErrorMessage(error) })
      })
    return () => {
      cancelled = true
    }
    // load is tied to key: every input that changes the request must be part of that key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadKey])

  const reload = useCallback(() => {
    if (!key) return
    setReloadKey((current) => current + 1)
  }, [key])

  const current = stored.key === key && stored.reloadKey === reloadKey
  return {
    data: current ? stored.data : null,
    status: current ? stored.status : key ? ('loading' as const) : ('idle' as const),
    errorMessage: current ? stored.errorMessage : '',
    reload,
  }
}
