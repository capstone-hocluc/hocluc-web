import { JourneyCamera } from './journey-camera'
import { GRID_REACH, paintFloor } from './journey-floor-painter'
import type { JourneyPlan } from './journey-plan'
import type { JourneyWorld } from './journey-world'

export interface JourneyElements {
  /** The tall section the page scrolls through. */
  trip: HTMLElement
  /** The screen-sized box that stays put while the trip scrolls. */
  scene: HTMLElement
  canvas: HTMLCanvasElement
  /** Holds the pins, the start flag and the finish arch, each marked `data-landmark`. */
  landmarks: HTMLElement
  /** The part of the progress bar not yet travelled. */
  progressRest: HTMLElement | null
}

interface Sprite {
  x: number
  f: number
  el: HTMLElement
  name: HTMLElement | null
  opacity: number
  nameOpacity: number
  shown: boolean
}

/** Camera lag, in world units, beyond which stage text stays hidden. */
const CATCH_UP = 400

// Turns the page's scroll position into the scene: it eases the camera toward where the scroll
// says it should be, paints the floor on the canvas and moves the landmarks. `frame` runs every
// animation frame but only reads the scroll position; it draws when the camera actually moved.
export class JourneyEngine {
  private readonly world: JourneyWorld
  private readonly plan: JourneyPlan
  private readonly els: JourneyElements
  private readonly onShow: (mode: number, step: number) => void
  private readonly g: CanvasRenderingContext2D | null
  private readonly camera = new JourneyCamera()
  private readonly sprites: Sprite[]

  private width = 0
  private height = 0
  private zoom = 1
  private gridInk: CanvasGradient | string = 'transparent'
  private cam: number | null = null
  private hush: number | null = null
  private then = 0
  private mode = 0
  private step = 0

  constructor(world: JourneyWorld, plan: JourneyPlan, els: JourneyElements, onShow: (mode: number, step: number) => void) {
    this.world = world
    this.plan = plan
    this.els = els
    this.onShow = onShow
    this.g = els.canvas.getContext('2d')
    this.sprites = world.landmarks.flatMap((landmark) => {
      const el = els.landmarks.querySelector<HTMLElement>(`[data-landmark="${landmark.key}"]`)
      if (!el) return []
      const name = el.querySelector<HTMLElement>('[data-landmark-name]')
      return [{ x: landmark.x, f: landmark.f, el, name, opacity: -1, nameOpacity: -1, shown: false }]
    })
  }

  frame(now: number) {
    const g = this.g
    if (!g) return
    const { plan } = this
    const sceneBox = this.els.scene.getBoundingClientRect()
    const scroll = this.scrolled(sceneBox) * plan.span

    // The camera glides to where the scroll says it should be, so wheel steps do not show.
    const target = plan.camAt(scroll)
    const elapsed = Math.min(80, now - (this.then || now))
    this.then = now
    // After a long jump the stage text waits until the camera has nearly arrived.
    const catchingUp = this.cam !== null && Math.abs(target - this.cam) > CATCH_UP
    const mode = catchingUp ? -1 : plan.modeAt(scroll)
    const step = plan.stepAt(scroll)
    if (mode !== this.mode || step !== this.step) {
      this.mode = mode
      this.step = step
      this.onShow(mode, step)
    }

    let cam = this.cam === null ? target : this.cam + (target - this.cam) * (1 - Math.exp(-elapsed / 120))
    if (Math.abs(target - cam) < 0.04) cam = target
    const hushTo = mode >= 1 ? 1 : 0
    let hush = this.hush === null ? hushTo : this.hush + (hushTo - this.hush) * (1 - Math.exp(-elapsed / 180))
    if (Math.abs(hushTo - hush) < 0.01) hush = hushTo

    const resized = this.fit(g, sceneBox.width, sceneBox.height)
    if (cam === this.cam && hush === this.hush && !resized) return
    this.cam = cam
    this.hush = hush
    this.draw(g, cam, hush)
  }

