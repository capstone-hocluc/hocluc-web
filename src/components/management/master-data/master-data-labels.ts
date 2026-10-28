import type { StatusTone } from '../../console/status'
import type {
  DifficultyLevel,
  MasterDataContent,
  MasterDataVersionStatus,
} from '../../../services/masterDataService'

export const VERSION_STATUS_LABELS: Record<MasterDataVersionStatus, string> = {
  ACTIVE: 'Đang dùng',
  DRAFT: 'Bản nháp',
  RETIRED: 'Đã ngưng',
}

export const VERSION_STATUS_TONES: Record<MasterDataVersionStatus, StatusTone> = {
  ACTIVE: 'success',
  DRAFT: 'warning',
  RETIRED: 'neutral',
}

export type MasterDataTab =
  | 'structure'
  | 'domains'
  | 'patterns'
  | 'skills'
  | 'microSkills'
  | 'mappings'
  | 'errorCodes'
  | 'history'

/** The tabs over the six tables, in workbook order, then the version history. */
export const TABLE_TABS: {
  id: Exclude<MasterDataTab, 'history' | 'structure'>
  label: string
  sheet: string
}[] = [
  { id: 'domains', label: 'Domain', sheet: 'Domains' },
  { id: 'patterns', label: 'Dạng câu', sheet: 'Question_Types' },
  { id: 'skills', label: 'Kỹ năng', sheet: 'Skills' },
  { id: 'microSkills', label: 'Micro-skill', sheet: 'Micro_Skills' },
  { id: 'mappings', label: 'Mapping', sheet: 'Mappings' },
  { id: 'errorCodes', label: 'Lỗi sai thường gặp', sheet: 'Error_Codes' },
]

/** "11 domain · 20 dạng câu · …" for the version bar. */
export function contentSummary(content: MasterDataContent, withMappings: boolean): string {
  return [
    `${content.domains.length} domain`,
    `${content.patterns.length} dạng câu`,
    `${content.skills.length} kỹ năng`,
    `${content.microSkills.length} micro-skill`,
    withMappings ? `${content.mappings.length} mapping` : null,
    `${content.errorCodes.length} lỗi sai thường gặp`,
  ]
    .filter(Boolean)
    .join(' · ')
}

export const MAPPING_ROLE_LABELS = { PRIMARY: 'Chính', SUPPORTING: 'Hỗ trợ' } as const

export const NONE = 'NONE'

export const BANDS: {
  id: string
  label: string
  min: DifficultyLevel | null
  max: DifficultyLevel | null
}[] = [
  { id: NONE, label: 'Chưa đặt', min: null, max: null },
  { id: 'DE-DE', label: 'Dễ', min: 'DE', max: 'DE' },
  { id: 'DE-TB', label: 'Dễ – Trung bình', min: 'DE', max: 'TB' },
  { id: 'TB-TB', label: 'Trung bình', min: 'TB', max: 'TB' },
  { id: 'TB-KHO', label: 'Trung bình – Khó', min: 'TB', max: 'KHO' },
  { id: 'KHO-KHO', label: 'Khó', min: 'KHO', max: 'KHO' },
  { id: 'DE-KHO', label: 'Dễ – Khó', min: 'DE', max: 'KHO' },
]

export const STIMULUS_KINDS = [
  { id: NONE, label: 'Tự nhận theo loại ngữ liệu' },
  { id: 'NONE', label: 'Nằm ngay trong đề' },
  { id: 'LITERARY', label: 'Văn bản văn học' },
  { id: 'ARGUMENTATIVE', label: 'Văn bản nghị luận' },
  { id: 'INFORMATIONAL', label: 'Văn bản thông tin' },
  { id: 'SCIENCE', label: 'Văn bản khoa học' },
  { id: 'DATA', label: 'Bảng, biểu đồ, số liệu' },
  { id: 'RULES', label: 'Bộ quy tắc' },
  { id: 'FIGURE', label: 'Hình vẽ' },
  { id: 'FORMULA', label: 'Công thức' },
  { id: 'OTHER', label: 'Khác' },
].map((option, i) => (i === 0 ? option : { ...option, id: `KIND_${option.id}` }))
