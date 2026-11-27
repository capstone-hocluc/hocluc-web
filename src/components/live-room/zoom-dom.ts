// All selectors refer to the pinned Zoom Meeting SDK 6.10.5 component view.
const selectors = {
  widget: '[aria-label="Zoom Web SDK Widget"]',
  audio: 'button[title="Join Audio"], button[title="Audio"]',
  camera: 'button[title="Start Video"], button[title="Stop Video"]',
  share: 'button[title="Share Screen"]',
  stopShare: 'button',
  shareTooltipButton: '[role="tooltip"] button',
} as const

type NativeControl = 'audio' | 'camera' | 'share' | 'stopShare'

export function clickZoomControl(root: HTMLElement, control: NativeControl): boolean {
  const element = control === 'stopShare'
    ? [...root.querySelectorAll<HTMLButtonElement>(selectors.stopShare)].find((button) => button.textContent?.trim() === 'Stop Share')
    : root.querySelector<HTMLButtonElement>(selectors[control])
  if (!element || element.disabled) return false
  element.click()
  if (control === 'share') dismissShareTooltip()
  return true
}

export function checkZoomControls(root: HTMLElement, needsAudio: boolean): boolean {
  return Boolean(root.querySelector(selectors.widget) && root.querySelector(selectors.camera)
    && root.querySelector(selectors.share) && (!needsAudio || root.querySelector(selectors.audio)))
}

// Zoom portals this tooltip outside the room root. Dismiss its own acknowledgement
// after it appears instead of applying an unscoped page-wide CSS override.
function dismissShareTooltip() {
  const observer = new MutationObserver(() => {
    const button = [...document.querySelectorAll<HTMLButtonElement>(selectors.shareTooltipButton)]
      .find((candidate) => candidate.textContent?.trim().toLowerCase() === 'got it')
    if (button) { button.click(); observer.disconnect(); clearTimeout(timer) }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  const timer = setTimeout(() => observer.disconnect(), 10000)
}
