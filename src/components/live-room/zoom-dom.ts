// All selectors refer to the pinned Zoom Meeting SDK 6.10.5 component view.
const selectors = {
  widget: '[aria-label="Zoom Web SDK Widget"]',
  audio: 'button[title="Join Audio"], button[title="Audio"]',
  camera: 'button[title="Start Video"], button[title="Stop Video"]',
  share: 'button[title="Share Screen"]',
  stopShare: 'button',
} as const

type NativeControl = 'audio' | 'camera' | 'share' | 'stopShare'

export function clickZoomControl(root: HTMLElement, control: NativeControl): boolean {
  const element = control === 'stopShare'
    ? [...root.querySelectorAll<HTMLButtonElement>(selectors.stopShare)].find((button) => button.textContent?.trim() === 'Stop Share')
    : root.querySelector<HTMLButtonElement>(selectors[control])
  if (!element || element.disabled) return false
  element.click()
  return true
}

export function checkZoomControls(root: HTMLElement, needsAudio: boolean): boolean {
  return Boolean(root.querySelector(selectors.widget) && root.querySelector(selectors.camera)
    && root.querySelector(selectors.share) && (!needsAudio || root.querySelector(selectors.audio)))
}
