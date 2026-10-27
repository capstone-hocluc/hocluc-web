import type { ReactNode } from 'react'
import ConsoleSheet from '../../console/sheet'
import DetailSection from '../../console/detail/detail-section'
import Status from '../../console/status'
import type { MasterDataContent } from '../../../services/masterDataService'
import { MAPPING_ROLE_LABELS } from './master-data-labels'
import type { RecordKind, Selection } from './master-data-tables'

type Open = (selection: Selection) => void

const KIND_TITLES: Record<RecordKind, string> = {
  domains: 'Domain',
  patterns: 'Dạng câu',
  skills: 'Kỹ năng',
  microSkills: 'Micro-skill',
  errorCodes: 'Mã lỗi',
}

/** A code that opens its own record in the same sheet; plain text when it is not in the version. */
function CodeLink({ kind, value, content, onOpen }: { kind: RecordKind; value: string; content: MasterDataContent; onOpen: Open }) {
  const known = content[kind].some((row) => row.code === value)
  if (!known) return <span className="font-medium text-text-primary">{value}</span>
  return (
    <button
      type="button"
      onClick={() => onOpen({ kind, code: value })}
      className="rounded font-medium text-brand-500 underline-offset-2 hover:underline focus-visible:outline-2"
    >
      {value}
    </button>
  )
}

function Codes({ kind, values, content, onOpen }: { kind: RecordKind; values: string[]; content: MasterDataContent; onOpen: Open }) {
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

function body(selection: Selection, content: MasterDataContent, onOpen: Open): { name: string; node: ReactNode } | null {
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
                <Field label="Dạng câu">{many('patterns', content.patterns.filter((p) => p.domainCode === d.code).map((p) => p.code))}</Field>
                <Field label="Kỹ năng">{many('skills', content.skills.filter((s) => s.domainCodes.includes(d.code)).map((s) => s.code))}</Field>
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
              <Field label="Ngữ liệu">{p.stimulusType}</Field>
              <Field label="Dạng trả lời">{p.responseType}</Field>
              <Field label="Kỹ năng chính">{link('skills', p.primarySkillCode)}</Field>
              <Field label="Độ khó">{p.difficultyBand}</Field>
              <Field label="Mức liên quan V-ACT">{p.vactRelevance}</Field>
              <Field label="Nguồn">{p.sourceStatus}</Field>
              <Field label="Ghi chú">{p.notes}</Field>
            </Fields>
            {mappings.length > 0 && (
              <DetailSection title={`Mapping (${mappings.length})`}>
                <ul className="flex flex-col gap-2 text-sm">
                  {mappings.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-2">
                      {m.role && <Status tone={m.role === 'PRIMARY' ? 'info' : 'neutral'}>{MAPPING_ROLE_LABELS[m.role]}</Status>}
                      {link('skills', m.skillCode)}
                      {m.microSkillCode && <span className="text-text-tertiary">·</span>}
                      {link('microSkills', m.microSkillCode)}
                      {m.weight !== null && <span className="text-text-tertiary">trọng số {m.weight}</span>}
                    </li>
                  ))}
                </ul>
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
              <Field label="Loại">{s.skillCategory}</Field>
              <Field label="Cấp độ">{s.level}</Field>
              <Field label="Mô tả">{s.description}</Field>
              <Field label="Hành vi quan sát được">{s.observableBehavior}</Field>
              <Field label="Kỹ năng tiên quyết">{link('skills', s.prerequisiteSkillCode)}</Field>
              <Field label="Nguồn">{s.sourceStatus}</Field>
            </Fields>
            <DetailSection title="Liên quan">
              <Fields>
                <Field label="Micro-skill">{many('microSkills', content.microSkills.filter((m) => m.skillCode === s.code).map((m) => m.code))}</Field>
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
            <Field label="Bằng chứng thành thạo">{m.masteryEvidence}</Field>
            <Field label="Bài luyện gợi ý">{m.suggestedDrill}</Field>
            <Field label="Mã lỗi mặc định">{link('errorCodes', m.defaultErrorCode)}</Field>
            <Field label="Độ khó">{m.difficultyBand}</Field>
            <Field label="Nguồn">{m.sourceStatus}</Field>
          </Fields>
        ),
      }
    }
    case 'errorCodes': {
      const e = content.errorCodes.find((row) => row.code === selection.code)
      if (!e) return null
      return {
        name: e.nameVi,
        node: (
          <Fields>
            <Field label="Loại">{e.errorCategory}</Field>
            <Field label="Dấu hiệu nhận biết">{e.diagnosticRule}</Field>
            <Field label="Cách khắc phục">{e.remediationAction}</Field>
            <Field label="Áp dụng">{e.allDomains ? 'Toàn nhóm' : many('domains', e.domainCodes)}</Field>
            <Field label="Micro-skill mặc định dùng mã này">
              {many('microSkills', content.microSkills.filter((m) => m.defaultErrorCode === e.code).map((m) => m.code))}
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
}: {
  selection: Selection | null
  content: MasterDataContent
  onOpen: Open
  onBack?: () => void
  onClose: () => void
}) {
  const shown = selection ? body(selection, content, onOpen) : null
  return (
    <ConsoleSheet
      open={!!selection}
      onClose={onClose}
      title={selection ? `${KIND_TITLES[selection.kind]} ${selection.code}` : ''}
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
              {shown.node}
            </>
          ) : (
            <p className="text-sm text-text-tertiary">Không tìm thấy bản ghi này trong phiên bản đang xem.</p>
          )}
        </div>
      )}
    </ConsoleSheet>
  )
}
