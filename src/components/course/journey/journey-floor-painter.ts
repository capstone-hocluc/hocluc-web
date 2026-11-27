import type { JourneyCamera } from './journey-camera'
import { ROAD_EDGE, ROAD_HALF, START_AT, type JourneyWorld } from './journey-world'

/** How far ahead the floor grid reaches before it fades into the haze. */
export const GRID_REACH = 3400
const GRID_STEP = 100
const FULL_TURN = Math.PI * 2

export interface FloorView {
  /** Camera position along the road, and where the road is under it. */
  at: number
  lookX: number
  width: number
  height: number
  /** Size of trees on narrow screens. */
  grow: number
  /** 0 → 1 as stage text comes on: trees beside the road fade so the text stays readable. */
  hush: number
  gridInk: CanvasGradient | string
}

// Draws the floor for one camera position: grid, road, lane dashes, start and finish lines, trees.
// The camera must already be aimed.
export function paintFloor(g: CanvasRenderingContext2D, world: JourneyWorld, camera: JourneyCamera, view: FloorView) {
  const { at, lookX, width, height, grow, hush } = view
  const { road, dashes, trees, finishAt } = world
  const centre = width / 2

  const quad = (x0: number, f0: number, x1: number, f1: number, x2: number, f2: number, x3: number, f3: number) => {
    camera.place(x0, f0)
    g.moveTo(camera.px, camera.py)
    camera.place(x1, f1)
    g.lineTo(camera.px, camera.py)
    camera.place(x2, f2)
    g.lineTo(camera.px, camera.py)
    camera.place(x3, f3)
    g.lineTo(camera.px, camera.py)
    g.closePath()
  }

  g.clearRect(0, 0, width, height)

  // Floor grid: lines across, then lines running away to the horizon.
  g.beginPath()
  for (let row = Math.ceil((at - 240) / GRID_STEP); row * GRID_STEP - at <= GRID_REACH; row++) {
    camera.place(lookX, row * GRID_STEP)
    g.moveTo(0, camera.py)
    g.lineTo(width, camera.py)
  }
  const lastColumn = Math.floor((lookX + 3600) / GRID_STEP)
  for (let column = Math.ceil((lookX - 3600) / GRID_STEP); column <= lastColumn; column++) {
    camera.place(column * GRID_STEP, at - 240)
    g.moveTo(camera.px, camera.py)
    camera.place(column * GRID_STEP, at + GRID_REACH)
    g.lineTo(camera.px, camera.py)
  }
  g.lineWidth = 1.2
  g.strokeStyle = view.gridInk
  g.stroke()

  // Road: a darker rim under a lighter surface.
  let first = -1
  let last = -1
  for (let i = 0; i < road.n; i++) {
    const depth = road.f[i] - at
    if (depth < -300) continue
    if (depth > 5600) break
    if (first < 0) first = i
    last = i
  }
  const strip = (half: number, color: string) => {
    g.beginPath()
    for (let i = first; i <= last; i++) {
      camera.place(road.x[i] - road.nx[i] * half, road.f[i] - road.nf[i] * half)
      if (i === first) g.moveTo(camera.px, camera.py)
      else g.lineTo(camera.px, camera.py)
    }
    for (let i = last; i >= first; i--) {
      camera.place(road.x[i] + road.nx[i] * half, road.f[i] + road.nf[i] * half)
      g.lineTo(camera.px, camera.py)
    }
    g.closePath()
    g.fillStyle = color
    g.fill()
  }
  if (first >= 0) {
    strip(ROAD_EDGE, '#6fa3e8')
    strip(ROAD_HALF, '#a9cbf3')
  }

  g.beginPath()
  for (const dash of dashes) {
    const depth = dash[8] - at
    if (depth < -200 || depth > 3000) continue
    quad(dash[0], dash[1], dash[2], dash[3], dash[4], dash[5], dash[6], dash[7])
  }
  g.fillStyle = '#ffd94a'
  g.fill()

  if (START_AT - at > -200) {
    const x = world.roadX(START_AT)
    g.beginPath()
    quad(x - ROAD_HALF, START_AT, x + ROAD_HALF, START_AT, x + ROAD_HALF, START_AT + 16, x - ROAD_HALF, START_AT + 16)
    g.fillStyle = '#fff'
    g.fill()
  }

  // Finish line: two rows of chequers across the road.
  if (finishAt - at < 3000) {
    const left = world.roadX(finishAt) - ROAD_HALF
    for (let tone = 0; tone < 2; tone++) {
      g.beginPath()
      for (let row = 0; row < 2; row++) {
        for (let column = 0; column < 8; column++) {
          if ((row + column) % 2 !== tone) continue
          const x = left + column * 8
          const f = finishAt + row * 9
          quad(x, f, x + 8, f, x + 8, f + 9, x, f + 9)
        }
      }
      g.fillStyle = tone ? '#0b3a82' : '#fff'
      g.fill()
    }
  }

  // Trees, far to near.
  for (let i = trees.length - 1; i >= 0; i--) {
    const tree = trees[i]
    const depth = tree.f - at
    if (depth < 40 || depth > 3300) continue
    camera.place(tree.x, tree.f)
    const { px, py, ps } = camera
    if (px < -90 || px > width + 90) continue
    const scale = tree.size * ps * grow
    const crown = 42 * scale
    const trunk = 34 * scale
    let aside = (Math.abs(px - centre) - width * 0.12) / (width * 0.18)
    aside = aside < 0 ? 0 : aside > 1 ? 1 : aside
    g.globalAlpha = Math.min(1, (depth - 40) / 150) * (1 - 0.86 * hush * aside * aside * (3 - 2 * aside))
    g.fillStyle = 'rgba(11,35,72,0.05)'
    g.beginPath()
    g.ellipse(px, py, crown * 0.9, crown * 0.24, 0, 0, FULL_TURN)
    g.fill()
    g.fillStyle = '#c3d0e3'
    g.fillRect(px - Math.max(1, 3.5 * scale), py - trunk, Math.max(2, 7 * scale), trunk)
    g.fillStyle = tree.color
    g.beginPath()
    g.arc(px, py - trunk - crown * 0.72, crown, 0, FULL_TURN)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.32)'
    g.beginPath()
    g.arc(px - crown * 0.28, py - trunk - crown * 0.98, crown * 0.5, 0, FULL_TURN)
    g.fill()
  }
  g.globalAlpha = 1
}
