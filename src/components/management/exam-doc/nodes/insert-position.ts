import { NodeSelection, type Selection } from '@tiptap/pm/state'
import type { ResolvedPos } from '@tiptap/pm/model'

export interface InsertRange {
  from: number
  to: number
}

/** Blocks a whole snippet never goes inside: it lands after the top-level block that holds them. */
const CONTAINERS = new Set(['table', 'choiceGrid', 'examHeader', 'bulletList', 'orderedList'])

const at = (pos: number): InsertRange => ({ from: pos, to: pos })

/**
 * Where block content goes for a position: between top-level blocks, never splitting a line. An empty top-level
 * paragraph is replaced, the start of a line inserts before it, anywhere else inserts after the top-level block.
 */
export function blockInsertRange($pos: ResolvedPos): InsertRange {
  if ($pos.depth === 0) return at($pos.pos)
  for (let depth = 1; depth <= $pos.depth; depth += 1) {
    if (CONTAINERS.has($pos.node(depth).type.name)) return at($pos.after(1))
  }
  const top = $pos.node(1)
  if (top.isTextblock) {
    if (top.content.size === 0) return { from: $pos.before(1), to: $pos.after(1) }
    if ($pos.parentOffset === 0) return at($pos.before(1))
  }
  return at($pos.after(1))
}

/** `blockInsertRange` for the caret; a selected block (image, page break) gets the content after it. */
export function selectionInsertRange(selection: Selection): InsertRange {
  if (selection instanceof NodeSelection) {
    const { $to } = selection
    return $to.depth === 0 ? at($to.pos) : blockInsertRange($to)
  }
  return blockInsertRange(selection.$from)
}
