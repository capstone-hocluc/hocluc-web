import { useState, type ReactNode } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import SelectField from '../../console/select-field'
import Notice from '../../console/notice'
import DetailSection from '../../console/detail/detail-section'
import { Checkbox } from '../../tailgrids/core/checkbox'
import {
  saveLabel,
  type DifficultyLevel,
  type MasterDataContent,
  type MdDomain,
  type MdErrorCode,
  type MdMapping,
  type MdMicroSkill,
  type MdPattern,
  type MdSkill,
} from '../../../services/masterDataService'
import {
  codeProblem,
  KIND_NOUNS,
  mappingProblem,
  masterDataError,
  normalizeCode,
  prerequisiteChoices,
  suggestCode,
  type EditKind,
} from './master-data-rules'

export type EditTarget =
  | { kind: 'domains'; record: MdDomain | null }
  | { kind: 'patterns'; record: MdPattern | null; domainCode?: string }
  | { kind: 'skills'; record: MdSkill | null; domainCode?: string }
  | { kind: 'microSkills'; record: MdMicroSkill | null; skillCode?: string }
  | { kind: 'errorCodes'; record: MdErrorCode | null }
  | { kind: 'mappings'; record: MdMapping | null; patternCode?: string }

/** What the screen shows once a save went through: a note, or a warning when only part of it did. */
export type SaveOutcome = { notice?: string; warning?: string }

interface Shared {
  versionId: string
  prefix: string | null
  content: MasterDataContent
  onClose: () => void
  onSaved: (outcome: SaveOutcome) => void
}

const NONE = 'NONE'
const text = (value: string) => value.trim() || null
const SKILL_LEVELS = ['Cơ bản', 'Kỹ năng', 'Nâng cao', 'Tích hợp']
const BANDS: {
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
/** The band text a micro-skill keeps, written as the workbooks write it. */
const BAND_TEXTS = ['Dễ', 'Dễ–TB', 'TB', 'TB–Khó', 'Khó']
const STIMULUS_KINDS = [
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

const nameOf = (rows: { code: string; nameVi: string }[], code: string | null | undefined) =>
  rows.find((row) => row.code === code)?.nameVi ?? code ?? ''

function Shell({
  kind,
  editing,
  busy,
  error,
  submitDisabled,
  onClose,
  onSubmit,
  children,
}: {
  kind: EditKind
  editing: boolean
  busy: boolean
  error: string
  submitDisabled?: boolean
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
}) {
  const noun = KIND_NOUNS[kind]
  return (
    <ConsoleDialog
      open
      maxWidth={640}
      title={`${editing ? 'Sửa' : 'Thêm'} ${noun}`}
      onClose={onClose}
      dismissable={!busy}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy || submitDisabled}>
            {busy ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : `Thêm ${noun}`}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        {error && (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        )}
        {children}
      </fieldset>
    </ConsoleDialog>
  )
}

/** Code field: filled in with the next free code for a new label, fixed once the label exists. */
function CodeField({
  value,
  onChange,
  locked,
}: {
  value: string
  onChange: (value: string) => void
  locked: boolean
}) {
  return (
    <Field label="Mã" hint={locked ? 'Mã giữ nguyên sau khi tạo.' : undefined}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        disabled={locked}
        required
        maxLength={50}
        spellCheck={false}
        className={`${fieldControlClass} font-mono`}
      />
    </Field>
  )
}

function TextInput({
  label,
  value,
  onChange,
  required,
  hint,
  max = 255,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  hint?: string
  max?: number
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={max}
        className={fieldControlClass}
      />
    </Field>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={10000}
        className={textareaControlClass}
      />
    </Field>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: string; label: string }[]
  disabled?: boolean
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <SelectField
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={options}
        disabled={disabled}
      />
    </Field>
  )
}

function DomainChecks({
  content,
  value,
  onChange,
  disabled,
}: {
  content: MasterDataContent
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-card-border p-3 sm:grid-cols-2">
      {content.domains.map((domain) => (
        <Checkbox
          key={domain.code}
          isSelected={value.includes(domain.code)}
          isDisabled={disabled}
          onChange={(checked) =>
            onChange(
              checked ? [...value, domain.code] : value.filter((code) => code !== domain.code)
            )
          }
        >
          <span className="text-sm text-text-primary">{domain.nameVi}</span>
        </Checkbox>
      ))}
    </div>
  )
}

