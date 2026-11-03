/** How the exam codes are written. */
export type CodeStyle = 'hundreds' | 'padded' | 'letters'

export interface VariantSettings {
  /** Number of codes, 1..24. */
  count: number
  codeStyle: CodeStyle
  /** First code: 101 → "101", 1 → "001" or "A". */
  start: number
  /** Questions (and passage groups) change places inside their part. */
  shuffleQuestions: boolean
  /** Options A–D change places inside their question. */
  shuffleOptions: boolean
  /** A last option "Tất cả…" / "Không có…" stays last. */
  keepLastOption: boolean
  /**
   * Random text drawn when the codes are first made (and again on "Trộn lại"). Each code's orders come from the
   * salt, the code and the exam's structure only, so editing words never reshuffles a code. Empty until then.
   */
  salt: string
}

export const MIN_VARIANTS = 1
export const MAX_VARIANTS = 24

export const CODE_STYLES: ReadonlyArray<{ id: CodeStyle; label: string; first: number; last: number }> = [
  { id: 'hundreds', label: '101, 102, 103…', first: 101, last: 999 },
  { id: 'padded', label: '001, 002, 003…', first: 1, last: 999 },
  { id: 'letters', label: 'A, B, C…', first: 1, last: 26 },
]

export const DEFAULT_SETTINGS: VariantSettings = {
  count: 4,
  codeStyle: 'hundreds',
  start: 101,
  shuffleQuestions: true,
  shuffleOptions: true,
  keepLastOption: true,
  salt: '',
}

const SALT = /^[0-9a-z]{1,64}$/iu

/** A new salt: 16 random hex digits. */
export function newSalt(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const styleOf = (id: CodeStyle) => CODE_STYLES.find((style) => style.id === id) ?? CODE_STYLES[0]
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

/** Settings with every value in range: the count fits the style, the codes fit after the start. */
export function normalizeSettings(raw: Partial<VariantSettings> | null | undefined): VariantSettings {
  const style = styleOf(CODE_STYLES.some((item) => item.id === raw?.codeStyle) ? (raw?.codeStyle as CodeStyle) : DEFAULT_SETTINGS.codeStyle)
  const room = style.last - style.first + 1
  const count = clamp(Number.isFinite(raw?.count) ? Number(raw?.count) : DEFAULT_SETTINGS.count, MIN_VARIANTS, Math.min(MAX_VARIANTS, room))
  const start = clamp(Number.isFinite(raw?.start) ? Number(raw?.start) : style.first, style.first, style.last - count + 1)
  const flag = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback)
  return {
    count,
    codeStyle: style.id,
    start,
    shuffleQuestions: flag(raw?.shuffleQuestions, DEFAULT_SETTINGS.shuffleQuestions),
    shuffleOptions: flag(raw?.shuffleOptions, DEFAULT_SETTINGS.shuffleOptions),
    keepLastOption: flag(raw?.keepLastOption, DEFAULT_SETTINGS.keepLastOption),
    salt: typeof raw?.salt === 'string' && SALT.test(raw.salt) ? raw.salt : '',
  }
}

/** The code written for `value` in a style: 101 → "101", 7 → "007", 3 → "C". */
export function formatCode(style: CodeStyle, value: number): string {
  if (style === 'letters') return String.fromCharCode(64 + value)
  if (style === 'padded') return String(value).padStart(3, '0')
  return String(value)
}

export function variantCodes(settings: VariantSettings): string[] {
  return Array.from({ length: settings.count }, (_, index) => formatCode(settings.codeStyle, settings.start + index))
}

export function sameSettings(a: VariantSettings, b: VariantSettings): boolean {
  return (Object.keys(a) as Array<keyof VariantSettings>).every((key) => a[key] === b[key])
}

/* ---------- Storage (per conversation) ---------- */

export interface StoredVariants {
  /** The settings in the form. */
  settings: VariantSettings
  /** The settings the codes were made with; null until "Tạo mã đề" is pressed. */
  applied: VariantSettings | null
}

const storageKey = (conversationId: string | null) => `hocluc.examVariants.${conversationId ?? 'new'}`

export function loadVariants(conversationId: string | null): StoredVariants {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(conversationId)) ?? 'null') as Partial<StoredVariants> | null
    if (stored && typeof stored === 'object') {
      const settings = normalizeSettings(stored.settings)
      // A new exam is never saved: the codes (and salt) of an earlier new exam do not come back, its settings do.
      if (!conversationId) return { settings: { ...settings, salt: '' }, applied: null }
      return { settings, applied: stored.applied ? normalizeSettings(stored.applied) : null }
    }
  } catch {
    // Storage unavailable or invalid: start from the defaults.
  }
  return { settings: DEFAULT_SETTINGS, applied: null }
}

export function saveVariants(conversationId: string | null, value: StoredVariants) {
  try {
    localStorage.setItem(storageKey(conversationId), JSON.stringify(value))
  } catch {
    // The settings still hold for this visit.
  }
}
