import type { KeyboardEvent } from 'react'
import { GripVertical } from '../../console/icons'

interface DragHandleProps {
  name: string
  disabled: boolean
  onPointerDown: () => void
  onPointerUp: () => void
  onKeyDown: (event: KeyboardEvent) => void
}

export default function DragHandle({ name, disabled, ...events }: DragHandleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Sắp xếp ${name}: kéo thả, hoặc dùng phím mũi tên lên xuống`}
      title="Kéo để sắp xếp"
      className="grid size-8 shrink-0 cursor-grab place-items-center rounded-md text-text-tertiary transition-colors enabled:hover:text-text-primary active:cursor-grabbing disabled:opacity-40"
      {...events}
    >
      <GripVertical size={16} aria-hidden="true" />
    </button>
  )
}