/** Runs one save, turning a refusal into the form's error line. */
function useSave() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(masterDataError(err))
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

function DomainForm({
  record,
  versionId,
  prefix,
  content,
  onClose,
  onSaved,
}: Shared & { record: MdDomain | null }) {
  const [code, setCode] = useState(record?.code ?? suggestCode('domains', prefix, content))
  const [nameVi, setNameVi] = useState(record?.nameVi ?? '')
  const [nameEn, setNameEn] = useState(record?.nameEn ?? '')
  const [scope, setScope] = useState(record?.scope ?? '')
  const [level, setLevel] = useState(record?.curriculumLevel ?? '')
  const [source, setSource] = useState(record?.sourceStatus ?? '')
  const [notes, setNotes] = useState(record?.notes ?? '')
  const save = useSave()
  return (
    <Shell
      kind="domains"
      editing={!!record}
      busy={save.busy}
      error={save.error}
      onClose={onClose}
      onSubmit={() => {
        const problem = record ? null : codeProblem('domains', code, prefix, content)
        if (problem) return save.setError(problem)
        if (!nameVi.trim()) return save.setError('Nhập tên domain.')
        void save.run(async () => {
          await saveLabel(versionId, 'domains', record?.id ?? null, {
            code: normalizeCode(code),
            nameVi: nameVi.trim(),
            nameEn: text(nameEn),
            scope: text(scope),
            curriculumLevel: text(level),
            sourceStatus: text(source),
            notes: text(notes),
          })
          onSaved({
            notice: record
              ? `Đã lưu domain "${nameVi.trim()}".`
              : `Đã thêm domain "${nameVi.trim()}".`,
          })
        })
      }}
    >
      <CodeField value={code} onChange={setCode} locked={!!record} />
      <TextInput label="Tên domain" value={nameVi} onChange={setNameVi} required />
      <TextArea label="Phạm vi" value={scope} onChange={setScope} />
      <DetailSection
        title="Thông tin thêm"
        collapsible
        defaultOpen={Boolean(record?.nameEn || record?.curriculumLevel || record?.notes)}
      >
        <TextInput label="Tên tiếng Anh" value={nameEn} onChange={setNameEn} />
        <TextInput label="Cấp độ chương trình" value={level} onChange={setLevel} max={100} />
        <TextInput label="Nguồn" value={source} onChange={setSource} max={100} />
        <TextArea label="Ghi chú" value={notes} onChange={setNotes} />
      </DetailSection>
    </Shell>
  )
}

