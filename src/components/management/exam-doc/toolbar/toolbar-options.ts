import { DEFAULT_FONT_SIZE_PT, FONT_FAMILIES, LINE_HEIGHTS, ZOOM_LEVELS } from '../exam-doc-context'
import {
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  type LucideIcon,
} from './toolbar-icons'

export interface ToolbarOption {
  value: string
  label: string
  icon?: LucideIcon
  /** Shows the option in its own typeface (font list). */
  fontFamily?: string
}

export interface Swatch {
  value: string
  label: string
}

export const MIN_FONT_SIZE_PT = 6
export const MAX_FONT_SIZE_PT = 72
export const DEFAULT_FONT_FAMILY = 'Times New Roman'
/** Sizes offered when the size field has moved into the "Thêm công cụ" menu. */
export const FONT_SIZE_PRESETS = [8, 9, 10, 11, 11.5, 12, 13, 14, 16, 18, 24, 36]

export type BlockStyle = 'paragraph' | 'h1' | 'h2' | 'h3'
export type TextAlignValue = 'left' | 'center' | 'right' | 'justify'
/** Radio value for "no line height set" (Radix radio values are strings). */
export const LINE_HEIGHT_DEFAULT = 'default'

export const ZOOM_OPTIONS: ToolbarOption[] = ZOOM_LEVELS.map((level) => ({
  value: String(level),
  label: `${Math.round(level * 100)}%`,
}))

export const BLOCK_OPTIONS: ToolbarOption[] = [
  { value: 'paragraph', label: 'Văn bản thường' },
  { value: 'h1', label: 'Tiêu đề 1' },
  { value: 'h2', label: 'Tiêu đề 2' },
  { value: 'h3', label: 'Tiêu đề 3' },
]

export const FONT_SIZE_OPTIONS: ToolbarOption[] = FONT_SIZE_PRESETS.map((pt) => ({
  value: formatDecimal(pt),
  label: formatDecimal(pt),
}))

export const FONT_OPTIONS: ToolbarOption[] = FONT_FAMILIES.map((family) => ({
  value: family,
  label: family,
  fontFamily: family,
}))

export const ALIGN_OPTIONS: (ToolbarOption & { value: TextAlignValue; icon: LucideIcon })[] = [
  { value: 'left', label: 'Căn trái', icon: TextAlignStart },
  { value: 'center', label: 'Căn giữa', icon: TextAlignCenter },
  { value: 'right', label: 'Căn phải', icon: TextAlignEnd },
  { value: 'justify', label: 'Căn đều hai bên', icon: TextAlignJustify },
]

export const LINE_HEIGHT_OPTIONS: ToolbarOption[] = [
  { value: LINE_HEIGHT_DEFAULT, label: 'Mặc định' },
  ...LINE_HEIGHTS.map((height) => ({ value: height, label: formatDecimal(Number(height)) })),
]

export const TEXT_COLORS: Swatch[] = [
  { value: '#000000', label: 'Đen' },
  { value: '#4b5563', label: 'Xám đậm' },
  { value: '#dc2626', label: 'Đỏ' },
  { value: '#ea580c', label: 'Cam' },
  { value: '#ca8a04', label: 'Vàng' },
  { value: '#16a34a', label: 'Xanh lá' },
  { value: '#0d9488', label: 'Xanh ngọc' },
  { value: '#2563eb', label: 'Xanh dương' },
  { value: '#4f46e5', label: 'Chàm' },
  { value: '#9333ea', label: 'Tím' },
]

export const HIGHLIGHT_COLORS: Swatch[] = [
  { value: '#fef08a', label: 'Vàng' },
  { value: '#fed7aa', label: 'Cam' },
  { value: '#fecaca', label: 'Đỏ' },
  { value: '#fbcfe8', label: 'Hồng' },
  { value: '#e9d5ff', label: 'Tím' },
  { value: '#c7d2fe', label: 'Chàm' },
  { value: '#bfdbfe', label: 'Xanh dương' },
  { value: '#99f6e4', label: 'Xanh ngọc' },
  { value: '#bbf7d0', label: 'Xanh lá' },
  { value: '#e5e7eb', label: 'Xám' },
]

/** Vietnamese decimal: 11.5 -> "11,5", 2 -> "2". */
export function formatDecimal(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

export function clampFontSize(pt: number): number {
  return Math.min(MAX_FONT_SIZE_PT, Math.max(MIN_FONT_SIZE_PT, Math.round(pt * 10) / 10))
}

/** Reads what the user typed ("12", "11,5", "11.5pt"); null when it is not a number. */
export function parseFontSize(raw: string): number | null {
  const value = Number.parseFloat(raw.trim().replace(',', '.'))
  return Number.isFinite(value) ? clampFontSize(value) : null
}

/** The stored mark value is CSS ("15.33px"); the UI speaks points. Unknown units fall back to the default. */
export function cssToPt(value: unknown): number {
  if (typeof value !== 'string') return DEFAULT_FONT_SIZE_PT
  const amount = Number.parseFloat(value)
  if (!Number.isFinite(amount)) return DEFAULT_FONT_SIZE_PT
  if (value.trim().endsWith('pt')) return Math.round(amount * 10) / 10
  if (value.trim().endsWith('px')) return Math.round(amount * 0.75 * 10) / 10
  return DEFAULT_FONT_SIZE_PT
}

export function ptToCss(pt: number): string {
  return `${Math.round(((pt * 4) / 3) * 100) / 100}px`
}

/** First family of a CSS font-family list, without quotes. */
export function normalizeFontFamily(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return value
    .split(',')[0]
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

/** Lower-case #rrggbb so stored colours ("#DC2626", "rgb(220, 38, 38)") match the palette. */
export function normalizeColor(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const color = value.trim().toLowerCase()
  const rgb = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!rgb) return color
  return `#${rgb
    .slice(1, 4)
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`
}
