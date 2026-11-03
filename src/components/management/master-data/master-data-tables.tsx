import { useMemo, useState, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import ListCard from '../../console/list-card'
import { FilterSelect } from '../../console/filter-toolbar'
import Status from '../../console/status'
import Button from '../../console/button'
import { IconAction, RowActions } from '../../console/icon-action'
import { Pencil, Plus, Trash2 } from '../../console/icons'
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
import { errorCodePresentation } from './error-code-presentation'
import type { EditTarget } from './master-data-editor-dialog'
import type { DeleteTarget } from './master-data-delete-dialog'
import { KIND_NOUNS } from './master-data-rules'

/** Present only on a draft a content writer opened: add, change and remove labels. */
export interface TableActions {
  onEdit: (target: EditTarget) => void
  onDelete: (target: DeleteTarget) => void
}

function actionColumn<T>(edit: (row: T) => void, remove: (row: T) => void): ColumnDef<T> {
  return {
    id: 'actions',
    header: 'Thao tác',
    enableSorting: false,
    meta: { className: 'w-24 text-right' },
    cell: ({ row }) => (
      <RowActions>
        <IconAction label="Sửa" icon={Pencil} hover="info" onClick={() => edit(row.original)} />
        <IconAction
          label="Xóa"
          icon={Trash2}
          variant="danger"
          onClick={() => remove(row.original)}
        />
      </RowActions>
    ),
  }
}

export type RecordKind = Exclude<MasterDataTab, 'history' | 'mappings' | 'structure'>
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
const domainName = (content: MasterDataContent, code: string) =>
  content.domains.find((domain) => domain.code === code)?.nameVi ?? code
const skillName = (content: MasterDataContent, code: string | null | undefined) =>
  content.skills.find((skill) => skill.code === code)?.nameVi ?? code ?? ''
const patternName = (content: MasterDataContent, code: string) =>
  content.patterns.find((pattern) => pattern.code === code)?.nameVi ?? code
const microSkillName = (content: MasterDataContent, code: string | null | undefined) =>
  content.microSkills.find((microSkill) => microSkill.code === code)?.nameVi ?? code ?? ''

/** One table of a version: search by code or name, filter by domain, a row opens its detail. */
export default function MasterDataTable({
  tab,
  content,
  onOpen,
  actions,
}: {
  tab: Exclude<MasterDataTab, 'history' | 'structure'>
  content: MasterDataContent
  onOpen: (selection: Selection) => void
  actions?: TableActions
}) {
  const table = <T,>(
    columns: ColumnDef<T>[],
    edit: (row: T) => EditTarget,
    remove: (row: T) => DeleteTarget
  ) =>
    actions
      ? [
          ...columns,
          actionColumn<T>(
            (row) => actions.onEdit(edit(row)),
            (row) => actions.onDelete(remove(row))
          ),
        ]
      : columns
  const withAdd = (list: ReactNode) =>
    actions ? (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => actions.onEdit({ kind: tab, record: null } as EditTarget)}
          >
            <Plus size={14} />
            Thêm {KIND_NOUNS[tab]}
          </Button>
        </div>
        {list}
      </div>
    ) : (
      list
    )
  const [query, setQuery] = useState('')
  const [domain, setDomain] = useState('ALL')
  const domainOptions = useMemo(
    () => [
      { id: 'ALL', label: 'Mọi domain' },
      ...content.domains.map((d) => ({ id: d.code, label: d.nameVi })),
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
      return withAdd(
        <ListCard<MdDomain>
          data={content.domains}
          columns={table<MdDomain>(
            [
              column('code', 'Mã', (r) => r.code, code),
              column('name', 'Tên', (r) => r.nameVi, name),
            ],
            (r) => ({ kind: 'domains', record: r }),
            (r) => ({ kind: 'domains', id: r.id, code: r.code, name: r.nameVi })
          )}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên domain..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.nameEn ?? ''}`}
          searchState={searchState}
          onRowClick={(r) => onOpen({ kind: 'domains', code: r.code })}
        />
      )
    case 'patterns':
      return withAdd(
        <ListCard<MdPattern>
          data={content.patterns.filter((r) => any || r.domainCode === domain)}
          columns={table<MdPattern>(
            [
              column('code', 'Mã', (r) => r.code, code),
              column('name', 'Dạng câu', (r) => r.nameVi, name),
              column('domain', 'Domain', (r) => domainName(content, r.domainCode)),
              column('skill', 'Kỹ năng chính', (r) => skillName(content, r.primarySkillCode)),
            ],
            (r) => ({ kind: 'patterns', record: r }),
            (r) => ({ kind: 'patterns', id: r.id, code: r.code, name: r.nameVi })
          )}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên dạng câu..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.canonicalPrompt ?? ''}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'patterns', code: r.code })}
        />
      )
    case 'skills':
      return withAdd(
        <ListCard<MdSkill>
          data={content.skills.filter((r) => any || r.domainCodes.includes(domain))}
          columns={table<MdSkill>(
            [
              column('code', 'Mã', (r) => r.code, code),
              column('name', 'Kỹ năng', (r) => r.nameVi, name),
              column('domain', 'Domain', (r) =>
                r.domainCodes.map((item) => domainName(content, item)).join(', ')
              ),
              column('prereq', 'Kỹ năng tiên quyết', (r) =>
                skillName(content, r.prerequisiteSkillCode)
              ),
              column('micro', 'Micro-skill', microCount),
            ],
            (r) => ({ kind: 'skills', record: r }),
            (r) => ({ kind: 'skills', id: r.id, code: r.code, name: r.nameVi })
          )}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên kỹ năng..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.nameEn ?? ''}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'skills', code: r.code })}
        />
      )
    case 'microSkills':
      return withAdd(
        <ListCard<MdMicroSkill>
          data={content.microSkills.filter(
            (r) => any || domainsOfMicro(content, r).includes(domain)
          )}
          columns={table<MdMicroSkill>(
            [
              column('code', 'Mã', (r) => r.code, code),
              column('name', 'Micro-skill', (r) => r.nameVi, name),
              column('skill', 'Kỹ năng', (r) => skillName(content, r.skillCode)),
            ],
            (r) => ({ kind: 'microSkills', record: r }),
            (r) => ({ kind: 'microSkills', id: r.id, code: r.code, name: r.nameVi })
          )}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã hoặc tên micro-skill..."
          searchText={(r) => `${r.code} ${r.nameVi} ${r.skillCode}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'microSkills', code: r.code })}
        />
      )
    case 'mappings':
      return withAdd(
        <ListCard<MdMapping>
          data={content.mappings.filter(
            (r) => any || domainOfPattern(content, r.patternCode) === domain
          )}
          columns={table<MdMapping>(
            [
              column('pattern', 'Dạng câu', (r) => patternName(content, r.patternCode), name),
              column('skill', 'Kỹ năng', (r) => skillName(content, r.skillCode), name),
              column(
                'micro',
                'Micro-skill',
                (r) => microSkillName(content, r.microSkillCode),
                name
              ),
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
            ],
            (r) => ({ kind: 'mappings', record: r }),
            (r) => ({
              kind: 'mappings',
              id: r.id,
              code: `${r.patternCode}>${r.skillCode}`,
              name: `${patternName(content, r.patternCode)} – ${skillName(content, r.skillCode)}`,
            })
          )}
          getRowKey={(r) => r.id}
          searchPlaceholder="Tìm mã dạng câu, kỹ năng..."
          searchText={(r) => `${r.patternCode} ${r.skillCode} ${r.microSkillCode ?? ''}`}
          searchState={searchState}
          extraFilters={domainFilter}
          onRowClick={(r) => onOpen({ kind: 'patterns', code: r.patternCode })}
        />
      )
    case 'errorCodes':
      return withAdd(
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-6 text-text-secondary">
            Các kiểu sai thường gặp, cách nhận biết và gợi ý để giáo viên hỗ trợ học sinh.
          </p>
          <ListCard<MdErrorCode>
            data={content.errorCodes.filter(
              (r) => any || r.allDomains || r.domainCodes.includes(domain)
            )}
            columns={table<MdErrorCode>(
              [
                {
                  id: 'error',
                  header: 'Lỗi sai thường gặp',
                  accessorFn: (r) => r.nameVi,
                  cell: ({ row }) => {
                    const error = row.original
                    const presentation = errorCodePresentation(error)
                    const appliesTo = error.allDomains
                      ? 'Toàn môn học'
                      : error.domainCodes.map((item) => domainName(content, item)).join(', ') ||
                        error.appliesToText
                    return (
                      <article className="grid gap-4 rounded-lg border border-card-border bg-card-background p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-text-primary">
                            {presentation.name}
                          </h3>
                          {presentation.category && (
                            <Status tone="neutral">{presentation.category}</Status>
                          )}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium text-text-tertiary">
                              Dấu hiệu nhận biết
                            </p>
                            <p className="mt-1 text-sm leading-6 text-text-secondary">
                              {presentation.diagnostic ?? 'Chưa có mô tả.'}
                            </p>
                          </div>
                          <div className="rounded-lg bg-surface-soft p-3">
                            <p className="text-xs font-medium text-text-tertiary">Gợi ý hỗ trợ</p>
                            <p className="mt-1 text-sm leading-6 text-text-primary">
                              {presentation.support ?? 'Chưa có gợi ý hỗ trợ.'}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-text-tertiary">
                          <span className="font-medium">Áp dụng cho:</span>{' '}
                          {appliesTo || 'Chưa xác định'}
                        </p>
                      </article>
                    )
                  },
                },
              ],
              (r) => ({ kind: 'errorCodes', record: r }),
              (r) => ({
                kind: 'errorCodes',
                id: r.id,
                code: r.code,
                name: errorCodePresentation(r).name,
              })
            )}
            getRowKey={(r) => r.id}
            searchPlaceholder="Tìm lỗi sai thường gặp..."
            searchText={(r) => {
              const presentation = errorCodePresentation(r)
              return `${presentation.name} ${presentation.category ?? ''} ${presentation.diagnostic ?? ''} ${presentation.support ?? ''}`
            }}
            searchState={searchState}
            extraFilters={domainFilter}
            onRowClick={(r) => onOpen({ kind: 'errorCodes', code: r.code })}
          />
        </div>
      )
  }
}
