import type { Node as PMNode } from '@tiptap/pm/model'
import type { ProofreadUnitInput } from '../../../services/aiAssistantService'
import { blockText, inlineText, sheetQuestions } from './doc-snapshot'

type Block = { node: PMNode; pos: number }
export interface ProofreadUnit extends ProofreadUnitInput { blocks: Block[] }

/** Reuse the sheet's question boundaries, but retain all intervening passage blocks as units too. */
export function sheetUnits(doc: PMNode): ProofreadUnit[] {
  const questions = sheetQuestions(doc)
  const blocks: Block[] = []
  let ended = false
  doc.forEach((node, pos) => {
    if (node.attrs.examKey) ended = true
    if (!ended) blocks.push({ node, pos })
  })
  const units: ProofreadUnit[] = []
  let passage: Block[] = []
  const add = (kind: 'QUESTION' | 'PASSAGE', group: Block[], context?: string | null) => {
    const text = group.map(({ node }) => blockText(node)).filter((line) => line.trim()).join('\n')
    if (text.trim()) units.push({ ref: `u${units.length}`, kind, text, ...(context ? { context: context.slice(0, 3000) } : {}), blocks: group })
  }
  const flush = () => { add('PASSAGE', passage); passage = [] }
  for (let i = 0; i < blocks.length;) {
    const question = questions.find((q) => q.from === blocks[i].pos)
    if (question) {
      flush()
      const group: Block[] = []
      while (i < blocks.length && blocks[i].pos < question.to) group.push(blocks[i++])
      add('QUESTION', group, question.context)
    } else {
      const block = blocks[i++]
      if (block.node.type.name === 'heading' || block.node.type.name === 'pageBreak' || block.node.attrs.examPart || block.node.attrs.examGroup) flush()
      passage.push(block)
    }
  }
  flush()
  return units
}

export function packUnits(units: ProofreadUnit[]) {
  const batches: ProofreadUnit[][] = []
  let batch: ProofreadUnit[] = []
  let size = 0
  let skipped = 0
  for (const unit of units) {
    if (unit.text.length > 4000) { skipped++; continue }
    if (batch.length && (batch.length === 12 || size + unit.text.length > 12000)) {
      batches.push(batch); batch = []; size = 0
    }
    batch.push(unit); size += unit.text.length
  }
  if (batch.length) batches.push(batch)
  return { batches, skipped }
}

/** Find unchanged content even after earlier units move; use the old ref only to disambiguate duplicates. */
export function locate(doc: PMNode, original: ProofreadUnit, find: string): { from: number; to: number } | null {
  const candidates = sheetUnits(doc).filter((entry) => entry.kind === original.kind && entry.text === original.text)
  const unit = candidates.length === 1 ? candidates[0] : candidates.find((entry) => entry.ref === original.ref)
  const needle = find.replace(/^\s*[A-H]\s*[.)]\s+/u, '')
  if (!unit || !needle) return null
  const matches: Array<{ from: number; to: number }> = []
  for (const block of unit.blocks) {
    const visit = (node: PMNode, pos: number) => {
      if (!node.isTextblock) return true
      const text = inlineText(node)
      const starts: number[] = []
      const ends: number[] = []
      const validStart: boolean[] = []
      const validEnd: boolean[] = []
      node.forEach((child, offset) => {
        const piece = child.isText ? child.text ?? '' : child.type.name === 'math'
          ? (child.attrs.display ? `$$${String(child.attrs.latex ?? '')}$$` : `$${String(child.attrs.latex ?? '')}$`)
          : child.type.name === 'hardBreak' ? '\n' : child.type.name === 'image' ? '[hình]' : child.textContent
        for (let j = 0; j < piece.length; j++) {
          const atom = !child.isText
          starts.push(pos + 1 + offset + (atom ? 0 : j))
          ends.push(pos + 1 + offset + (atom ? child.nodeSize : j + 1))
          validStart.push(!atom || j === 0)
          validEnd.push(!atom || j === piece.length - 1)
        }
      })
      for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) {
        const end = at + needle.length - 1
        if (validStart[at] && validEnd[end]) matches.push({ from: starts[at], to: ends[end] })
        else matches.push({ from: -1, to: -1 })
      }
      return false
    }
    if (block.node.isTextblock) visit(block.node, block.pos)
    else block.node.descendants((node, pos) => visit(node, block.pos + 1 + pos))
  }
  return matches.length === 1 && matches[0].from >= 0 ? matches[0] : null
}
