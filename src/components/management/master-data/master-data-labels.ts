import type { StatusTone } from '../../console/status'
import type { MasterDataContent, MasterDataVersionStatus } from '../../../services/masterDataService'

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
  | 'domains'
  | 'patterns'
  | 'skills'
  | 'microSkills'
  | 'mappings'
  | 'errorCodes'
  | 'history'

/** The tabs over the six tables, in workbook order, then the version history. */
export const TABLE_TABS: { id: Exclude<MasterDataTab, 'history'>; label: string; sheet: string }[] = [
  { id: 'domains', label: 'Domain', sheet: 'Domains' },
  { id: 'patterns', label: 'Dạng câu', sheet: 'Question_Types' },
  { id: 'skills', label: 'Kỹ năng', sheet: 'Skills' },
  { id: 'microSkills', label: 'Micro-skill', sheet: 'Micro_Skills' },
  { id: 'mappings', label: 'Mapping', sheet: 'Mappings' },
  { id: 'errorCodes', label: 'Mã lỗi', sheet: 'Error_Codes' },
]

/** "11 domain · 20 dạng câu · …" for the version bar. */
export function contentSummary(content: MasterDataContent, withMappings: boolean): string {
  return [
    `${content.domains.length} domain`,
    `${content.patterns.length} dạng câu`,
    `${content.skills.length} kỹ năng`,
    `${content.microSkills.length} micro-skill`,
    withMappings ? `${content.mappings.length} mapping` : null,
    `${content.errorCodes.length} mã lỗi`,
  ]
    .filter(Boolean)
    .join(' · ')
}

export const MAPPING_ROLE_LABELS = { PRIMARY: 'Chính', SUPPORTING: 'Hỗ trợ' } as const
