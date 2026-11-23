// The view: a camera tilted 16° down over a flat floor, following the road. It turns a floor
// point (x across, f forward) into a screen point and the scale things have at that distance.

const FOCAL = 720
const TILT = (74 * Math.PI) / 180
const SIN = Math.sin(TILT)
const COS = Math.cos(TILT)
/** The horizon's height on screen, as a share of the scene. */
const HORIZON = 0.3
/** How far the horizon sits above the eye line. */
const LIFT = (FOCAL * COS) / SIN

export class JourneyCamera {
  /** Screen position and scale of the last point placed. */
  px = 0
  py = 0
  ps = 0

  private at = 0
  private lookX = 0
  private centre = 0
  private eyeLine = 0
  private base = 0
  private zoom = 1

  /** Points the camera: how far along the road it is, where the road is there, and the screen. */
  aim(at: number, lookX: number, width: number, height: number, zoom: number) {
    this.at = at
    this.lookX = lookX
    this.centre = width / 2
    this.eyeLine = height * HORIZON + LIFT
    this.base = height - this.eyeLine
    this.zoom = zoom
  }

  place(x: number, f: number) {
    const depth = f - this.at
    this.ps = FOCAL / (FOCAL + depth * SIN)
    this.px = this.centre + (x - this.lookX) * this.zoom * this.ps
    this.py = this.eyeLine + (this.base - depth * COS) * this.ps
  }

  /** The screen height of a floor line `depth` ahead of the camera on a screen `height` tall. */
  static rowAt(depth: number, height: number) {
    const eyeLine = height * HORIZON + LIFT
    return eyeLine + (height - eyeLine - depth * COS) * (FOCAL / (FOCAL + depth * SIN))
  }
}