function PatternForm({
  record,
  domainCode,
  versionId,
  prefix,
  content,
  onClose,
  onSaved,
}: Shared & { record: MdPattern | null; domainCode?: string }) {
  const [code, setCode] = useState(record?.code ?? suggestCode('patterns', prefix, content))
  const [nameVi, setNameVi] = useState(record?.nameVi ?? '')
  const [domain, setDomain] = useState(
    record?.domainCode ?? domainCode ?? content.domains[0]?.code ?? ''
  )
  const [prompt, setPrompt] = useState(record?.canonicalPrompt ?? '')
  const [band, setBand] = useState(
    BANDS.find(
      (b) => b.min === (record?.difficultyMin ?? null) && b.max === (record?.difficultyMax ?? null)
    )?.id ?? NONE
  )
  const [stimulusType, setStimulusType] = useState(record?.stimulusType ?? '')
  const [stimulusKind, setStimulusKind] = useState(
    record?.stimulusKind ? `KIND_${record.stimulusKind}` : NONE
  )
  const [responseType, setResponseType] = useState(record?.responseType ?? '')
  const [vact, setVact] = useState(record?.vactRelevance ?? '')
  const [source, setSource] = useState(record?.sourceStatus ?? '')
  const [notes, setNotes] = useState(record?.notes ?? '')
  // A new question type is saved with its primary skill: a version cannot go live with a type that has none.
  const domainSkills = content.skills.filter((s) => s.domainCodes.includes(domain))
  const skillOptions = [
    ...domainSkills,
    ...content.skills.filter((s) => !s.domainCodes.includes(domain)),
  ]
  const [skill, setSkill] = useState(domainSkills[0]?.code ?? content.skills[0]?.code ?? '')
  const [micro, setMicro] = useState(NONE)
  const micros = content.microSkills.filter((m) => m.skillCode === skill)
  const save = useSave()

  if (!content.domains.length) return <Missing kind="patterns" what="domain" onClose={onClose} />
  if (!record && !content.skills.length)
    return <Missing kind="patterns" what="kỹ năng" onClose={onClose} />

  return (
    <Shell
      kind="patterns"
      editing={!!record}
      busy={save.busy}
      error={save.error}
      onClose={onClose}
      onSubmit={() => {
        const problem = record ? null : codeProblem('patterns', code, prefix, content)
        if (problem) return save.setError(problem)
        if (!nameVi.trim()) return save.setError('Nhập tên dạng câu.')
        if (!record && !skill) return save.setError('Chọn kỹ năng chính.')
        const picked = BANDS.find((b) => b.id === band) ?? BANDS[0]
        void save.run(async () => {
          const body = {
            code: normalizeCode(code),
            domainCode: domain,
            nameVi: nameVi.trim(),
            canonicalPrompt: text(prompt),
            stimulusType: text(stimulusType),
            stimulusKind: stimulusKind === NONE ? null : stimulusKind.replace('KIND_', ''),
            responseType: text(responseType),
            difficultyMin: picked.min,
            difficultyMax: picked.max,
            vactRelevance: text(vact),
            sourceStatus: text(source),
            notes: text(notes),
          }
          await saveLabel(versionId, 'patterns', record?.id ?? null, body)
          if (record) return onSaved({ notice: `Đã lưu dạng câu "${body.nameVi}".` })
          try {
            await saveLabel(versionId, 'mappings', null, {
              patternCode: body.code,
              skillCode: skill,
              microSkillCode: micro === NONE ? null : micro,
              role: 'PRIMARY',
              weight: 1,
              notes: null,
            })
            onSaved({ notice: `Đã thêm dạng câu "${body.nameVi}".` })
          } catch (err) {
            onSaved({
              warning: `Đã thêm dạng câu "${body.nameVi}" nhưng chưa gắn được kỹ năng chính: ${masterDataError(err)} Thêm liên kết kỹ năng chính cho dạng câu trước khi kích hoạt.`,
            })
          }
        })
      }}
    >
      <CodeField value={code} onChange={setCode} locked={!!record} />
      <TextInput label="Tên dạng câu" value={nameVi} onChange={setNameVi} required />
      <Select
        label="Domain"
        value={domain}
        onChange={(value) => {
          setDomain(value)
          // A new type starts on a skill of its own domain, when the one picked belongs elsewhere.
          const inDomain = content.skills.filter((s) => s.domainCodes.includes(value))
          if (!record && inDomain.length && !inDomain.some((s) => s.code === skill)) {
            setSkill(inDomain[0].code)
            setMicro(NONE)
          }
        }}
        options={content.domains.map((d) => ({ id: d.code, label: d.nameVi }))}
      />
      <TextArea label="Câu hỏi mẫu" value={prompt} onChange={setPrompt} />
      {!record && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Kỹ năng chính"
            value={skill}
            onChange={(value) => {
              setSkill(value)
              setMicro(NONE)
            }}
            options={skillOptions.map((s) => ({ id: s.code, label: s.nameVi }))}
          />
          <Select
            label="Micro-skill"
            value={micro}
            onChange={setMicro}
            options={[
              { id: NONE, label: 'Không chọn' },
              ...micros.map((m) => ({ id: m.code, label: m.nameVi })),
            ]}
          />
        </div>
      )}
      <Select label="Độ khó" value={band} onChange={setBand} options={BANDS} />
      <DetailSection
        title="Thông tin thêm"
        collapsible
        defaultOpen={Boolean(record?.stimulusType || record?.responseType || record?.notes)}
      >
        <TextInput
          label="Ngữ liệu"
          value={stimulusType}
          onChange={setStimulusType}
          max={100}
          hint="Ví dụ: Câu đơn, Đoạn văn, Passage văn học."
        />
        <Select
          label="Loại ngữ liệu"
          value={stimulusKind}
          onChange={setStimulusKind}
          options={STIMULUS_KINDS}
        />
        <TextInput
          label="Dạng trả lời"
          value={responseType}
          onChange={setResponseType}
          max={50}
          hint="Ví dụ: MCQ."
        />
        <TextInput label="Liên quan V-ACT" value={vact} onChange={setVact} max={100} />
        <TextInput label="Nguồn" value={source} onChange={setSource} max={100} />
        <TextArea label="Ghi chú" value={notes} onChange={setNotes} />
      </DetailSection>
    </Shell>
  )
}

