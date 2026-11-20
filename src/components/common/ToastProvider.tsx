import { type ReactNode, useEffect, useState } from 'react'
import { type Toast, subscribeToast } from '../../lib/toastBus'

const AUTO_DISMISS_MS = 5000

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(
    () =>
      subscribeToast((toast) => {
        setToasts((current) => [...current, toast])
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== toast.id))
        }, AUTO_DISMISS_MS)
      }),
    []
  )

  const dismiss = (id: number) => setToasts((current) => current.filter((item) => item.id !== id))

  return (
    <>
      {children}
      <div className="hl-toast-viewport" role="region" aria-label="Thông báo">
        {toasts.map((toast) => (
          <div key={toast.id} className={`hl-toast hl-toast--${toast.variant}`}
            role={toast.variant === 'info' ? 'status' : 'alert'}>
            {toast.action ? (
              <button type="button" className="hl-toast__action" aria-label={toast.action.label} onClick={() => {
                dismiss(toast.id)
                toast.action?.onClick()
              }}>
                {toast.message}
              </button>
            ) : <span>{toast.message}</span>}
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

export default ToastProvider
