import { createElement } from 'react'

// <hocluc-logo> is the shared wordmark element registered by /hocluc-logo.js (see index.html).
function LandingLogo({ size }: { size: number }) {
  return createElement('hocluc-logo', { size })
}

export default LandingLogo
