import type { JSONContent } from '@tiptap/core'

const FALLBACK_NAME = 'De-thi'
const MAX_NAME_LENGTH = 80
/** Characters Windows (and so most users' disks) refuse in a file name. */
const ILLEGAL = /[\\/:*?"<>|]/g
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i

/** The text of a node as a reader sees it: formulas as their LaTeX, line breaks as spaces. */
export function plainText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'hardBreak') return ' '
  if (node.type === 'math') return String(node.attrs?.latex ?? '')
  return (node.content ?? []).map(plainText).join('')
}

function firstTitle(node: JSONContent): string | null {
  if (node.type === 'heading' && node.attrs?.level === 1) {
    const text = plainText(node).replace(/\s+/g, ' ').trim()
    if (text) return text
  }
  for (const child of node.content ?? []) {
    const title = firstTitle(child)
    if (title) return title
  }
  return null
}

/** The document's title: its first heading 1, else null. */
export function documentTitle(doc: JSONContent): string | null {
  return firstTitle(doc)
}

/** "ĐỀ KIỂM TRA: TOÁN 10" -> "ĐỀ-KIỂM-TRA-TOÁN-10": diacritics kept (NFC), characters a disk refuses dropped. */
export function slugify(title: string): string {
  const visible = Array.from(title.normalize('NFC'), (char) => (char.charCodeAt(0) < 32 || char === '\x7f' ? ' ' : char))
  const slug = visible
    .join('')
    .replace(ILLEGAL, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
  const short = Array.from(slug).slice(0, MAX_NAME_LENGTH).join('').replace(/^[-.]+|[-.]+$/g, '')
  return short && !RESERVED.test(short) ? short : FALLBACK_NAME
}

/** The document's title as a file name, without extension ("De-thi" when it has no heading 1). */
export function baseFileName(doc: JSONContent): string {
  const title = documentTitle(doc)
  return title ? slugify(title) : FALLBACK_NAME
}

/** "<title>.docx", or "<title>-Ma-<code>.docx" for an exam variant (mã đề). */
export function fileNameFor(doc: JSONContent, extension: string, code?: string | null): string {
  const base = baseFileName(doc)
  return `${code ? `${base}-Ma-${slugify(code)}` : base}.${extension}`
}

/** Saves the blob under `fileName` through an object URL, as a download. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  // Revoked later: some browsers read the URL after click() has returned.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
