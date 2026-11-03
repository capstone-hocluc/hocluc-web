import type { Editor } from '@tiptap/react'
import { showErrorToast } from '../../../lib/toastBus'

/** Largest picture file accepted; it is scaled down before it goes into the document. */
const MAX_FILE_BYTES = 10 * 1024 * 1024
/**
 * Encodings tried in order until the picture's data URL fits `TARGET_CHARS`: lower JPEG quality first, then a smaller
 * longest side. The last one is used even when it is still larger.
 */
const STEPS: Array<{ side: number; qualities: number[] }> = [
  { side: 1600, qualities: [0.85, 0.75, 0.65] },
  { side: 1200, qualities: [0.65] },
]
const TARGET_CHARS = 600 * 1024
/** The server refuses a document over 2 MB of JSON; a picture may take it up to 1.8 MB, leaving room to write on. */
const MAX_DOC_BYTES = 1.8 * 1024 * 1024

async function decode(file: File): Promise<HTMLImageElement> {
  // An <img> reads SVG too (createImageBitmap does not in Chromium) and applies the photo's EXIF orientation.
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** The picture drawn with its longest side at most `side` pixels (never enlarged). */
function drawScaled(image: HTMLImageElement, side: number) {
  const scale = Math.min(1, side / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No 2D canvas')
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return { canvas, context }
}

function hasTransparency(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  const { data } = context.getImageData(0, 0, width, height)
  for (let alpha = 3; alpha < data.length; alpha += 4) if (data[alpha] < 255) return true
  return false
}

/** PNG when the picture has any transparency (whatever its file type), JPEG otherwise. */
function encode(image: HTMLImageElement): string {
  let transparent: boolean | undefined
  let dataUrl = ''
  for (const { side, qualities } of STEPS) {
    const { canvas, context } = drawScaled(image, side)
    transparent ??= hasTransparency(context, canvas.width, canvas.height)
    // PNG has no quality to lower, so a picture with transparency only steps down in size.
    for (const quality of transparent ? [undefined] : qualities) {
      dataUrl = canvas.toDataURL(transparent ? 'image/png' : 'image/jpeg', quality)
      if (dataUrl.length <= TARGET_CHARS) return dataUrl
    }
  }
  return dataUrl
}

/**
 * Inserts the picture picked in `input` at the selection, made light enough for the document: scaled down to 1600 px
 * on its longest side and re-encoded. Problems are shown as toasts. The input is cleared, so picking the same file
 * again still fires `change`.
 */
export async function insertPickedImage(
  editor: Editor | null,
  input: HTMLInputElement
): Promise<void> {
  const file = input.files?.[0]
  input.value = ''
  if (!file || !editor) return
  if (!file.type.startsWith('image/')) {
    showErrorToast('Tệp đã chọn không phải là ảnh')
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    showErrorToast('Ảnh lớn hơn 10 MB')
    return
  }
  let src: string
  try {
    const image = await decode(file)
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('The picture has no size')
    src = encode(image)
  } catch {
    showErrorToast('Không đọc được ảnh này')
    return
  }
  // The document may have been closed, or turned read-only, while the picture was being read.
  if (editor.isDestroyed || !editor.isEditable) return
  // Measured in UTF-8 bytes, as the server does; the data URL is plain ASCII.
  const documentBytes = new TextEncoder().encode(JSON.stringify(editor.getJSON())).length
  if (documentBytes + src.length >= MAX_DOC_BYTES) {
    showErrorToast('Tài liệu đã gần giới hạn 2 MB. Hãy chèn ảnh nhỏ hơn.')
    return
  }
  editor
    .chain()
    .focus()
    .setImage({ src, alt: file.name.replace(/\.[^.]+$/, '') })
    .run()
}