function SkillForm({
  record,
  domainCode,
  versionId,
  prefix,
  content,
  onClose,
  onSaved,
}: Shared & { record: MdSkill | null; domainCode?: string }) {
  const [code, setCode] = useState(record?.code ?? suggestCode('skills', prefix, content))
  const [nameVi, setNameVi] = useState(record?.nameVi ?? '')
  const [domains, setDomains] = useState<string[]>(
    record?.domainCodes ?? (domainCode ? [domainCode] : [])
  )
  const [level, setLevel] = useState(record?.level ?? SKILL_LEVELS[0])
  const [prereq, setPrereq] = useState(record?.prerequisiteSkillCode ?? NONE)
  const [description, setDescription] = useState(record?.description ?? '')
  const [behavior, setBehavior] = useState(record?.observableBehavior ?? '')
  const [nameEn, setNameEn] = useState(record?.nameEn ?? '')
  const [category, setCategory] = useState(record?.skillCategory ?? '')
  const [vact, setVact] = useState(record?.vactRelevance ?? '')
  const [source, setSource] = useState(record?.sourceStatus ?? '')
  const save = useSave()
  const levels = level && !SKILL_LEVELS.includes(level) ? [...SKILL_LEVELS, level] : SKILL_LEVELS
  const prereqs = prerequisiteChoices(content, record?.code ?? null).filter(
    (s) => s.code !== record?.code
  )

  if (!content.domains.length) return <Missing kind="skills" what="domain" onClose={onClose} />

  return (
    <Shell
      kind="skills"
      editing={!!record}
      busy={save.busy}
      error={save.error}
      onClose={onClose}
      onSubmit={() => {
        const problem = record ? null : codeProblem('skills', code, prefix, content)
        if (problem) return save.setError(problem)
        if (!nameVi.trim()) return save.setError('Nhập tên kỹ năng.')
        if (!domains.length) return save.setError('Chọn ít nhất một domain cho kỹ năng.')
        void save.run(async () => {
          await saveLabel(versionId, 'skills', record?.id ?? null, {
            code: normalizeCode(code),
            // Kept in the order of the domain list, as the workbooks write them.
            domainCodes: content.domains.map((d) => d.code).filter((d) => domains.includes(d)),
            nameVi: nameVi.trim(),
            nameEn: text(nameEn),
            skillCategory: text(category),
            description: text(description),
            observableBehavior: text(behavior),
            level: text(level),
            prerequisiteSkillCode: prereq === NONE ? null : prereq,
            vactRelevance: text(vact),
            sourceStatus: text(source),
          })
          onSaved({
            notice: record
              ? `Đã lưu kỹ năng "${nameVi.trim()}".`
              : `Đã thêm kỹ năng "${nameVi.trim()}".`,
          })
        })
      }}
    >
      <CodeField value={code} onChange={setCode} locked={!!record} />
      <TextInput label="Tên kỹ năng" value={nameVi} onChange={setNameVi} required />
      <Field label="Domain">
        <DomainChecks content={content} value={domains} onChange={setDomains} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Cấp độ"
          value={level}
          onChange={setLevel}
          options={levels.map((l) => ({ id: l, label: l }))}
        />
        <Select
          label="Kỹ năng tiên quyết"
          value={prereq}
          onChange={setPrereq}
          options={[
            { id: NONE, label: 'Không có' },
            ...prereqs.map((s) => ({ id: s.code, label: s.nameVi })),
          ]}
          hint={
            record
              ? 'Không liệt kê các kỹ năng đang cần học kỹ năng này trước, để tránh vòng lặp.'
              : undefined
          }
        />
      </div>
      <TextArea label="Mô tả" value={description} onChange={setDescription} />
      <TextArea label="Biểu hiện quan sát được" value={behavior} onChange={setBehavior} />
      <DetailSection
        title="Thông tin thêm"
        collapsible
        defaultOpen={Boolean(record?.nameEn || record?.skillCategory)}
      >
        <TextInput label="Tên tiếng Anh" value={nameEn} onChange={setNameEn} />
        <TextInput label="Nhóm kỹ năng" value={category} onChange={setCategory} max={100} />
        <TextInput label="Liên quan V-ACT" value={vact} onChange={setVact} max={100} />
        <TextInput label="Nguồn" value={source} onChange={setSource} max={100} />
      </DetailSection>
    </Shell>
  )
}

