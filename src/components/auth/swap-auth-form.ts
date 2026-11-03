import { flushSync } from 'react-dom'

export type AuthSwapDirection = 'forward' | 'back'

let latestSwap = 0

/** True while the login/signup swap animation runs; clicks then land on the page root. */
export const isAuthSwapRunning = () => Boolean(document.documentElement.dataset.authSwap)

// Swaps the login and signup forms inside the open dialog. With view transitions the card morphs to
// the new form's size while the two forms slide past each other (styles in auth-brand.css); the
// direction sits on the html element only while the transition runs. Without the API, or when the
// user asks for reduced motion, the forms swap at once.
export function swapAuthForm(
  direction: AuthSwapDirection,
  render: () => void,
  afterRender: () => void
) {
  const update = () => {
    flushSync(render)
    afterRender()
  }
  if (
    typeof document.startViewTransition !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    update()
    return
  }

  const swap = ++latestSwap
  const root = document.documentElement
  root.dataset.authSwap = direction
  const transition = document.startViewTransition(update)
  // A newer swap skips this one; only the latest swap clears the marker.
  const finish = () => {
    if (swap === latestSwap) delete root.dataset.authSwap
  }
  transition.ready.catch(() => {})
  transition.finished.then(finish, finish)
}
