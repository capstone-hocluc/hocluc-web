import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react'
import flameUrl from '../../../assets/lottie/streak-fire.lottie?url'

// The dotLottie runtime is self-hosted (public/lottie) instead of fetched from a CDN.
setWasmUrl('/lottie/dotlottie-player.wasm')

// The clip grows the flame in its first frames; only the steady flicker after that is looped.
const FLICKER_SEGMENT: [number, number] = [150, 298]

interface FlameLottieProps {
  className?: string
}

// Animated flame. "Fire Streak" by Jeff Lee on LottieFiles (LottieFiles Simple License).
// Under prefers-reduced-motion it does not play.
function FlameLottie({ className }: FlameLottieProps) {
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <DotLottieReact
      src={flameUrl}
      loop
      autoplay={!reduceMotion}
      segment={FLICKER_SEGMENT}
      className={className}
      aria-hidden="true"
    />
  )
}

export default FlameLottie