function MicroSkillForm({
  record,
  skillCode,
  versionId,
  prefix,
  content,
  onClose,
  onSaved,
}: Shared & { record: MdMicroSkill | null; skillCode?: string }) {
  const [code, setCode] = useState(record?.code ?? suggestCode('microSkills', prefix, content))
  const [nameVi, setNameVi] = useState(record?.nameVi ?? '')
  const [skill, setSkill] = useState(
    record?.skillCode ?? skillCode ?? content.skills[0]?.code ?? ''
  )
  const [error, setErrorCode] = useState(record?.defaultErrorCode ?? NONE)
  const [description, setDescription] = useState(record?.description ?? '')
  const [evidence, setEvidence] = useState(record?.masteryEvidence ?? '')
  const [drill, setDrill] = useState(record?.suggestedDrill ?? '')
  const [band, setBand] = useState(record?.difficultyBand ?? NONE)
  const [source, setSource] = useState(record?.sourceStatus ?? '')
  const save = useSave()
  // A mapping row pairs a skill with one of its own micro-skills, so a used micro-skill keeps its skill.
  const usedBy = record ? content.mappings.filter((m) => m.microSkillCode === record.code) : []
  const bands = band !== NONE && !BAND_TEXTS.includes(band) ? [...BAND_TEXTS, band] : BAND_TEXTS
  const skillDomains = content.skills.find((s) => s.code === skill)?.domainCodes ?? []
  const fits = (e: MdErrorCode) =>
    e.allDomains || e.domainCodes.some((d) => skillDomains.includes(d))
  const errors = [...content.errorCodes.filter(fits), ...content.errorCodes.filter((e) => !fits(e))]

  if (!content.skills.length) return <Missing kind="microSkills" what="kỹ năng" onClose={onClose} />

  return (
    <Shell
      kind="microSkills"
      editing={!!record}
      busy={save.busy}
      error={save.error}
      onClose={onClose}
      onSubmit={() => {
        const problem = record ? null : codeProblem('microSkills', code, prefix, content)
        if (problem) return save.setError(problem)
        if (!nameVi.trim()) return save.setError('Nhập tên micro-skill.')
        if (record && skill !== record.skillCode && usedBy.length)
          return save.setError(
            'Micro-skill đang được dùng trong liên kết của dạng câu nên không đổi được kỹ năng. Đổi các liên kết đó trước.'
          )
        void save.run(async () => {
          await saveLabel(versionId, 'micro-skills', record?.id ?? null, {
            code: normalizeCode(code),
            skillCode: skill,
            nameVi: nameVi.trim(),
            description: text(description),
            masteryEvidence: text(evidence),
            suggestedDrill: text(drill),
            defaultErrorCode: error === NONE ? null : error,
            difficultyBand: band === NONE ? null : band,
            sourceStatus: text(source),
          })
          onSaved({
            notice: record
              ? `Đã lưu micro-skill "${nameVi.trim()}".`
              : `Đã thêm micro-skill "${nameVi.trim()}".`,
          })
        })
      }}
    >
      <CodeField value={code} onChange={setCode} locked={!!record} />
      <TextInput label="Tên micro-skill" value={nameVi} onChange={setNameVi} required />
      <Select
        label="Thuộc kỹ năng"
        value={skill}
        onChange={setSkill}
        options={content.skills.map((s) => ({ id: s.code, label: s.nameVi }))}
        disabled={usedBy.length > 0}
        hint={
          usedBy.length
            ? `Đang dùng trong liên kết của ${usedBy.length} dạng câu nên giữ nguyên kỹ năng.`
            : undefined
        }
      />
      <Select
        label="Lỗi sai mặc định"
        value={error}
        onChange={setErrorCode}
        options={[
          { id: NONE, label: 'Không chọn' },
          ...errors.map((e) => ({
            id: e.code,
            label: fits(e) ? e.nameVi : `${e.nameVi} (ngoài domain của kỹ năng)`,
          })),
        ]}
      />
      <TextArea label="Mô tả" value={description} onChange={setDescription} />
      <TextArea label="Bằng chứng thành thạo" value={evidence} onChange={setEvidence} />
      <TextArea label="Bài luyện gợi ý" value={drill} onChange={setDrill} />
      <DetailSection
        title="Thông tin thêm"
        collapsible
        defaultOpen={Boolean(record?.difficultyBand || record?.sourceStatus)}
      >
        <Select
          label="Độ khó"
          value={band}
          onChange={setBand}
          options={[{ id: NONE, label: 'Chưa đặt' }, ...bands.map((b) => ({ id: b, label: b }))]}
        />
        <TextInput label="Nguồn" value={source} onChange={setSource} max={100} />
      </DetailSection>
    </Shell>
  )
}

