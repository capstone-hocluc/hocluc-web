export type LandingAuthMode = 'login' | 'signup'

// App listens for this event and shows the auth dialog over the landing page.
export function openLandingAuth(mode: LandingAuthMode = 'login') {
  window.dispatchEvent(new CustomEvent('open-auth', { detail: { mode } }))
}
