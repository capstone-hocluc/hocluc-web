import { setWasmUrl } from '@lottiefiles/dotlottie-react'

// The dotLottie runtime is self-hosted (public/lottie) instead of fetched from a CDN. Every Lottie on the site
// imports the player from here, so this runs before the first one loads.
setWasmUrl('/lottie/dotlottie-player.wasm')

export { DotLottieReact } from '@lottiefiles/dotlottie-react'

/** True when the person asked the system for less motion; effects then skip straight to their end state. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
