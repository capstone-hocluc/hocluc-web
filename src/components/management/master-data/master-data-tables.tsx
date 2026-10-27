import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import ListCard from '../../console/list-card'
import { FilterSelect } from '../../console/filter-toolbar'
import Status from '../../console/status'
import type {
  MasterDataContent,
  MdDomain,
  MdErrorCode,
  MdMapping,
  MdMicroSkill,
  MdPattern,
  MdSkill,
} from '../../../services/masterDataService'
import { MAPPING_ROLE_LABELS, type MasterDataTab } from './master-data-labels'

export type RecordKind = Exclude<MasterDataTab, 'history' | 'mappings'>
/** The record a detail sheet shows, by its kind and code. */
export interface Selection {
  kind: RecordKind
  code: string
}

const code = 'font-medium whitespace-nowrap text-text-primary'
const plain = 'text-text-secondary'
const name = 'block min-w-44 text-text-primary'

function column<T>(
  id: string,
  header: string,
  value: (row: T) => string | number | null | undefined,
  className = plain
): ColumnDef<T> {
  return {
    id,
    header,
    accessorFn: (row) => value(row) ?? '',
    cell: ({ getValue }) => <span className={className}>{String(getValue() || '—')}</span>,
  }
}

const domainsOfMicro = (content: MasterDataContent, micro: MdMicroSkill) =>
  content.skills.find((skill) => skill.code === micro.skillCode)?.domainCodes ?? []
const domainOfPattern = (content: MasterDataContent, patternCode: string) =>
  content.patterns.find((pattern) => pattern.code === patternCode)?.domainCode

/** One table of a version: search by code or name, filter by domain, a row opens its detail. */
export default function MasterDataTable({
  tab,
  content,
  onOpen,
}: {
  tab: Exclude<MasterDataTab, 'history'>
  content: MasterDataContent
  onOpen: (selection: Selection) => void
}) {
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('ALL')
  const domainOptions = useMemo(
    () => [
      { id: 'ALL', label: 'Mọi domain' },
      ...content.domains.map((d) => ({ id: d.code, label: `${d.code} · ${d.nameVi}` })),
    ],
    [content.domains]
  )
  const domainFilter =
    tab === 'domains' ? undefined : (
      <FilterSelect
        ariaLabel="Lọc theo domain"
        options={domainOptions}
        value={domain}
        onChange={setDomain}
      />
    )
  const searchState = { value: query, onChange: setQuery }
  const any = domain === 'ALL'
  const microCount = (skill: MdSkill) =>
    content.microSkills.filter((micro) => micro.skillCode === skill.code).length

  switch (tab) {
    case 'domains':
      return (
        <ListCard<MdDomain>
          data={content.domains}
          columns={[
            column('code', 'Mã', (r) => r.code, code),
            column('name', 'Tên', (r) => r.nameVi, name),
            column('nameEn', 'Tên tiếng Anh', (r) => r.nameEn),
            column('level', 'Cấp độ', (r) => r.curriculumLevel),
            column('source', 'Nguồn', (r) => r.sourceStatus),
          ]}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên domain..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.nameEn ?? ''}`}
          searchState={searchState}
          onRowClick={(r) => onOpen({ kind: 'domains', code: r.code })}
        />
      )
    case 'patterns':
      return (
        <ListCard<MdPattern>
          data={content.patterns.filter((r) => any || r.domainCode === domain)}
          columns={[
            column('code', 'Mã', (r) => r.code, code),
            column('name', 'Dạng câu', (r) => r.nameVi, name),
            column('domain', 'Domain', (r) => r.domainCode),
            column('stimulus', 'Ngữ liệu', (r) => r.stimulusType),
            column('skill', 'Kỹ năng chính', (r) => r.primarySkillCode),
            column('difficulty', 'Độ khó', (r) => r.difficultyBand),
          ]}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên dạng câu..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.canonicalPrompt ?? ''}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'patterns', code: r.code })}
        />
      )
    case 'skills':
      return (
        <ListCard<MdSkill>
          data={content.skills.filter((r) => any || r.domainCodes.includes(domain))}
          columns={[
            column('code', 'Mã', (r) => r.code, code),
            column('name', 'Kỹ năng', (r) => r.nameVi, name),
            column('domain', 'Domain', (r) => r.domainCodes.join(', ')),
            column('category', 'Loại', (r) => r.skillCategory),
            column('level', 'Cấp độ', (r) => r.level),
            column('prereq', 'Tiên quyết', (r) => r.prerequisiteSkillCode),
            column('micro', 'Micro-skill', microCount),
          ]}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên kỹ năng..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.nameEn ?? ''}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'skills', code: r.code })}
        />
      )
    case 'microSkills':
      return (
        <ListCard<MdMicroSkill>
          data={content.microSkills.filter(
            (r) => any || domainsOfMicro(content, r).includes(domain)
          )}
          columns={[
            column('code', 'Mã', (r) => r.code, code),
            column('name', 'Micro-skill', (r) => r.nameVi, name),
            column('skill', 'Kỹ năng', (r) => r.skillCode),
            column('error', 'Mã lỗi mặc định', (r) => r.defaultErrorCode),
            column('difficulty', 'Độ khó', (r) => r.difficultyBand),
          ]}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên micro-skill..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.skillCode}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'microSkills', code: r.code })}
        />
      )
    case 'mappings':
      return (
        <ListCard<MdMapping>
          data={content.mappings.filter(
            (r) => any || domainOfPattern(content, r.patternCode) === domain
          )}
          columns={[
            column('pattern', 'Dạng câu', (r) => r.patternCode, code),
            column('skill', 'Kỹ năng', (r) => r.skillCode, 'text-text-primary'),
            column('micro', 'Micro-skill', (r) => r.microSkillCode),
            {
              id: 'role',
              header: 'Vai trò',
              accessorFn: (r) => r.role ?? '',
              cell: ({ row }) =>
                row.original.role ? (
                  <Status tone={row.original.role === 'PRIMARY' ? 'info' : 'neutral'}>
                    {MAPPING_ROLE_LABELS[row.original.role]}
                  </Status>
                ) : (
                  '—'
                ),
            },
            column('weight', 'Trọng số', (r) => r.weight),
            column('notes', 'Ghi chú', (r) => r.notes),
          ]}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã dạng câu, kỹ năng..."
          searchText={(r) => `${r.patternCode} ${r.skillCode} ${r.microSkillCode ?? ''}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'patterns', code: r.patternCode })}
        />
      )
    case 'errorCodes':
      return (
        <ListCard<MdErrorCode>
          data={content.errorCodes.filter(
            (r) => any || r.allDomains || r.domainCodes.includes(domain)
          )}
          columns={[
            column('code', 'Mã', (r) => r.code, code),
            column('name', 'Lỗi', (r) => r.nameVi, name),
            column('category', 'Loại', (r) => r.errorCategory),
            column('applies', 'Áp dụng', (r) => r.appliesToText),
          ]}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên lỗi..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.errorCategory ?? ''}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'errorCodes', code: r.code })}
        />
      )
  }
}
