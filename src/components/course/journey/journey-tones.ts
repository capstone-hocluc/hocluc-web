import type { CSSProperties } from 'react'

/** The colour of one stop on the road: its fill, a darker ink for text, and the text colour on the fill. */
export interface JourneyTone {
  fill: string
  ink: string
  on: string
}

export const START_TONE: JourneyTone = { fill: '#1fa971', ink: '#178a5b', on: '#fff' }

// Stages warm up along the road, from yellow at the first to red at the last.
const RAMP: JourneyTone[] = [
  { fill: '#f7b500', ink: '#b87300', on: '#0b2348' },
  { fill: '#f69712', ink: '#c2650a', on: '#0b2348' },
  { fill: '#f47b20', ink: '#d4590a', on: '#fff' },
  { fill: '#ed6137', ink: '#d2481f', on: '#fff' },
  { fill: '#e5484d', ink: '#cf3338', on: '#fff' },
]

export const FINISH_TONE = RAMP[RAMP.length - 1]

export function stageTone(index: number, count: number): JourneyTone {
  if (count <= 1) return FINISH_TONE
  return RAMP[Math.round((index * (RAMP.length - 1)) / (count - 1))]
}

/** The tone as the custom properties the journey styles read. */
export function toneVars(tone: JourneyTone): CSSProperties {
  return { '--cj-c': tone.fill, '--cj-k': tone.ink, '--cj-on': tone.on } as CSSProperties
}

/** The progress track: every step's colour at that step's place along the bar. */
export function trackGradient(tones: JourneyTone[]) {
  const last = Math.max(1, tones.length - 1)
  const stops = tones.map((tone, index) => `${tone.fill} ${((index / last) * 100).toFixed(2)}%`)
  return `linear-gradient(90deg, ${stops.join(', ')})`
}
