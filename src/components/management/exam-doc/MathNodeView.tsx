import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import MathText from '../../ui/MathText'
import { cn } from '../../../lib/cn'
import type { MathOptions } from './extensions'

/**
 * Shows a formula node set by KaTeX; a double click opens it in the formula dialog. Enter or Space on a selected
 * formula does the same, from the node's keyboard shortcuts (key events reach the editor, never this span).
 */
export default function MathNodeView({ node, selected, getPos, extension, editor }: NodeViewProps) {
  const latex = String(node.attrs.latex ?? '')
  const display = Boolean(node.attrs.display)
  const edit = () => {
    if (!editor.isEditable) return
    const pos = getPos()
    if (typeof pos === 'number') (extension.options as MathOptions).onEdit(pos, { latex, display })
  }
  return (
    <NodeViewWrapper
      as="span"
      data-math=""
      onDoubleClick={edit}
      title="Bấm đúp để sửa công thức"
      className={cn(
        'exam-doc-math cursor-pointer rounded-sm',
        display && 'block text-center',
        selected && 'ring-2 ring-input-primary-focus-border'
      )}
    >
      <MathText>{display ? `$$${latex}$$` : `$${latex}$`}</MathText>
    </NodeViewWrapper>
  )
}
