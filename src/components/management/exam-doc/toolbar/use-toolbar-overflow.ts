import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * Fits toolbar groups into the row: groups that do not fit are hidden from the right (and shown in the
 * "Thêm công cụ" menu instead). Group widths are measured while they are visible and remembered, so a hidden
 * group comes back as soon as the row has room for it again. The first group always stays.
 */
export function useToolbarOverflow(groupCount: number) {
  const rowRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const groups = useRef<(HTMLDivElement | null)[]>([])
  const [visibleCount, setVisibleCount] = useState(groupCount)

  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return
    const widths: number[] = []
    const fit = () => {
      groups.current.forEach((group, index) => {
        const width = group?.getBoundingClientRect().width ?? 0
        if (width > 0) widths[index] = width
      })
      const available = row.clientWidth - (moreRef.current?.getBoundingClientRect().width ?? 0)
      let used = 0
      let count = 0
      while (count < groupCount) {
        used += widths[count] ?? 0
        if (count > 0 && used > available) break
        count += 1
      }
      // Applied before paint so a too-wide row never flashes.
      flushSync(() => setVisibleCount(count))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(row)
    groups.current.forEach((group) => group && observer.observe(group))
    return () => observer.disconnect()
  }, [groupCount])

  /** Ref callback for every group; each group element carries its index in `data-group`. */
  const registerGroup = (node: HTMLDivElement | null) => {
    if (node) groups.current[Number(node.dataset.group)] = node
  }

  return { rowRef, moreRef, registerGroup, visibleCount }
}
