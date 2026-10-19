import type { LandingIconName } from '../../data/landing-content'

interface IconProps {
  name: LandingIconName
}

// Icons come from the symbol sprite rendered once by LandingSprite.
function Icon({ name }: IconProps) {
  return (
    <svg className="ui-icon" aria-hidden="true" focusable="false">
      <use href={`#lp-ui-${name}`} />
    </svg>
  )
}

export default Icon
