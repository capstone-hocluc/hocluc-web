import { ApiError } from '../../../lib/api'
import type {
  LabelBodies,
  MasterDataContent,
  MasterDataVersion,
  MdMapping,
} from '../../../services/masterDataService'
import { crudError } from '../crud/crud-errors'
import type { RecordKind } from './master-data-tables'

// The checks the server makes before it changes a draft, run first so the form can say what is
// wrong in Vietnamese and name the labels involved. The server still has the final say.

export type EditKind = RecordKind | 'mappings'

export const SEGMENTS: Record<EditKind, keyof LabelBodies> = {
  domains: 'domains',
  patterns: 'patterns',
  skills: 'skills',
  microSkills: 'micro-skills',
  errorCodes: 'error-codes',
  mappings: 'mappings',
}

/** Lower-case nouns for sentences ("Thêm kỹ năng", "Xóa dạng câu"). */
export const KIND_NOUNS: Record<EditKind, string> = {
  domains: 'domain',
  patterns: 'dạng câu',
  skills: 'kỹ năng',
  microSkills: 'micro-skill',
  errorCodes: 'lỗi sai thường gặp',
  mappings: 'liên kết kỹ năng',
}

const CODE_SHAPE = /^[A-Z0-9]+(\.[A-Z0-9]+)+$/
const DOMAIN_CODE_SHAPE = /^[A-Z0-9]+\.D\d{2,}$/
/** The numbered codes the workbooks use: TV.D08, TV.Q20, TV.S20, TV.M024. */
const NUMBERED: Partial<Record<RecordKind, { letter: string; width: number }>> = {
  domains: { letter: 'D', width: 2 },
  patterns: { letter: 'Q', width: 2 },
  skills: { letter: 'S', width: 2 },
  microSkills: { letter: 'M', width: 3 },
}

export const normalizeCode = (code: string) => code.trim().toUpperCase()

/** The prefix every code of the version starts with ("TV"), or the one its codes already use. */
export function codePrefix(
  version: MasterDataVersion | undefined,
  content: MasterDataContent
): string | null {
  if (version?.codePrefix) return version.codePrefix
  const first = content.domains[0]?.code ?? content.skills[0]?.code
  return first?.split('.')[0] ?? null
}

/** The next free numbered code for a kind, or "TV.E." for an error code to finish by hand. */
export function suggestCode(
  kind: RecordKind,
  prefix: string | null,
  content: MasterDataContent
): string {
  const head = prefix ? `${prefix}.` : ''
  const numbered = NUMBERED[kind]
  if (!numbered) return `${head}E.`
  const pattern = new RegExp(`^${head.replace('.', '\\.')}${numbered.letter}(\\d+)$`)
  let max = 0
  let width = numbered.width
  for (const row of content[kind]) {
    const match = row.code.match(pattern)
    if (!match) continue
    max = Math.max(max, Number(match[1]))
    width = Math.max(width, match[1].length)
  }
  const taken = new Set(content[kind].map((row) => row.code))
  for (let n = max + 1; ; n++) {
    const code = `${head}${numbered.letter}${String(n).padStart(width, '0')}`
    if (!taken.has(code)) return code
  }
}

/** Why a new code cannot be used, or null. */
export function codeProblem(
  kind: RecordKind,
  raw: string,
  prefix: string | null,
  content: MasterDataContent
): string | null {
  const code = normalizeCode(raw)
  const example = prefix ? `${prefix}.S21` : 'TV.S21'
  if (!code) return 'Nhập mã.'
  if (!CODE_SHAPE.test(code))
    return `Mã gồm chữ in hoa và số, các phần ngăn bằng dấu chấm, ví dụ ${example}.`
  if (prefix && code.split('.')[0] !== prefix)
    return `Mã phải bắt đầu bằng "${prefix}." như mọi mã của phiên bản này.`
  if (kind === 'domains' && !DOMAIN_CODE_SHAPE.test(code))
    return `Mã domain có dạng ${prefix ?? 'TV'}.D09: chữ D và ít nhất hai chữ số, để kỹ năng ghi được khoảng như D06–D08.`
  if (content[kind].some((row) => row.code === code)) return `Mã ${code} đã có trong phiên bản này.`
  return null
}

export interface Blocker {
  label: string
  names: string[]
}

const named = (content: MasterDataContent, kind: RecordKind, codes: string[]) =>
  [...new Set(codes)].map((code) => content[kind].find((row) => row.code === code)?.nameVi ?? code)

