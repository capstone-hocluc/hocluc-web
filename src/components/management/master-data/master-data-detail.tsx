import type { ReactNode } from 'react'
import ConsoleSheet from '../../console/sheet'
import DetailSection from '../../console/detail/detail-section'
import Status from '../../console/status'
import Button from '../../console/button'
import { IconAction } from '../../console/icon-action'
import { Pencil, Plus, Trash2 } from '../../console/icons'
import type { MasterDataContent, MdMapping } from '../../../services/masterDataService'
import { MAPPING_ROLE_LABELS } from './master-data-labels'
import type { RecordKind, Selection, TableActions } from './master-data-tables'
import type { EditTarget } from './master-data-editor-dialog'
import { errorCodePresentation } from './error-code-presentation'

type Open = (selection: Selection) => void

const KIND_TITLES: Record<RecordKind, string> = {
  domains: 'Domain',
  patterns: 'Dạng câu',
  skills: 'Kỹ năng',
  microSkills: 'Micro-skill',
  errorCodes: 'Lỗi sai thường gặp',
}

/** The record a selection names, as the editor and the delete dialog take it. */
function editTarget(
  selection: Selection,
  content: MasterDataContent
): Exclude<EditTarget, { kind: 'mappings' }> | null {
  switch (selection.kind) {
    case 'domains': {
      const record = content.domains.find((r) => r.code === selection.code)
      return record ? { kind: 'domains', record } : null
    }
    case 'patterns': {
      const record = content.patterns.find((r) => r.code === selection.code)
      return record ? { kind: 'patterns', record } : null
    }
    case 'skills': {
      const record = content.skills.find((r) => r.code === selection.code)
      return record ? { kind: 'skills', record } : null
    }
    case 'microSkills': {
      const record = content.microSkills.find((r) => r.code === selection.code)
      return record ? { kind: 'microSkills', record } : null
    }
    case 'errorCodes': {
      const record = content.errorCodes.find((r) => r.code === selection.code)
      return record ? { kind: 'errorCodes', record } : null
    }
  }
}

function mappingName(content: MasterDataContent, m: MdMapping) {
  const name = (rows: { code: string; nameVi: string }[], code: string) =>
    rows.find((r) => r.code === code)?.nameVi ?? code
  return `${name(content.patterns, m.patternCode)} – ${name(content.skills, m.skillCode)}`
}

/** Related labels open their record; the code stays available in the record title and tooltip. */
function CodeLink({
  kind,
  value,
  content,
  onOpen,
}: {
  kind: RecordKind
  value: string
  content: MasterDataContent
  onOpen: Open
}) {
  const record = content[kind].find((row) => row.code === value)
  const label = record?.nameVi ?? value
  if (!record) return <span className="font-medium text-text-primary">{label}</span>
  return (
    <button
      type="button"
      onClick={() => onOpen({ kind, code: value })}
      title={value}
      className="rounded font-medium text-brand-500 underline-offset-2 hover:underline focus-visible:outline-2"
    >
      {label}
    </button>
  )
}

function Codes({
  kind,
  values,
  content,
  onOpen,
}: {
  kind: RecordKind
  values: string[]
  content: MasterDataContent
  onOpen: Open
}) {
  if (!values.length) return <span className="text-text-tertiary">—</span>
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {values.map((value) => (
        <CodeLink key={value} kind={kind} value={value} content={content} onOpen={onOpen} />
      ))}
    </span>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === ''
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-tertiary">{label}</dt>
      <dd className="mt-1 text-sm break-words whitespace-pre-line text-text-primary">
        {empty ? <span className="text-text-tertiary">—</span> : children}
      </dd>
    </div>
  )
}

function Fields({ children }: { children: ReactNode }) {
  return <dl className="flex flex-col gap-3">{children}</dl>
}