function ErrorCodeForm({
  record,
  versionId,
  prefix,
  content,
  onClose,
  onSaved,
}: Shared & { record: MdErrorCode | null }) {
  const [code, setCode] = useState(record?.code ?? suggestCode('errorCodes', prefix, content))
  const [nameVi, setNameVi] = useState(record?.nameVi ?? '')
  const [category, setCategory] = useState(record?.errorCategory ?? '')
  const [rule, setRule] = useState(record?.diagnosticRule ?? '')
  const [fix, setFix] = useState(record?.remediationAction ?? '')
  const [all, setAll] = useState(record?.allDomains ?? false)
  const [domains, setDomains] = useState<string[]>(record?.domainCodes ?? [])
  const save = useSave()
  return (
    <Shell
      kind="errorCodes"
      editing={!!record}
      busy={save.busy}
      error={save.error}
      onClose={onClose}
      onSubmit={() => {
        const problem = record ? null : codeProblem('errorCodes', code, prefix, content)
        if (problem) return save.setError(problem)
        if (!nameVi.trim()) return save.setError('Nhập tên lỗi sai.')
        if (!all && !domains.length)
          return save.setError('Chọn "Toàn môn học" hoặc ít nhất một domain mà lỗi này áp dụng.')
        void save.run(async () => {
          await saveLabel(versionId, 'error-codes', record?.id ?? null, {
            code: normalizeCode(code),
            errorCategory: text(category),
            nameVi: nameVi.trim(),
            diagnosticRule: text(rule),
            remediationAction: text(fix),
            allDomains: all,
            domainCodes: all
              ? []
              : content.domains.map((d) => d.code).filter((d) => domains.includes(d)),
          })
          onSaved({
            notice: record
              ? `Đã lưu lỗi sai "${nameVi.trim()}".`
              : `Đã thêm lỗi sai "${nameVi.trim()}".`,
          })
        })
      }}
    >
      <CodeField value={code} onChange={setCode} locked={!!record} />
      <TextInput label="Tên lỗi sai" value={nameVi} onChange={setNameVi} required />
      <TextInput
        label="Nhóm lỗi"
        value={category}
        onChange={setCategory}
        max={100}
        hint="Ví dụ: Từ vựng, Suy luận, Thời gian."
      />
      <TextArea label="Dấu hiệu nhận biết" value={rule} onChange={setRule} />
      <TextArea label="Gợi ý hỗ trợ" value={fix} onChange={setFix} />
      <Field label="Áp dụng cho">
        <div className="flex flex-col gap-2">
          <Checkbox isSelected={all} onChange={setAll}>
            <span className="text-sm text-text-primary">Toàn môn học</span>
          </Checkbox>
          {!all && <DomainChecks content={content} value={domains} onChange={setDomains} />}
        </div>
      </Field>
    </Shell>
  )
}

