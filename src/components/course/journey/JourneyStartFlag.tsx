import { START_TONE, toneVars } from './journey-tones'

// The flag at the start line, with the day the course opens.
export default function JourneyStartFlag({ label, date }: { label: string; date: string | null }) {
  return (
    <div className="cj-flag" style={toneVars(START_TONE)}>
      <i />
      <span className="cj-halo">
        <b>{label}</b>
        {date}
      </span>
    </div>
  )
}
