import { useMediaQuery } from '../../../hooks/use-media-query'

// The journey lays a stage out in two columns around the road and moves the whole scene with the
// scroll, so it needs a wide and tall enough screen and a visitor who has not asked for less
// motion. Everyone else gets the plain list of courses.
const JOURNEY_SCREEN = '(min-width: 1200px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)'

export function useJourneyScreen() {
  return useMediaQuery(JOURNEY_SCREEN)
}
