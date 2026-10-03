import { useCallback, useEffect, useState } from 'react'

type DeferredAction = () => void
export type UnsavedActionDisposition = 'executed' | 'deferred' | 'blocked'
type ActionGuard = (action: DeferredAction) => UnsavedActionDisposition

const activeActionGuards = new Set<ActionGuard>()

/** Route-level navigation can defer itself through the active page guard. */
export function runWithUnsavedActionGuard(action: DeferredAction): UnsavedActionDisposition {
  const guards = [...activeActionGuards]
  const runGuard = (index: number): UnsavedActionDisposition => {
    if (index < 0) {
      action()
      return 'executed'
    }

    let nextDisposition: UnsavedActionDisposition = 'executed'
    const disposition = guards[index](() => {
      nextDisposition = runGuard(index - 1)
    })
    return disposition === 'executed' ? nextDisposition : disposition
  }

  return runGuard(guards.length - 1)
}

/** Require an explicit discard before running an action that leaves a dirty editor. */
export function useUnsavedActionGuard(isDirty: boolean, isBusy = false) {
  const [pendingAction, setPendingAction] = useState<DeferredAction | null>(null)

  useEffect(() => {
    if (!isDirty && !isBusy) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isBusy, isDirty])

  const requestAction = useCallback((action: DeferredAction) => {
    if (isBusy || pendingAction) return 'blocked' as const
    if (isDirty) {
      setPendingAction(() => action)
      return 'deferred' as const
    }
    action()
    return 'executed' as const
  }, [isBusy, isDirty, pendingAction])

  useEffect(() => {
    activeActionGuards.add(requestAction)
    return () => {
      activeActionGuards.delete(requestAction)
    }
  }, [requestAction])

  const confirmDiscard = useCallback(() => {
    if (!pendingAction) return
    const action = pendingAction
    setPendingAction(null)
    action()
  }, [pendingAction])

  const cancelDiscard = useCallback(() => setPendingAction(null), [])

  return {
    requestAction,
    confirmDiscard,
    cancelDiscard,
    hasPendingAction: pendingAction !== null,
  }
}
