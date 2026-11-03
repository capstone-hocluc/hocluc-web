type WordImageType = 'png' | 'jpg' | 'gif' | 'bmp'

export interface LoadedImage {
  data: Uint8Array
  type: WordImageType
  /** Natural size in CSS px. */
  width: number
  height: number
}

/** The formats Word takes as they are, read from the file's first bytes. */
function sniff(bytes: Uint8Array): WordImageType | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif'
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'bmp'
  return null
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/**
 * The image behind `src` (a data URL or a web address) as bytes Word can embed, or null when it cannot be read
 * (a server that refuses cross-origin reads, a broken file). SVG, WebP and other formats become PNG.
 */
export async function loadImage(src: string): Promise<LoadedImage | null> {
  let blob: Blob
  try {
    const response = await fetch(src)
    if (!response.ok) return null
    blob = await response.blob()
  } catch {
    return null
  }
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const url = URL.createObjectURL(blob)
  try {
    const element = new Image()
    element.src = url
    await element.decode()
    const width = element.naturalWidth || 300
    const height = element.naturalHeight || 150
    const type = sniff(bytes)
    if (type) return { data: bytes, type, width, height }
    // Vector pictures are drawn at twice their size so they stay sharp when printed.
    const scale = blob.type === 'image/svg+xml' ? 2 : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(element, 0, 0, canvas.width, canvas.height)
    const png = await canvasBlob(canvas)
    return png ? { data: new Uint8Array(await png.arrayBuffer()), type: 'png', width, height } : null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

function lengthPx(value: unknown): number | null {
  const number = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
  return Number.isFinite(number) && number > 0 ? number : null
}

/** The size the image is shown at (its width/height attributes, else its natural size), no wider than `maxWidth`. */
export function shownSize(image: LoadedImage, attrs: Record<string, unknown> | undefined, maxWidth: number) {
  const ratio = image.height / image.width
  let width = lengthPx(attrs?.width) ?? image.width
  let height = lengthPx(attrs?.height) ?? (lengthPx(attrs?.width) ? width * ratio : image.height)
  if (width > maxWidth) {
    height *= maxWidth / width
    width = maxWidth
  }
  return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
}
