import type { Editor } from '@tiptap/react'

/** Schemes a link in an exam document may use; any other (javascript:, data:, vbscript:, app schemes…) is refused. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const SCHEME = /^[a-z][a-z\d+.-]*:/i

/**
 * The address to store for what the user typed, or null when it is not a link we allow: web, mail and phone links, and
 * paths (`/…`) or anchors (`#…`) in this site. A bare host ("hocluc.vn/de") gets https://.
 */
export function normalizeLinkHref(raw: string): string | null {
  // Tabs and line breaks are dropped as the browser drops them, so what is checked here is what a click follows.
  const value = raw.replace(/[\t\n\r]/g, '').trim()
  if (!value) return null
  if (value.startsWith('#')) return value
  // "//host" and "/\host" leave the site, so only a single leading slash is a path.
  if (/^[/\\]/.test(value)) return /^\/(?![/\\])/.test(value) ? value : null
  const href = SCHEME.test(value) ? value : `https://${value}`
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null
  const web = url.protocol === 'http:' || url.protocol === 'https:'
  // A web link needs a host, a mail or phone link an address ("https://", "mailto:" alone are not links).
  if (web ? !url.hostname : !url.pathname) return null
  return href
}

/**
 * Links the selection to the address the user typed. With nothing selected and no link under the caret, the address
 * goes in as its own text. Returns false, changing nothing, when the address is refused (see `normalizeLinkHref`).
 */
export function linkSelection(editor: Editor, raw: string): boolean {
  const href = normalizeLinkHref(raw)
  if (!href) return false
  const chain = editor.chain().focus()
  if (editor.state.selection.empty && !editor.isActive('link')) {
    // Links are inclusive (autolink is on), so the stored link mark is dropped or the next typing would join it.
    chain
      .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
      .unsetMark('link')
  } else {
    chain.extendMarkRange('link').setLink({ href })
  }
  chain.run()
  return true
}
