import { useState } from 'react'
import ConsoleDialog from '../../console/dialog'
import Button from '../../console/button'
import Field, { fieldControlClass, textareaControlClass } from '../../console/form-field'
import SelectField from '../../console/select-field'
import Notice from '../../console/notice'
import { Plus, Trash2 } from '../../console/icons'
import {
  savePatternBundle,
  type MasterDataContent,
  type PatternBundleResult,
} from '../../../services/masterDataService'
import { BANDS, NONE, STIMULUS_KINDS } from './master-data-labels'
import { masterDataError } from './master-data-rules'

const NEW = 'NEW'

interface SkillRow {
  key: number
  /** NEW, or the code of an existing skill. */
  pick: string
  name: string
  micros: string
}

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/** Letters of the name without accents, as a starting point for a subject's code prefix ("Toán học" → "TH"). */
function suggestPrefix(name: string): string {
  const plain = name
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
  const initials = plain
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
  return initials.slice(0, 3)
}

/**
 * One form for everything a question pattern needs, so a subject's master data can be built on the
 * web: the domain, the pattern, its skills with their micro-skills, and the common errors.
 * Codes are made by the server. For a subject with no version yet, saving starts its first draft.
 */
export default function MasterDataPatternBundleDialog({
  target,
  content,
  onClose,
  onSaved,
}: {
  target: { versionId: string } | { categoryId: string; categoryName: string }
  content: MasterDataContent | null
  onClose: () => void
  onSaved: (result: PatternBundleResult) => void
}) {
  const startsDraft = 'categoryId' in target
  const domains = content?.domains ?? []
  const skills = content?.skills ?? []

  const [prefix, setPrefix] = useState(startsDraft ? suggestPrefix(target.categoryName) : '')
  const [domain, setDomain] = useState(domains[0]?.code ?? NEW)
  const [newDomain, setNewDomain] = useState('')
  const [nameVi, setNameVi] = useState('')
  const [prompt, setPrompt] = useState('')
  const [band, setBand] = useState(NONE)
  const [stimulusKind, setStimulusKind] = useState(NONE)
  const [rows, setRows] = useState<SkillRow[]>([{ key: 0, pick: NEW, name: '', micros: '' }])
  const [errors, setErrors] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  const skillOptions = [
    { id: NEW, label: 'Kỹ năng mới' },
    ...skills.map((s) => ({ id: s.code, label: `${s.code} · ${s.nameVi}` })),
  ]

  function patchRow(key: number, patch: Partial<SkillRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  async function submit() {
    const picked = rows.filter((row) => row.pick !== NEW).map((row) => row.pick)
    if (startsDraft && !/^[A-Za-z][A-Za-z0-9]{1,9}$/.test(prefix.trim()))
      return setProblem('Mã môn gồm 2 đến 10 chữ cái hoặc số, bắt đầu bằng chữ cái.')
    if (domain === NEW && !newDomain.trim()) return setProblem('Nhập tên domain.')
    if (!nameVi.trim()) return setProblem('Nhập tên dạng câu.')
    if (rows.some((row) => row.pick === NEW && !row.name.trim()))
      return setProblem('Nhập tên cho mỗi kỹ năng mới.')
    if (new Set(picked).size !== picked.length) return setProblem('Một kỹ năng chỉ chọn một lần.')

    const range = BANDS.find((b) => b.id === band) ?? BANDS[0]
    setBusy(true)
    setProblem('')
    try {
      const result = await savePatternBundle(
        'versionId' in target ? target : { categoryId: target.categoryId },
        {
          codePrefix: startsDraft ? prefix.trim().toUpperCase() : null,
          domainCode: domain === NEW ? null : domain,
          newDomainNameVi: domain === NEW ? newDomain.trim() : null,
          nameVi: nameVi.trim(),
          canonicalPrompt: prompt.trim() || null,
          stimulusKind: stimulusKind === NONE ? null : stimulusKind.replace('KIND_', ''),
          difficultyMin: range.min,
          difficultyMax: range.max,
          skills: rows.map((row, index) => ({
            skillCode: row.pick === NEW ? null : row.pick,
            nameVi: row.pick === NEW ? row.name.trim() : null,
            role: index === 0 ? 'PRIMARY' : 'SUPPORTING',
            microSkills:
              row.pick === NEW ? lines(row.micros).map((name) => ({ nameVi: name })) : [],
          })),
          errorCodes: lines(errors).map((name) => ({ nameVi: name, allDomains: false })),
        }
      )
      onSaved(result)
    } catch (err) {
      setProblem(masterDataError(err))
      setBusy(false)
    }
  }

  return (
    <ConsoleDialog
      open
      maxWidth={640}
      title="Thêm dạng câu"
      onClose={onClose}
      dismissable={!busy}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
      footer={
        <>
          <Button appearance="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Đang lưu...' : 'Thêm dạng câu'}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        {problem && (
          <Notice tone="danger">
            <span role="alert">{problem}</span>
          </Notice>
        )}
        {startsDraft && (
          <Field
            label="Mã môn"
            hint="Đứng đầu mọi mã của môn này (ví dụ MA.Q01) và không đổi được sau khi lưu."
          >
            <input
              value={prefix}
              onChange={(event) => setPrefix(event.target.value.toUpperCase())}
              required
              maxLength={10}
              spellCheck={false}
              className={`${fieldControlClass} font-mono`}
            />
          </Field>
        )}
        {domains.length > 0 && (
          <Field label="Domain">
            <SelectField
              ariaLabel="Domain"
              value={domain}
              onChange={setDomain}
              options={[
                ...domains.map((d) => ({ id: d.code, label: d.nameVi })),
                { id: NEW, label: 'Domain mới' },
              ]}
            />
          </Field>
        )}
        {domain === NEW && (
          <Field label={domains.length ? 'Tên domain mới' : 'Domain'}>
            <input
              value={newDomain}
              onChange={(event) => setNewDomain(event.target.value)}
              required
              maxLength={255}
              className={fieldControlClass}
            />
          </Field>
        )}
        <Field label="Tên dạng câu">
          <input
            value={nameVi}
            onChange={(event) => setNameVi(event.target.value)}
            required
            maxLength={255}
            className={fieldControlClass}
          />
        </Field>
        <Field label="Câu hỏi mẫu">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={10000}
            className={textareaControlClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mức độ">
            <SelectField
              ariaLabel="Mức độ"
              value={band}
              onChange={setBand}
              options={BANDS.map((b) => ({ id: b.id, label: b.label }))}
            />
          </Field>
          <Field label="Ngữ liệu">
            <SelectField
              ariaLabel="Ngữ liệu"
              value={stimulusKind}
              onChange={setStimulusKind}
              options={STIMULUS_KINDS}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className="flex flex-col gap-3 rounded-lg border border-card-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-text-primary">
                  {index === 0 ? 'Kỹ năng chính' : 'Kỹ năng phụ'}
                </span>
                {index > 0 && (
                  <Button
                    appearance="ghost"
                    size="sm"
                    aria-label="Bỏ kỹ năng này"
                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
              {skills.length > 0 && (
                <SelectField
                  ariaLabel="Kỹ năng"
                  value={row.pick}
                  onChange={(value) => patchRow(row.key, { pick: value })}
                  options={skillOptions}
                />
              )}
              {row.pick === NEW && (
                <>
                  <Field label="Tên kỹ năng">
                    <input
                      value={row.name}
                      onChange={(event) => patchRow(row.key, { name: event.target.value })}
                      maxLength={255}
                      className={fieldControlClass}
                    />
                  </Field>
                  <Field label="Kỹ năng nhỏ" hint="Mỗi dòng một kỹ năng nhỏ, có thể để trống.">
                    <textarea
                      value={row.micros}
                      onChange={(event) => patchRow(row.key, { micros: event.target.value })}
                      className={textareaControlClass}
                    />
                  </Field>
                </>
              )}
            </div>
          ))}
          <Button
            appearance="outline"
            size="sm"
            className="w-fit"
            onClick={() =>
              setRows((current) => [
                ...current,
                {
                  key: Math.max(...current.map((r) => r.key)) + 1,
                  pick: NEW,
                  name: '',
                  micros: '',
                },
              ])
            }
          >
            <Plus size={14} />
            Thêm kỹ năng phụ
          </Button>
        </div>

        <Field label="Lỗi sai thường gặp" hint="Mỗi dòng một lỗi, áp dụng cho domain này.">
          <textarea
            value={errors}
            onChange={(event) => setErrors(event.target.value)}
            className={textareaControlClass}
          />
        </Field>
      </fieldset>
    </ConsoleDialog>
  )
}
