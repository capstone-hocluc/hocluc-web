import { useLearnerTheme } from '../../hooks/useLearnerTheme'
import '../../styles/landing/landing-page.css'
import LandingHeader from './LandingHeader'
import LandingSprite from './LandingSprite'
import { LandingFooter } from './StaticSections'

// Header of the public course pages (catalog, course detail, cart, checkout, orders, payment):
// the landing header in a .landing-page wrapper so it keeps the landing styles, sticky instead
// of fixed. It also opts the page into the learner look.
export function PublicHeader() {
  useLearnerTheme()
  return (
    <div className="landing-page public-chrome">
      <LandingSprite characters={false} />
      <LandingHeader onLanding={false} />
    </div>
  )
}

export function PublicFooter() {
  return (
    <div className="landing-page public-footer">
      <LandingFooter onLanding={false} />
    </div>
  )
}
