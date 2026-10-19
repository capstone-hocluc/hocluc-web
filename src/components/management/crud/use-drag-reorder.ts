import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { cn } from '../../../lib/cn'

/** Moves the item with id `from` to the position of the item with id `to`. */
export function arrayMove(ids: string[], from: string, to: string): string[] {
  const next = ids.filter((id) => id !== from)
  const target = ids.indexOf(to)
  if (target < 0 || !ids.includes(from)) return ids
  next.splice(target, 0, from)
  return next
}

/**
 * Drag-and-drop reordering for a list of rows with native HTML5 drag events. Rows only start dragging from
 * their handle, so text selection and the buttons inside a row keep working. The handle also reorders with
 * the arrow keys, which keeps the list usable without a mouse.
 */
export function useDragReorder(
  onMove: (fromId: string, toId: string) => void,
  onShift: (id: string, direction: -1 | 1) => void
) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const armed = useRef(false)

  const end = () => {
    armed.current = false
    setDragId(null)
    setOverId(null)
  }

  const rowProps = (id: string) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      // A nested list's row bubbles its drag up; only the row whose handle was pressed may start.
      event.stopPropagation()
      if (!armed.current) {
        event.preventDefault()
        return
      }
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', id)
      setDragId(id)
    },
    onDragOver: (event: DragEvent) => {
      if (!dragId || dragId === id) return
      event.preventDefault()
      event.stopPropagation()
      setOverId(id)
    },
    onDrop: (event: DragEvent) => {
      if (!dragId) return
      event.preventDefault()
      event.stopPropagation()
      if (dragId !== id) onMove(dragId, id)
      end()
    },
    onDragEnd: end,
    className: cn(
      'transition-colors',
      dragId === id && 'opacity-40',
      overId === id && dragId !== id && 'bg-badge-blue-background/60'
    ),
  })

  const handleProps = (id: string, name: string, disabled: boolean) => ({
    name,
    disabled,
    onPointerDown: () => {
      armed.current = true
    },
    onPointerUp: () => {
      armed.current = false
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      event.preventDefault()
      onShift(id, event.key === 'ArrowUp' ? -1 : 1)
    },
  })

  return { rowProps, handleProps }
}