/** What still uses a record, so the server would refuse to delete it. Empty when it can go. */
export function deleteBlockers(
  kind: RecordKind,
  code: string,
  content: MasterDataContent
): Blocker[] {
  const list = (label: string, names: string[]): Blocker[] =>
    names.length ? [{ label, names }] : []
  switch (kind) {
    case 'domains':
      return [
        ...list(
          'Dạng câu',
          named(
            content,
            'patterns',
            content.patterns.filter((p) => p.domainCode === code).map((p) => p.code)
          )
        ),
        ...list(
          'Kỹ năng',
          named(
            content,
            'skills',
            content.skills.filter((s) => s.domainCodes.includes(code)).map((s) => s.code)
          )
        ),
        ...list(
          'Lỗi sai thường gặp',
          named(
            content,
            'errorCodes',
            content.errorCodes
              .filter((e) => !e.allDomains && e.domainCodes.includes(code))
              .map((e) => e.code)
          )
        ),
      ]
    case 'patterns':
      return []
    case 'skills':
      return [
        ...list(
          'Micro-skill',
          named(
            content,
            'microSkills',
            content.microSkills.filter((m) => m.skillCode === code).map((m) => m.code)
          )
        ),
        ...list(
          'Dạng câu dùng kỹ năng này',
          named(
            content,
            'patterns',
            content.mappings.filter((m) => m.skillCode === code).map((m) => m.patternCode)
          )
        ),
        ...list(
          'Kỹ năng cần học kỹ năng này trước',
          named(
            content,
            'skills',
            content.skills.filter((s) => s.prerequisiteSkillCode === code).map((s) => s.code)
          )
        ),
      ]
    case 'microSkills':
      return list(
        'Dạng câu dùng micro-skill này',
        named(
          content,
          'patterns',
          content.mappings.filter((m) => m.microSkillCode === code).map((m) => m.patternCode)
        )
      )
    case 'errorCodes':
      return list(
        'Micro-skill lấy lỗi này làm lỗi mặc định',
        named(
          content,
          'microSkills',
          content.microSkills.filter((m) => m.defaultErrorCode === code).map((m) => m.code)
        )
      )
  }
}

/** Skills a skill may need first: never itself, nor one that already needs it somewhere down its chain. */
export function prerequisiteChoices(content: MasterDataContent, skillCode: string | null) {
  const byCode = new Map(content.skills.map((s) => [s.code, s]))
  const reaches = (from: string) => {
    const seen = new Set<string>()
    for (
      let at: string | null | undefined = from;
      at && !seen.has(at);
      at = byCode.get(at)?.prerequisiteSkillCode
    ) {
      if (at === skillCode) return true
      seen.add(at)
    }
    return false
  }
  return content.skills.filter((s) => !skillCode || !reaches(s.code))
}

export type MappingDraft = Pick<MdMapping, 'patternCode' | 'skillCode' | 'microSkillCode'> & {
  role: 'PRIMARY' | 'SUPPORTING'
  weight: number
}

/** Why a mapping row cannot be saved: one row per skill of a question type, and one primary skill. */
export function mappingProblem(
  draft: MappingDraft,
  content: MasterDataContent,
  selfId: string | null
): string | null {
  if (!draft.patternCode) return 'Chọn dạng câu.'
  if (!draft.skillCode) return 'Chọn kỹ năng.'
  if (draft.microSkillCode) {
    const micro = content.microSkills.find((m) => m.code === draft.microSkillCode)
    if (micro && micro.skillCode !== draft.skillCode)
      return 'Micro-skill đã chọn thuộc một kỹ năng khác.'
  }
  if (!(draft.weight > 0)) return 'Trọng số phải lớn hơn 0.'
  const others = content.mappings.filter(
    (m) => m.id !== selfId && m.patternCode === draft.patternCode
  )
  const skillName = (code: string) => content.skills.find((s) => s.code === code)?.nameVi ?? code
  if (others.some((m) => m.skillCode === draft.skillCode))
    return `Dạng câu này đã liên kết với kỹ năng "${skillName(draft.skillCode)}". Sửa liên kết đó thay vì thêm mới.`
  const primary = others.find((m) => m.role === 'PRIMARY')
  if (draft.role === 'PRIMARY' && primary)
    return `Dạng câu đã có kỹ năng chính "${skillName(primary.skillCode)}". Mỗi dạng câu chỉ có một kỹ năng chính: đổi liên kết đó sang Hỗ trợ trước.`
  return null
}

/** "1.0" becomes "1.1"; a label already taken moves on to the next free one. */
export function suggestVersionLabel(from: string, versions: MasterDataVersion[]): string {
  const taken = new Set(versions.map((v) => v.version))
  const match = from.match(/^(.*?)(\d+)$/)
  const head = match ? match[1] : `${from}.`
  for (let n = match ? Number(match[2]) + 1 : 1; ; n++) {
    const label = `${head}${n}`
    if (!taken.has(label)) return label
  }
}

/** The server's refusal in Vietnamese; its own words are kept for a value it rejected. */
export function masterDataError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Tài khoản chưa được phân quyền soạn nội dung của môn này.'
    switch (error.code) {
      case 'MASTER_DATA_VERSION_NOT_DRAFT':
        return 'Phiên bản này không còn là bản nháp nên không sửa được. Tải lại trang.'
      case 'MASTER_DATA_CODE_EXISTS':
        return 'Mã này đã có trong phiên bản. Chọn mã khác.'
      case 'MASTER_DATA_ITEM_IN_USE':
        return 'Mục này vẫn đang được mục khác dùng. Tải lại trang để xem dữ liệu mới nhất.'
      case 'MASTER_DATA_MAPPING_CONFLICT':
        return 'Dạng câu đã liên kết với kỹ năng này, hoặc đã có kỹ năng chính.'
      case 'MASTER_DATA_ITEM_NOT_FOUND':
        return 'Mục này không còn trong phiên bản. Tải lại trang.'
      case 'MASTER_DATA_VERSION_EXISTS':
        return 'Môn này đã có phiên bản cùng tên. Đặt tên khác.'
      case 'MASTER_DATA_INVALID_VALUE':
        return `Dữ liệu chưa hợp lệ (${error.message}).`
    }
  }
  return crudError(error)
}
