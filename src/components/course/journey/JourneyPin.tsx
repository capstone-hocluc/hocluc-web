import { toneVars, type JourneyTone } from './journey-tones'

interface JourneyPinProps {
  number: number
  name: string
  tone: JourneyTone
  /** The name reads to the left of the pin instead of the right. */
  nameOnLeft: boolean
  onPick: () => void
}

// A stage's marker beside the road. Clicking it drives to that stage.
export default function JourneyPin({ number, name, tone, nameOnLeft, onPick }: JourneyPinProps) {
  return (
    <button
      type="button"
      className={`cj-pin${nameOnLeft ? ' is-left' : ''}`}
      style={toneVars(tone)}
      aria-label={`Chặng ${number}: ${name}`}
      onClick={onPick}
    >
      <span className="cj-pin-ring" />
      <span className="cj-pin-shadow" />
      <span className="cj-pin-bob">
        <span className="cj-pin-head">
          <b>{number}</b>
        </span>
      </span>
      <span className="cj-pin-name cj-halo" data-landmark-name aria-hidden="true">
        <small>Chặng {number}</small>
        {name}
      </span>
    </button>
  )
}
