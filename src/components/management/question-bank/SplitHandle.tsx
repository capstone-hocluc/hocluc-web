import type { RefObject } from 'react'
import ResizeHandle from '../../ui/ResizeHandle'
import { DEFAULT_PAPER_SHARE, MAX_PAPER_SHARE, MIN_PAPER_SHARE } from './paper-share'

/** A draggable divider between the left column and the paper. */
export default function SplitHandle({ row, share, onChange }: {
  row: RefObject<HTMLElement | null>
  share: number
  onChange: (share: number, keep: boolean) => void
}) {
  return (
    <ResizeHandle
      label="Kéo để đổi độ rộng bản đề"
      value={share}
      min={MIN_PAPER_SHARE}
      max={MAX_PAPER_SHARE}
      defaultValue={DEFAULT_PAPER_SHARE}
      step={2}
      direction={-1}
      onChange={onChange}
      valueAt={(clientX) => {
        const box = row.current?.getBoundingClientRect()
        return box && box.width ? ((box.right - clientX) / box.width) * 100 : null
      }}
      className="hidden lg:flex"
    />
  )
}
