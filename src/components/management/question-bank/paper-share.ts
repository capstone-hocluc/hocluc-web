import { useCallback, useState } from 'react'

const STORAGE_KEY = 'hocluc.bankReading.paperShare'
export const DEFAULT_PAPER_SHARE = 60
export const MIN_PAPER_SHARE = 30
export const MAX_PAPER_SHARE = 75

const clamp = (value: number) => Math.min(MAX_PAPER_SHARE, Math.max(MIN_PAPER_SHARE, Math.round(value)))

function remembered() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return stored > 0 ? clamp(stored) : DEFAULT_PAPER_SHARE
  } catch {
    return DEFAULT_PAPER_SHARE
  }
}

function remember(share: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(share))
  } catch {
    // the width just is not kept
  }
}

/** The percent of the row the paper takes, set by dragging the divider and kept between visits. */
export function usePaperShare() {
  const [share, setShare] = useState(remembered)
  const set = useCallback((next: number, keep: boolean) => {
    const value = clamp(next)
    setShare(value)
    if (keep) remember(value)
  }, [])
  return [share, set] as const
}
