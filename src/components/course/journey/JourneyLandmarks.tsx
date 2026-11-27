import { memo, type Ref } from 'react'
import type { JourneyContent } from './journey-content'
import type { JourneyTone } from './journey-tones'
import { pinLeftOfRoad } from './journey-world'
import JourneyFinishArch from './JourneyFinishArch'
import JourneyPin from './JourneyPin'
import JourneyStartFlag from './JourneyStartFlag'

interface JourneyLandmarksProps {
  ref: Ref<HTMLDivElement>
  journey: JourneyContent
  stageTones: JourneyTone[]
  /** Drives to a stage, counted from 0. */
  onPickStage: (stage: number) => void
}

// Everything that stands on the floor: the finish arch, one pin per stage and the start flag.
// Each sits in a `data-landmark` box that the scene's script places as the camera moves. They are
// listed farthest first, so a nearer one covers a farther one.
function JourneyLandmarks({ ref, journey, stageTones, onPickStage }: JourneyLandmarksProps) {
  const pins = journey.stages.map((stage, index) => (
    <div key={stage.key} className="cj-landmark" data-landmark={`pin-${index}`}>
      <JourneyPin
        number={index + 1}
        name={stage.name}
        tone={stageTones[index]}
        nameOnLeft={pinLeftOfRoad(index)}
        onPick={() => onPickStage(index)}
      />
    </div>
  ))
  return (
    <div className="cj-world" ref={ref}>
      <div className="cj-landmark" data-landmark="finish">
        <JourneyFinishArch />
      </div>
      {pins.reverse()}
      <div className="cj-landmark" data-landmark="start">
        <JourneyStartFlag label={journey.start.label} date={journey.start.date} />
      </div>
    </div>
  )
}

export default memo(JourneyLandmarks)