function MappingForm({
  record,
  patternCode,
  versionId,
  content,
  onClose,
  onSaved,
}: Shared & { record: MdMapping | null; patternCode?: string }) {
  const [pattern, setPattern] = useState(
    record?.patternCode ?? patternCode ?? content.patterns[0]?.code ?? ''
  )
  const [skill, setSkill] = useState(record?.skillCode ?? content.skills[0]?.code ?? '')
  const [micro, setMicro] = useState(record?.microSkillCode ?? NONE)
  const hasPrimary = content.mappings.some(
    (m) => m.id !== record?.id && m.patternCode === pattern && m.role === 'PRIMARY'
  )
  const [role, setRole] = useState<'PRIMARY' | 'SUPPORTING'>(
    record?.role ?? (hasPrimary ? 'SUPPORTING' : 'PRIMARY')
  )
  const [weight, setWeight] = useState(String(record?.weight ?? 1))
  const [notes, setNotes] = useState(record?.notes ?? '')
  const save = useSave()
  const micros = content.microSkills.filter((m) => m.skillCode === skill)

  if (!content.patterns.length || !content.skills.length)
    return (
      <Missing
        kind="mappings"
        what={content.patterns.length ? 'kỹ năng' : 'dạng câu'}
        onClose={onClose}
      />
    )

  return (
    <Shell
      kind="mappings"
      editing={!!record}
      busy={save.busy}
      error={save.error}
      onClose={onClose}
      onSubmit={() => {
        const draft = {
          patternCode: pattern,
          skillCode: skill,
          microSkillCode: micro === NONE ? null : micro,
          role,
          weight: Number(weight),
        }
        const problem = mappingProblem(draft, content, record?.id ?? null)
        if (problem) return save.setError(problem)
        void save.run(async () => {
          await saveLabel(versionId, 'mappings', record?.id ?? null, {
            ...draft,
            notes: text(notes),
          })
          onSaved({
            notice: `Đã lưu liên kết "${nameOf(content.patterns, pattern)}" – "${nameOf(content.skills, skill)}".`,
          })
        })
      }}
    >
      <Select
        label="Dạng câu"
        value={pattern}
        onChange={setPattern}
        options={content.patterns.map((p) => ({ id: p.code, label: p.nameVi }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Kỹ năng"
          value={skill}
          onChange={(value) => {
            setSkill(value)
            setMicro(NONE)
          }}
          options={content.skills.map((s) => ({ id: s.code, label: s.nameVi }))}
        />
        <Select
          label="Micro-skill"
          value={micro}
          onChange={setMicro}
          options={[
            { id: NONE, label: 'Không chọn' },
            ...micros.map((m) => ({ id: m.code, label: m.nameVi })),
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Vai trò"
          value={role}
          onChange={(value) => setRole(value as 'PRIMARY' | 'SUPPORTING')}
          options={[
            { id: 'PRIMARY', label: 'Kỹ năng chính' },
            { id: 'SUPPORTING', label: 'Kỹ năng hỗ trợ' },
          ]}
          hint={hasPrimary && role === 'PRIMARY' ? 'Dạng câu này đã có kỹ năng chính.' : undefined}
        />
        <Field label="Trọng số">
          <input
            type="number"
            min={0.1}
            step={0.1}
            required
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className={fieldControlClass}
          />
        </Field>
      </div>
      <TextArea label="Ghi chú" value={notes} onChange={setNotes} />
    </Shell>
  )
}

/** A label that needs another kind first (a question type needs a domain) says so instead of a form. */
function Missing({ kind, what, onClose }: { kind: EditKind; what: string; onClose: () => void }) {
  return (
    <ConsoleDialog
      open
      title={`Thêm ${KIND_NOUNS[kind]}`}
      onClose={onClose}
      footer={
        <Button appearance="outline" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <Notice tone="warning">
        Phiên bản chưa có {what} nào. Thêm {what} trước.
      </Notice>
    </ConsoleDialog>
  )
}

/** Add or change one label of a draft; the form checks the server's rules before it sends. */
export default function MasterDataEditorDialog({
  target,
  ...shared
}: Shared & { target: EditTarget }) {
  switch (target.kind) {
    case 'domains':
      return <DomainForm {...shared} record={target.record} />
    case 'patterns':
      return <PatternForm {...shared} record={target.record} domainCode={target.domainCode} />
    case 'skills':
      return <SkillForm {...shared} record={target.record} domainCode={target.domainCode} />
    case 'microSkills':
      return <MicroSkillForm {...shared} record={target.record} skillCode={target.skillCode} />
    case 'errorCodes':
      return <ErrorCodeForm {...shared} record={target.record} />
    case 'mappings':
      return <MappingForm {...shared} record={target.record} patternCode={target.patternCode} />
  }
}
