import { memo, type Ref } from 'react'
import { toneVars, trackGradient, type JourneyTone } from './journey-tones'

export interface JourneyStep {
  label: string
  tone: JourneyTone
}

interface JourneyProgressProps {
  steps: JourneyStep[]
  /** The step the trip has reached. */
  current: number
  /** The part of the bar not yet travelled; the scene's script shrinks it as the camera moves. */
  restRef: Ref<HTMLElement>
  onGo: (step: number) => void
}

// The trip as a bar across the top: where you are, and a button to jump to each step.
function JourneyProgress({ steps, current, restRef, onGo }: JourneyProgressProps) {
  const last = Math.max(1, steps.length - 1)
  return (
    <nav className="cj-hud" aria-label="Các chặng của lộ trình">
      <div className="cj-hud-track" style={{ background: trackGradient(steps.map((step) => step.tone)) }}>
        <i className="cj-hud-rest" ref={restRef} />
      </div>
      {steps.map((step, index) => (
        <button
          key={index}
          type="button"
          className={`cj-hud-step${index < current ? ' is-done' : ''}${index === current ? ' is-now' : ''}`}
          style={{ left: `${(index / last) * 100}%`, ...toneVars(step.tone) }}
          aria-current={index === current ? 'step' : undefined}
          onClick={() => onGo(index)}
        >
          <i aria-hidden="true" />
          <span>{step.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default memo(JourneyProgress)