  /** Scrolls the page so the trip stands at one of its steps. */
  goTo(step: number) {
    const last = this.plan.stops.length - 1
    const stop = this.plan.stops[Math.max(0, Math.min(last, step))]
    const { trip, scene } = this.els
    const tripBox = trip.getBoundingClientRect()
    const range = tripBox.height - scene.getBoundingClientRect().height
    window.scrollBy({ top: tripBox.top - this.pinnedTop() + (range * stop) / this.plan.span, behavior: 'smooth' })
  }

  /** Scrolls past the trip, to whatever follows it on the page. */
  leave() {
    window.scrollBy({ top: this.els.trip.getBoundingClientRect().bottom - this.pinnedTop(), behavior: 'smooth' })
  }

  /** Where the scene sits on screen while it is pinned: just under the site header. */
  private pinnedTop() {
    return Number.parseFloat(getComputedStyle(this.els.scene).top) || 0
  }

  /** How far the trip has scrolled, 0 to 1: the share of its free travel the pinned scene has used. */
  private scrolled(sceneBox: DOMRect) {
    const tripBox = this.els.trip.getBoundingClientRect()
    const range = tripBox.height - sceneBox.height
    if (range <= 0) return 0
    return Math.min(1, Math.max(0, (sceneBox.top - tripBox.top) / range))
  }

  /** Fits the canvas to the scene. Returns true when the size changed. */
  private fit(g: CanvasRenderingContext2D, sceneWidth: number, sceneHeight: number) {
    const width = Math.round(sceneWidth)
    const height = Math.round(sceneHeight)
    if (width === this.width && height === this.height) return false
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    this.width = width
    this.height = height
    this.zoom = Math.max(0.55, Math.min(1, width / 1100))
    this.els.canvas.width = Math.round(width * ratio)
    this.els.canvas.height = Math.round(height * ratio)
    g.setTransform(ratio, 0, 0, ratio, 0, 0)
    // Grid lines fade out toward the horizon.
    const ink = g.createLinearGradient(0, JourneyCamera.rowAt(GRID_REACH, height), 0, height)
    ink.addColorStop(0, 'rgba(190,208,234,0)')
    ink.addColorStop(0.3, 'rgba(190,208,234,0.5)')
    ink.addColorStop(1, 'rgba(190,208,234,0.95)')
    this.gridInk = ink
    return true
  }

  private draw(g: CanvasRenderingContext2D, cam: number, hush: number) {
    const { world, camera, width, height, zoom } = this
    // Trees and landmarks shrink less than the floor does on narrow screens.
    const grow = Math.max(0.62, zoom)
    const lookX = world.roadX(cam + 40)
    camera.aim(cam, lookX, width, height, zoom)
    paintFloor(g, world, camera, { at: cam, lookX, width, height, grow, hush, gridInk: this.gridInk })

    // Pins, the start flag and the finish arch are page elements, moved without repainting.
    for (const sprite of this.sprites) {
      const depth = sprite.f - cam
      if (depth < 36 || depth > 3700) {
        if (sprite.shown) {
          sprite.el.style.visibility = 'hidden'
          sprite.shown = false
        }
        continue
      }
      camera.place(sprite.x, sprite.f)
      sprite.el.style.transform = `translate3d(${camera.px.toFixed(1)}px,${camera.py.toFixed(1)}px,0) scale(${(camera.ps * grow).toFixed(4)})`
      const opacity = Math.round(Math.min(1, (depth - 36) / 150, (3700 - depth) / 400) * 50) / 50
      if (opacity !== sprite.opacity) {
        sprite.el.style.opacity = String(opacity)
        sprite.opacity = opacity
      }
      if (sprite.name) {
        // A pin's name shows at mid distance: far pins would crowd, and up close the stage title says it.
        const nameOpacity = Math.round(Math.max(0, Math.min(1, (depth - 440) / 180, (1800 - depth) / 300)) * 25) / 25
        if (nameOpacity !== sprite.nameOpacity) {
          sprite.name.style.opacity = String(nameOpacity)
          sprite.nameOpacity = nameOpacity
        }
      }
      if (!sprite.shown) {
        sprite.el.style.visibility = 'visible'
        sprite.shown = true
      }
    }

    if (this.els.progressRest) {
      const done = Math.max(0, Math.min(1, this.plan.progressAt(cam)))
      this.els.progressRest.style.transform = `scaleX(${(1 - done).toFixed(4)})`
    }
  }
}
