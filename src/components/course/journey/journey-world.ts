// The world the road runs through: a flat floor where x runs across and f runs forward, away
// from the viewer. One bend of the road per stage, with the stage's pin standing inside the bend.

export const ROAD_EDGE = 39
export const ROAD_HALF = 32
export const START_AT = 150

const CENTRE = 600
const SWING = 220
const FIRST_STAGE_AT = 700
const STAGE_GAP = 800
const FINISH_GAP = 800
const PIN_OFFSET = 110
const SAMPLES_PER_BEND = 28

/** How far along the road a stage's pin stands. */
export const stageAt = (index: number) => FIRST_STAGE_AT + STAGE_GAP * index

/** How far along the road the finish line is. */
export const finishAt = (stageCount: number) => stageAt(stageCount - 1) + FINISH_GAP

/** The road's centre line as sample points, each with its sideways normal and its length so far. */
export interface Road {
  n: number
  x: Float32Array
  f: Float32Array
  nx: Float32Array
  nf: Float32Array
  len: Float32Array
}

export interface Tree {
  x: number
  f: number
  size: number
  color: string
}

/** Something standing on the floor that the page draws as an element: a pin, the flag, the arch. */
export interface Landmark {
  key: string
  x: number
  f: number
}

export interface JourneyWorld {
  road: Road
  /** Centre-line dashes as flat quads: four corners (x, f) then the middle f. */
  dashes: number[][]
  trees: Tree[]
  /** Farthest first, so nearer ones sit over them. */
  landmarks: Landmark[]
  finishAt: number
  roadX: (at: number) => number
}

type Point = [number, number]
type Bezier = [Point, Point, Point, Point]

const sideOf = (stage: number) => CENTRE + (stage % 2 === 0 ? -SWING : SWING)

/** Whether a stage's pin stands left of the road; its name then reads to the left of the pin. */
export const pinLeftOfRoad = (stage: number) => sideOf(stage) > CENTRE

function bends(stageCount: number): Bezier[] {
  const first = sideOf(0)
  const curve: Bezier[] = [
    [[CENTRE, 0], [CENTRE, 300], [first, 400], [first, FIRST_STAGE_AT]],
  ]
  for (let stage = 0; stage < stageCount - 1; stage++) {
    const from = sideOf(stage)
    const to = sideOf(stage + 1)
    const at = stageAt(stage)
    curve.push([[from, at], [from, at + 300], [to, at + 500], [to, at + STAGE_GAP]])
  }
  const last = sideOf(stageCount - 1)
  const at = stageAt(stageCount - 1)
  curve.push([[last, at], [last, at + 220], [CENTRE, at + 260], [CENTRE, at + 460]])
  return curve
}

function buildRoad(stageCount: number, roadEnd: number): Road {
  const points: Point[] = []
  for (let f = -400; f < 0; f += 50) points.push([CENTRE, f])
  bends(stageCount).forEach((bend, index) => {
    for (let i = index === 0 ? 0 : 1; i <= SAMPLES_PER_BEND; i++) {
      const t = i / SAMPLES_PER_BEND
      const u = 1 - t
      const a = u * u * u
      const b = 3 * u * u * t
      const c = 3 * u * t * t
      const d = t * t * t
      points.push([
        a * bend[0][0] + b * bend[1][0] + c * bend[2][0] + d * bend[3][0],
        a * bend[0][1] + b * bend[1][1] + c * bend[2][1] + d * bend[3][1],
      ])
    }
  })
  // Straight through the finish line; the road stops just past it.
  for (let f = stageAt(stageCount - 1) + 520; f < roadEnd; f += 60) points.push([CENTRE, f])
  points.push([CENTRE, roadEnd])

  const n = points.length
  const road: Road = {
    n,
    x: new Float32Array(n),
    f: new Float32Array(n),
    nx: new Float32Array(n),
    nf: new Float32Array(n),
    len: new Float32Array(n),
  }
  for (let i = 0; i < n; i++) {
    const before = points[Math.max(0, i - 1)]
    const after = points[Math.min(n - 1, i + 1)]
    const tx = after[0] - before[0]
    const tf = after[1] - before[1]
    const length = Math.hypot(tx, tf) || 1
    road.x[i] = points[i][0]
    road.f[i] = points[i][1]
    road.nx[i] = tf / length
    road.nf[i] = -tx / length
    road.len[i] = i ? road.len[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]) : 0
  }
  return road
}

function buildDashes(road: Road) {
  const dashes: number[][] = []
  let i = 0
  const pointAt = (length: number): Point => {
    while (i < road.n - 2 && road.len[i + 1] < length) i++
    const t = (length - road.len[i]) / (road.len[i + 1] - road.len[i])
    return [road.x[i] + (road.x[i + 1] - road.x[i]) * t, road.f[i] + (road.f[i + 1] - road.f[i]) * t]
  }
  // They stop short of the finish line.
  for (let length = 20, end = road.len[road.n - 1] - 70; length < end; length += 66) {
    const a = pointAt(length)
    const b = pointAt(length + 36)
    const dx = b[0] - a[0]
    const df = b[1] - a[1]
    const size = Math.hypot(dx, df) || 1
    const px = (df / size) * 3
    const pf = (-dx / size) * 3
    dashes.push([a[0] - px, a[1] - pf, a[0] + px, a[1] + pf, b[0] + px, b[1] + pf, b[0] - px, b[1] - pf, (a[1] + b[1]) / 2])
  }
  return dashes
}

const TREE_COLORS = ['#bfe6cf', '#ffdc70', '#ffbcb4']

// Trees on both sides, placed by a fixed pseudo-random so every visit looks the same.
function buildTrees(roadX: (at: number) => number, until: number) {
  const trees: Tree[] = []
  for (let i = 0, f = 90; f < until; i++, f += 150) {
    const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
    const side = i % 2 ? 1 : -1
    trees.push({
      x: roadX(f) + side * (240 + r * 420),
      f,
      size: 0.85 + ((r * 7) % 1) * 0.5,
      color: TREE_COLORS[i % 3],
    })
  }
  return trees
}

export function createWorld(stageCount: number): JourneyWorld {
  const finish = finishAt(stageCount)
  const road = buildRoad(stageCount, finish + 24)

  const roadX = (at: number) => {
    const { f, x, n } = road
    let lo = 0
    let hi = n - 1
    if (at <= f[0]) return x[0]
    if (at >= f[hi]) return x[hi]
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (f[mid] <= at) lo = mid
      else hi = mid
    }
    return x[lo] + ((x[hi] - x[lo]) * (at - f[lo])) / (f[hi] - f[lo])
  }

  const pins: Landmark[] = Array.from({ length: stageCount }, (_, stage) => ({
    key: `pin-${stage}`,
    x: sideOf(stage) + (pinLeftOfRoad(stage) ? -PIN_OFFSET : PIN_OFFSET),
    f: stageAt(stage),
  }))

  return {
    road,
    dashes: buildDashes(road),
    trees: buildTrees(roadX, finish + 2500),
    landmarks: [{ key: 'finish', x: CENTRE, f: finish }, ...pins.reverse(), { key: 'start', x: CENTRE + 90, f: START_AT }],
    finishAt: finish,
    roadX,
  }
}
