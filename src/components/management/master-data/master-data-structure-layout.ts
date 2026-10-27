import type { Edge, Node } from '@xyflow/react'
import type { MasterDataContent } from '../../../services/masterDataService'
import type { RecordKind, Selection } from './master-data-tables'
import { errorCodePresentation } from './error-code-presentation'

/** What the diagram hangs from: a domain, or an error code traced back to the question types it comes from. */
export interface StructureRoot {
  kind: 'domains' | 'errorCodes'
  code: string
}

/** How a skill hangs under its parent: a mapping role, or LOOSE for a domain skill no question type of the domain uses. */
export type BranchRole = 'PRIMARY' | 'SUPPORTING' | 'LOOSE'

export type RecordState = 'focus' | 'path' | 'lit' | 'dim'
export type RecordData = {
  kind: RecordKind
  code: string
  name: string
  role?: BranchRole
  state?: RecordState
}
export type ColumnData = { kind: RecordKind; count: number }
export type LaneData = { alt: boolean }
export type BandData = { alt: boolean; note?: string }
export type LinkData = { role?: BranchRole; kind: RecordKind }

export type RecordFlowNode = Node<RecordData, 'record'>
export type StructureNode =
  RecordFlowNode | Node<ColumnData, 'column'> | Node<LaneData, 'lane'> | Node<BandData, 'band'>

export interface StructureLayout {
  nodes: StructureNode[]
  edges: Edge<LinkData>[]
  /** Parent of each record node; a branch straight under the root has none. */
  parentOf: Map<string, string>
  /** The drawing's extent, column headings included, from its top-left corner at (0, -HEAD_H). */
  width: number
  height: number
}

interface Branch {
  kind: RecordKind
  code: string
  role?: BranchRole
  children: Branch[]
}

export const NODE_W = 200
export const NODE_H = 52
export const HEAD_H = 52
const GAP_X = 52
const GAP_Y = 10
const BAND_GAP = 28

const DOMAIN_COLUMNS: RecordKind[] = ['domains', 'patterns', 'skills', 'microSkills', 'errorCodes']
const ERROR_COLUMNS: RecordKind[] = ['errorCodes', 'microSkills', 'skills', 'patterns']

/** The skills a question type needs: its mapping rows, or only its primary skill where mappings are not loaded. */
function patternSkills(
  content: MasterDataContent,
  code: string
): { skillCode: string; role: BranchRole }[] {
  const rows = content.mappings.filter((m) => m.patternCode === code)
  if (rows.length)
    return [...rows]
      .sort((a, b) => Number(a.role === 'SUPPORTING') - Number(b.role === 'SUPPORTING'))
      .map((m) => ({
        skillCode: m.skillCode,
        role: m.role === 'SUPPORTING' ? 'SUPPORTING' : 'PRIMARY',
      }))
  const primary = content.patterns.find((p) => p.code === code)?.primarySkillCode
  return primary ? [{ skillCode: primary, role: 'PRIMARY' }] : []
}

function skillBranch(content: MasterDataContent, code: string, role: BranchRole): Branch {
  return {
    kind: 'skills',
    code,
    role,
    children: content.microSkills
      .filter((m) => m.skillCode === code)
      .map((m) => ({
        kind: 'microSkills',
        code: m.code,
        children: m.defaultErrorCode
          ? [{ kind: 'errorCodes', code: m.defaultErrorCode, children: [] }]
          : [],
      })),
  }
}

/** Domain → question type → skill → micro-skill → default error; a skill two question types use hangs under both. */
function domainTree(content: MasterDataContent, code: string): Branch {
  const used = new Set<string>()
  const patterns: Branch[] = content.patterns
    .filter((p) => p.domainCode === code)
    .map((p) => ({
      kind: 'patterns',
      code: p.code,
      children: patternSkills(content, p.code).map((s) => {
        used.add(s.skillCode)
        return skillBranch(content, s.skillCode, s.role)
      }),
    }))
  const loose = content.skills
    .filter((s) => s.domainCodes.includes(code) && !used.has(s.code))
    .map((s) => skillBranch(content, s.code, 'LOOSE'))
  return { kind: 'domains', code, children: [...patterns, ...loose] }
}

/** Error → the micro-skills defaulting to it → their skill → the question types that need that skill. */
function errorTree(content: MasterDataContent, code: string): Branch {
  return {
    kind: 'errorCodes',
    code,
    children: content.microSkills
      .filter((m) => m.defaultErrorCode === code)
      .map((m) => ({
        kind: 'microSkills',
        code: m.code,
        children: [
          {
            kind: 'skills',
            code: m.skillCode,
            children: content.patterns.flatMap((p) =>
              patternSkills(content, p.code)
                .filter((s) => s.skillCode === m.skillCode)
                .map((s): Branch => ({
                  kind: 'patterns',
                  code: p.code,
                  role: s.role,
                  children: [],
                }))
            ),
          },
        ],
      })),
  }
}

