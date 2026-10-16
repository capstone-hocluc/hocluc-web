import { useEffect, useRef, useState } from 'react'

// Minimal surface of Google Identity Services' global we actually use.
interface GoogleIdCredentialResponse {
  credential: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleIdCredentialResponse) => void
  }) => void
  renderButton: (
    parent: HTMLElement,
    options: {
      type: 'standard'
      theme: 'outline'
      size: 'large'
      shape: 'pill'
      text: 'signin_with' | 'signup_with'
      width: number
    }
  ) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let gisScriptPromise: Promise<void> | null = null

// Loads Google's own sign-in script once, shared across every mount of this
// component (login screen, signup screen, etc.) instead of injecting it
// multiple times.
function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gisScriptPromise) return gisScriptPromise

  gisScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Không thể tải Google Sign-In.')))
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Không thể tải Google Sign-In.'))
    document.head.appendChild(script)
  })
  return gisScriptPromise
}

interface GoogleSignInButtonProps {
  isSignup: boolean
  disabled: boolean
  onCredential: (idToken: string) => void
}

// Renders Google's own official button via Google Identity Services and
// forwards only the resulting ID token credential upward - this component
// never sees or handles a password, access token, or profile field itself.
function GoogleSignInButton({ isSignup, disabled, onCredential }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(() =>
    clientId ? 'loading' : 'unavailable'
  )

  // Always call the latest onCredential without needing it in the effect's
  // dependency array - AuthPage recreates that function on every keystroke,
  // and re-initializing/re-rendering Google's button on every render would
  // be wasteful and could flicker.
  const onCredentialRef = useRef(onCredential)
  useEffect(() => {
    onCredentialRef.current = onCredential
  })

  useEffect(() => {
    if (!clientId) return

    let cancelled = false
    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => onCredentialRef.current(response.credential),
        })
        containerRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: isSignup ? 'signup_with' : 'signin_with',
          width: 320,
        })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [clientId, isSignup])

  if (status === 'unavailable') {
    return (
      <button type="button" className="hl-auth-google" disabled>
        <svg className="hl-google-mark" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        <span>Đăng nhập với Google hiện chưa khả dụng</span>
      </button>
    )
  }

  return (
    <div
      className={`hl-auth-google-mount${disabled ? ' is-disabled' : ''}`}
      ref={containerRef}
      aria-busy={status === 'loading'}
    />
  )
}

export default GoogleSignInButton
