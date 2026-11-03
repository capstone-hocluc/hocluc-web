import { useLayoutEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'hocluc.aiAssistant.panelWidths'
export const PANEL_LIMITS = {
  chat: { default: 388, min: 308, max: 648 },
  outline: { default: 240, min: 200, max: 320 },
} as const
/** The paper column never gets narrower than this, whatever the side panels want. */
export const MIN_PAPER_WIDTH = 560
/** Rendered width of one divider (ResizeHandle with `w-1.5`). */
export const DIVIDER_WIDTH = 6
// Tailwind v4's `lg` and `xl` are rem breakpoints; matching them in rem keeps the hook and the CSS in step
// when the browser's default font size is not 16px.
const CHAT_INLINE_QUERY = '(min-width: 64rem)'
const OUTLINE_INLINE_QUERY = '(min-width: 80rem)'

type Panel = keyof typeof PANEL_LIMITS
type Widths = Record<Panel, number>
interface RowSize {
  width: number
  chatInline: boolean
  outlineInline: boolean
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

function remembered(): Widths {
  const widths: Widths = { chat: PANEL_LIMITS.chat.default, outline: PANEL_LIMITS.outline.default }
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    for (const panel of ['chat', 'outline'] as const) {
      if (typeof stored?.[panel] === 'number' && Number.isFinite(stored[panel])) {
        widths[panel] = clamp(stored[panel], PANEL_LIMITS[panel].min, PANEL_LIMITS[panel].max)
      }
    }
  } catch {
    // Storage unavailable or invalid: the defaults apply.
  }
  return widths
}

function measure(row: HTMLElement | null): RowSize {
  return {
    width: row?.getBoundingClientRect().width ?? 0,
    chatInline: window.matchMedia(CHAT_INLINE_QUERY).matches,
    outlineInline: window.matchMedia(OUTLINE_INLINE_QUERY).matches,
  }
}

/**
 * Widths of the side panels around the paper. `preferred` is what the user chose (kept between visits);
 * what is shown is that, squeezed so the paper keeps MIN_PAPER_WIDTH on the current window.
 */
export function usePanelWidths(chatOpen: boolean, outlineOpen: boolean) {
  const row = useRef<HTMLDivElement>(null)
  const [preferred, setPreferred] = useState<Widths>(remembered)
  const [size, setSize] = useState<RowSize>({ width: 0, chatInline: false, outlineInline: false })

  useLayoutEffect(() => {
    const update = () =>
      setSize((previous) => {
        const next = measure(row.current)
        return previous.width === next.width &&
          previous.chatInline === next.chatInline &&
          previous.outlineInline === next.outlineInline
          ? previous
          : next
      })
    update()
    // The row spans the window, so observing it also catches window resizes.
    const observer = new ResizeObserver(update)
    if (row.current) observer.observe(row.current)
    return () => observer.disconnect()
  }, [])

  const chatVisible = chatOpen && size.chatInline
  const outlineVisible = outlineOpen && size.outlineInline
  const free = size.width - MIN_PAPER_WIDTH - (chatVisible ? DIVIDER_WIDTH : 0) - (outlineVisible ? DIVIDER_WIDTH : 0)
  const limit = (panel: Panel, room: number) =>
    Math.min(PANEL_LIMITS[panel].max, Math.max(PANEL_LIMITS[panel].min, room))

  // The outline keeps its width and the chat gives way; the outline only reserves the chat's minimum.
  const outline =
    outlineVisible && size.width
      ? clamp(preferred.outline, PANEL_LIMITS.outline.min, limit('outline', free - (chatVisible ? PANEL_LIMITS.chat.min : 0)))
      : preferred.outline
  const chat =
    chatVisible && size.width
      ? clamp(preferred.chat, PANEL_LIMITS.chat.min, limit('chat', free - (outlineVisible ? outline : 0)))
      : preferred.chat
  const max = {
    chat: limit('chat', free - (outlineVisible ? outline : 0)),
    outline: limit('outline', free - (chatVisible ? PANEL_LIMITS.chat.min : 0)),
  }

  function change(panel: Panel, value: number, keep: boolean) {
    // Resetting stores the real default, not the squeezed one, so a wider window shows it again.
    const width = value === PANEL_LIMITS[panel].default ? value : clamp(value, PANEL_LIMITS[panel].min, max[panel])
    const next = preferred[panel] === width ? preferred : { ...preferred, [panel]: width }
    if (next !== preferred) setPreferred(next)
    if (!keep) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // The widths still hold for this visit.
    }
  }

  return { row, widths: { chat, outline }, max, change }
}
