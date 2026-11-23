import { finishAt, stageAt } from './journey-world'

// The trip in scroll terms. Scroll is counted in hundredths of a screen (0 → span) and the camera
// in world units along the road. The camera stops at each stage, where it only drifts, and drives
// between stops.

const INTRO_HOLD = 20
const FIRST_DRIVE = 70
const STOP_HOLD = 70
const DRIVE = 60
const FINISH_HOLD = 20
const STAGE_PERIOD = STOP_HOLD + DRIVE

export interface JourneyPlan {
  /** Scroll length of the whole trip. */
  span: number
  /** Where a jump to each step lands: the opening, every stage, the finish. */
  stops: number[]
  /** Camera position for a scroll position. */
  camAt: (scroll: number) => number
  /** What is on screen: 0 the opening, 1..n a stage, n + 1 the finish, -1 nothing (driving). */
  modeAt: (scroll: number) => number
  /** The last step reached. */
  stepAt: (scroll: number) => number
  /** How far along the progress bar the camera is, 0 to 1. */
  progressAt: (cam: number) => number
}

export function createPlan(stageCount: number): JourneyPlan {
  const span = INTRO_HOLD + FIRST_DRIVE + STOP_HOLD + STAGE_PERIOD * (stageCount - 1) + DRIVE + FINISH_HOLD
  const finish = finishAt(stageCount)
  const arrive = (stage: number) => INTRO_HOLD + FIRST_DRIVE + STAGE_PERIOD * stage

  // [scroll, camera] pairs. Odd segments are stops, even ones the drives between them.
  const route: [number, number][] = [[0, 0], [INTRO_HOLD, 10]]
  // What is on screen for which stretch of scroll.
  const shown: [number, number][] = [[0, INTRO_HOLD + 4]]
  const stops = [0]
  const stopCams = [0]
  for (let stage = 0; stage < stageCount; stage++) {
    const at = arrive(stage)
    route.push([at, stageAt(stage) - 430], [at + STOP_HOLD, stageAt(stage) - 390])
    shown.push([at - 6, at + STOP_HOLD + 12])
    stops.push(at + STOP_HOLD / 2)
    stopCams.push(stageAt(stage) - 430)
  }
  route.push([span - FINISH_HOLD, finish - 480], [span, finish - 460])
  shown.push([span - FINISH_HOLD - 10, span + 1])
  stops.push(span)
  stopCams.push(finish - 460)

  return {
    span,
    stops,
    camAt(scroll) {
      for (let i = 1; i < route.length; i++) {
        if (scroll <= route[i][0]) {
          const from = route[i - 1]
          const to = route[i]
          let t = (scroll - from[0]) / (to[0] - from[0])
          if (i % 2 === 0) t = t * t * (3 - 2 * t)
          return from[1] + (to[1] - from[1]) * t
        }
      }
      return route[route.length - 1][1]
    },
    modeAt(scroll) {
      for (let i = 0; i < shown.length; i++) if (scroll >= shown[i][0] && scroll < shown[i][1]) return i
      return -1
    },
    stepAt(scroll) {
      let step = 0
      for (let i = 1; i < shown.length; i++) if (scroll >= shown[i][0]) step = i
      return step
    },
    progressAt(cam) {
      const last = stopCams.length - 1
      for (let i = 1; i <= last; i++) {
        if (cam <= stopCams[i]) return (i - 1 + (cam - stopCams[i - 1]) / (stopCams[i] - stopCams[i - 1])) / last
      }
      return 1
    },
  }
}
