import { useId } from 'react'
import { FINISH_TONE, toneVars } from './journey-tones'

// The arch over the finish line, its banner following the curve.
export default function JourneyFinishArch() {
  const bandId = useId()
  return (
    <div className="cj-arch" style={toneVars(FINISH_TONE)}>
      <svg width="440" height="330" viewBox="0 0 440 330" aria-hidden="true">
        <ellipse cx="50" cy="323" rx="40" ry="7" fill="#0b2348" opacity=".14" />
        <ellipse cx="390" cy="323" rx="40" ry="7" fill="#0b2348" opacity=".14" />
        <path id={bandId} className="cj-arch-band" d="M50 322V190A170 170 0 0 1 390 190V322" />
        <rect className="cj-arch-foot" x="24" y="306" width="52" height="16" rx="5" />
        <rect className="cj-arch-foot" x="364" y="306" width="52" height="16" rx="5" />
        <text className="cj-arch-text" dy="10">
          <textPath href={`#${bandId}`} startOffset="50%">
            VỀ ĐÍCH
          </textPath>
        </text>
      </svg>
    </div>
  )
}
