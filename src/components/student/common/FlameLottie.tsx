import { DotLottieReact, prefersReducedMotion } from '../../../lib/lottie'
import flameUrl from '../../../assets/lottie/streak-fire.lottie?url'

// The clip grows the flame in its first frames; only the steady flicker after that is looped.
const FLICKER_SEGMENT: [number, number] = [150, 298]

interface FlameLottieProps {
  className?: string
}

// Animated flame. "Fire Streak" by Jeff Lee on LottieFiles (LottieFiles Simple License).
// Under prefers-reduced-motion it does not play.
function FlameLottie({ className }: FlameLottieProps) {
  return (
    <DotLottieReact
      src={flameUrl}
      loop
      autoplay={!prefersReducedMotion()}
      segment={FLICKER_SEGMENT}
      className={className}
      aria-hidden="true"
    />
  )
}

export default FlameLottie