export function recordName(content: MasterDataContent, kind: RecordKind, code: string): string {
  if (kind === 'errorCodes') {
    const error = content.errorCodes.find((e) => e.code === code)
    return error ? errorCodePresentation(error).name : code
  }
  return content[kind].find((row) => row.code === code)?.nameVi ?? code
}

/** The tree a record is found in: its domain (a skill's first one), or the error's own tree. */
export function rootOf(content: MasterDataContent, selection: Selection): StructureRoot | null {
  const domain = (code: string | null | undefined): StructureRoot | null =>
    code ? { kind: 'domains', code } : null
  switch (selection.kind) {
    case 'domains':
      return domain(selection.code)
    case 'errorCodes':
      return { kind: 'errorCodes', code: selection.code }
    case 'patterns':
      return domain(content.patterns.find((p) => p.code === selection.code)?.domainCode)
    case 'skills':
      return domain(content.skills.find((s) => s.code === selection.code)?.domainCodes[0])
    case 'microSkills': {
      const skill = content.microSkills.find((m) => m.code === selection.code)?.skillCode
      return domain(content.skills.find((s) => s.code === skill)?.domainCodes[0])
    }
  }
}

const backdrop = {
  draggable: false,
  selectable: false,
  focusable: false,
  style: { pointerEvents: 'none' as const },
}

/**
 * Columns by kind, left to right; each branch under the root gets its own horizontal band. Leaves are
 * stacked down the page and a parent sits level with the middle of its children. The root itself is the
 * diagram's title, so it gets no column.
 */
export function layoutStructure(content: MasterDataContent, root: StructureRoot): StructureLayout {
  const tree =
    root.kind === 'errorCodes' ? errorTree(content, root.code) : domainTree(content, root.code)
  const columns = (root.kind === 'errorCodes' ? ERROR_COLUMNS : DOMAIN_COLUMNS).slice(1)
  const colW = NODE_W + GAP_X
  const step = NODE_H + GAP_Y
  const placed: { branch: Branch; id: string; parent?: string; band: number; y: number }[] = []
  let cursor = 0

  const walk = (branch: Branch, parent: string | undefined, band: number): number => {
    const item = { branch, id: `n${placed.length}`, parent, band, y: 0 }
    placed.push(item)
    if (!branch.children.length) {
      item.y = cursor
      cursor += step
    } else {
      const ys = branch.children.map((child, i) => {
        if (!parent && i > 0) cursor += BAND_GAP
        return walk(child, item.id, parent ? band : i)
      })
      item.y = (ys[0] + ys[ys.length - 1]) / 2
    }
    return item.y
  }
  walk(tree, undefined, -1)

  const height = Math.max(cursor - GAP_Y, NODE_H)
  const width = columns.length * colW - GAP_X
  const nodes: StructureNode[] = []
  const edges: Edge<LinkData>[] = []
  const parentOf = new Map<string, string>()

  columns.forEach((kind, i) => {
    nodes.push({
      id: `lane-${kind}`,
      type: 'lane',
      position: { x: i * colW - GAP_X / 2, y: -HEAD_H },
      width: colW,
      height: height + HEAD_H + BAND_GAP,
      zIndex: -2,
      data: { alt: i % 2 === 1 },
      ...backdrop,
    })
    nodes.push({
      id: `col-${kind}`,
      type: 'column',
      position: { x: i * colW, y: -HEAD_H },
      width: NODE_W,
      height: HEAD_H - 16,
      data: {
        kind,
        count: new Set(placed.filter((p) => p.branch.kind === kind).map((p) => p.branch.code)).size,
      },
      ...backdrop,
    })
  })

  const bands = new Map<number, { lo: number; hi: number; top: Branch }>()
  for (const p of placed) {
    if (p.band < 0) continue
    const band = bands.get(p.band) ?? { lo: p.y, hi: p.y, top: p.branch }
    band.lo = Math.min(band.lo, p.y)
    band.hi = Math.max(band.hi, p.y)
    bands.set(p.band, band)
  }
  for (const [i, band] of bands) {
    nodes.push({
      id: `band-${i}`,
      type: 'band',
      position: { x: -GAP_X / 2, y: band.lo - BAND_GAP / 2 },
      width: width + GAP_X,
      height: band.hi - band.lo + NODE_H + BAND_GAP,
      zIndex: -1,
      data: { alt: i % 2 === 1, note: band.top.role === 'LOOSE' ? 'Chưa có dạng câu' : undefined },
      ...backdrop,
    })
  }

  for (const p of placed) {
    const { kind, code, role } = p.branch
    if (!p.parent) continue
    nodes.push({
      id: p.id,
      type: 'record',
      position: { x: columns.indexOf(kind) * colW, y: p.y },
      width: NODE_W,
      height: NODE_H,
      draggable: false,
      data: { kind, code, name: recordName(content, kind, code), role },
    })
    if (p.parent !== placed[0].id) {
      parentOf.set(p.id, p.parent)
      edges.push({
        id: `${p.parent}-${p.id}`,
        source: p.parent,
        target: p.id,
        type: 'smoothstep',
        data: { role, kind },
      })
    }
  }
  return { nodes, edges, parentOf, width, height: height + HEAD_H }
}