function body(
  selection: Selection,
  content: MasterDataContent,
  onOpen: Open,
  actions: TableActions | undefined
): { name: string; node: ReactNode } | null {
  const link = (kind: RecordKind, value: string | null | undefined) =>
    value ? <CodeLink kind={kind} value={value} content={content} onOpen={onOpen} /> : null
  const many = (kind: RecordKind, values: string[]) => (
    <Codes kind={kind} values={values} content={content} onOpen={onOpen} />
  )
  switch (selection.kind) {
    case 'domains': {
      const d = content.domains.find((row) => row.code === selection.code)
      if (!d) return null
      return {
        name: d.nameVi,
        node: (
          <>
            <Fields>
              <Field label="Tên tiếng Anh">{d.nameEn}</Field>
              <Field label="Phạm vi">{d.scope}</Field>
              <Field label="Cấp độ">{d.curriculumLevel}</Field>
              <Field label="Nguồn">{d.sourceStatus}</Field>
              <Field label="Ghi chú">{d.notes}</Field>
            </Fields>
            <DetailSection title="Liên quan">
              <Fields>
                <Field label="Dạng câu">
                  {many(
                    'patterns',
                    content.patterns.filter((p) => p.domainCode === d.code).map((p) => p.code)
                  )}
                </Field>
                <Field label="Kỹ năng">
                  {many(
                    'skills',
                    content.skills.filter((s) => s.domainCodes.includes(d.code)).map((s) => s.code)
                  )}
                </Field>
              </Fields>
            </DetailSection>
          </>
        ),
      }
    }
    case 'patterns': {
      const p = content.patterns.find((row) => row.code === selection.code)
      if (!p) return null
      const mappings = content.mappings.filter((m) => m.patternCode === p.code)
      return {
        name: p.nameVi,
        node: (
          <>
            <Fields>
              <Field label="Domain">{link('domains', p.domainCode)}</Field>
              <Field label="Câu hỏi mẫu">{p.canonicalPrompt}</Field>
              <Field label="Kỹ năng chính">{link('skills', p.primarySkillCode)}</Field>
            </Fields>
            {(mappings.length > 0 || actions) && (
              <DetailSection title={`Kỹ năng cần (${mappings.length})`}>
                <ul className="flex flex-col gap-2 text-sm">
                  {mappings.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-2">
                      {m.role && (
                        <Status tone={m.role === 'PRIMARY' ? 'info' : 'neutral'}>
                          {MAPPING_ROLE_LABELS[m.role]}
                        </Status>
                      )}
                      {link('skills', m.skillCode)}
                      {m.microSkillCode && <span className="text-text-tertiary">·</span>}
                      {link('microSkills', m.microSkillCode)}
                      {m.weight !== null && (
                        <span className="text-text-tertiary">trọng số {m.weight}</span>
                      )}
                      {actions && (
                        <span className="ml-auto flex">
                          <IconAction
                            label="Sửa liên kết"
                            icon={Pencil}
                            hover="info"
                            onClick={() => actions.onEdit({ kind: 'mappings', record: m })}
                          />
                          <IconAction
                            label="Xóa liên kết"
                            icon={Trash2}
                            variant="danger"
                            onClick={() =>
                              actions.onDelete({
                                kind: 'mappings',
                                id: m.id,
                                code: `${m.patternCode}>${m.skillCode}`,
                                name: mappingName(content, m),
                              })
                            }
                          />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {actions && (
                  <Button
                    size="sm"
                    appearance="outline"
                    className="mt-3 self-start"
                    onClick={() =>
                      actions.onEdit({ kind: 'mappings', record: null, patternCode: p.code })
                    }
                  >
                    <Plus size={14} />
                    Thêm kỹ năng cho dạng câu
                  </Button>
                )}
              </DetailSection>
            )}
          </>
        ),
      }
    }
    case 'skills': {
      const s = content.skills.find((row) => row.code === selection.code)
      if (!s) return null
      const usedBy = new Set([
        ...content.patterns.filter((p) => p.primarySkillCode === s.code).map((p) => p.code),
        ...content.mappings.filter((m) => m.skillCode === s.code).map((m) => m.patternCode),
      ])
      return {
        name: s.nameVi,
        node: (
          <>
            <Fields>
              <Field label="Tên tiếng Anh">{s.nameEn}</Field>
              <Field label="Domain">{many('domains', s.domainCodes)}</Field>
              <Field label="Mô tả">{s.description}</Field>
              <Field label="Kỹ năng tiên quyết">{link('skills', s.prerequisiteSkillCode)}</Field>
            </Fields>
            <DetailSection title="Liên quan">
              <Fields>
                <Field label="Micro-skill">
                  {many(
                    'microSkills',
                    content.microSkills.filter((m) => m.skillCode === s.code).map((m) => m.code)
                  )}
                </Field>
                <Field label="Dạng câu dùng kỹ năng này">{many('patterns', [...usedBy])}</Field>
              </Fields>
            </DetailSection>
          </>
        ),
      }
    }
    case 'microSkills': {
      const m = content.microSkills.find((row) => row.code === selection.code)
      if (!m) return null
      return {
        name: m.nameVi,
        node: (
          <Fields>
            <Field label="Kỹ năng">{link('skills', m.skillCode)}</Field>
            <Field label="Mô tả">{m.description}</Field>
            <Field label="Lỗi mặc định">{link('errorCodes', m.defaultErrorCode)}</Field>
          </Fields>
        ),
      }
    }
    case 'errorCodes': {
      const e = content.errorCodes.find((row) => row.code === selection.code)
      if (!e) return null
      const presentation = errorCodePresentation(e)
      return {
        name: presentation.name,
        node: (
          <Fields>
            <Field label="Mã tham chiếu">{e.code}</Field>
            <Field label="Nhóm lỗi">{presentation.category}</Field>
            <Field label="Dấu hiệu nhận biết">{presentation.diagnostic}</Field>
            <Field label="Gợi ý hỗ trợ">{presentation.support}</Field>
            <Field label="Áp dụng cho">
              {e.allDomains ? 'Toàn môn học' : many('domains', e.domainCodes)}
            </Field>
            <Field label="Kỹ năng nhỏ liên quan">
              {many(
                'microSkills',
                content.microSkills.filter((m) => m.defaultErrorCode === e.code).map((m) => m.code)
              )}
            </Field>
          </Fields>
        ),
      }
    }
  }
}

/** The side sheet for one record; codes in it open their own record, Back returns. */
export default function MasterDataDetail({
  selection,
  content,
  onOpen,
  onBack,
  onClose,
  actions,
}: {
  selection: Selection | null
  content: MasterDataContent
  onOpen: Open
  onBack?: () => void
  onClose: () => void
  actions?: TableActions
}) {
  const shown = selection ? body(selection, content, onOpen, actions) : null
  const target = selection && actions ? editTarget(selection, content) : null
  return (
    <ConsoleSheet
      open={!!selection}
      onClose={onClose}
      title={
        selection
          ? selection.kind === 'errorCodes'
            ? 'Chi tiết lỗi sai thường gặp'
            : KIND_TITLES[selection.kind]
          : ''
      }
    >
      {selection && (
        <div className="flex flex-col gap-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="self-start text-sm text-brand-500 underline-offset-2 hover:underline"
            >
              ← Quay lại
            </button>
          )}
          {shown ? (
            <>
              <p className="text-base font-medium text-text-primary">{shown.name}</p>
              {target && target.record && actions && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" appearance="outline" onClick={() => actions.onEdit(target)}>
                    <Pencil size={14} />
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    appearance="outline"
                    onClick={() =>
                      actions.onDelete({
                        kind: target.kind,
                        id: target.record!.id,
                        code: target.record!.code,
                        name: shown.name,
                      })
                    }
                  >
                    <Trash2 size={14} />
                    Xóa
                  </Button>
                </div>
              )}
              {shown.node}
            </>
          ) : (
            <p className="text-sm text-text-tertiary">
              Không tìm thấy bản ghi này trong phiên bản đang xem.
            </p>
          )}
        </div>
      )}
    </ConsoleSheet>
  )
}
