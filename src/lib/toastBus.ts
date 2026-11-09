// Minimal pub-sub so non-component code (api.ts) can trigger a toast without
// React context - ToastProvider is the sole subscriber, rendered near the app root.
export interface Toast {
  id: number
  variant: 'error' | 'success' | 'info'
  message: string
  /** Makes the message a button, named by `label`, that runs `onClick` and closes the toast. */
  action?: { label: string; onClick: () => void }
}

type Listener = (toast: Toast) => void

const listeners = new Set<Listener>()

export function emitToast(toast: Toast) {
  listeners.forEach((listener) => listener(toast))
}

export function subscribeToast(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function showErrorToast(message: string) {
  emitToast({ id: Date.now() + Math.random(), variant: 'error', message })
}

export function showSuccessToast(message: string) {
  emitToast({ id: Date.now() + Math.random(), variant: 'success', message })
}

export function showInfoToast(message: string, action?: Toast['action']) {
  emitToast({ id: Date.now() + Math.random(), variant: 'info', message, action })
}

// Runs once per page load (module-level, not a React effect) so it isn't
// affected by StrictMode's dev-only double-invoke of effects, which would
// otherwise read+clear this key before the surviving mount's listener exists.
const PENDING_TOAST_KEY = 'hocluc.pendingToast'
const pending = sessionStorage.getItem(PENDING_TOAST_KEY)
if (pending) {
  sessionStorage.removeItem(PENDING_TOAST_KEY)
  // ToastProvider hasn't subscribed yet at module-evaluation time, so defer
  // to a microtask/next tick, after React has mounted and subscribed.
  setTimeout(() => showErrorToast(pending), 0)
}
