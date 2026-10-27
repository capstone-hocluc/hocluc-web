import { useState, type FormEvent, type ReactNode } from 'react'
import Button from '../../console/button'
import Card from '../../console/card'
import Notice from '../../console/notice'
import PageHeading from '../../console/page-heading'
import Panel from '../../console/panel'
import { textareaControlClass } from '../../console/form-field'
import { HelpCircle, Loader2, RotateCcw, Sparkles } from '../../console/icons'
import { cn } from '../../../lib/cn'
import {
  analyzeText,
  type CefrLabel,
  type DiversityUnit,
  type TextProfile,
  type ZipfBand,
} from '../../../services/textProfileService'
import TextProfileGlossary from './TextProfileGlossary'

// Display only: every number comes from POST /api/v1/text-profiles.

const SAMPLE_TEXT = `Climate change is one of the most serious problems facing the world today. Scientists agree that rising temperatures are caused mainly by human activities, such as burning coal, oil and gas. These fuels release carbon dioxide, which traps heat in the atmosphere.

As a result, glaciers are melting, sea levels are rising, and extreme weather events are becoming more frequent. Many governments have promised to reduce emissions, but progress has been slow. Individuals can also help by using public transport, saving energy at home and eating less meat. If we act now, we can still limit the damage and protect the planet for future generations.`

// `chip` tints labels and highlighted words; `bar` is the stronger fill for share bars.
const LEVELS: { id: CefrLabel; label: string; chip: string; bar: string }[] = [
  { id: 'A1', label: 'A1', chip: 'bg-badge-success-background text-badge-success-text', bar: 'bg-badge-success-text' },
  { id: 'A2', label: 'A2', chip: 'bg-badge-cyan-background text-badge-cyan-text', bar: 'bg-badge-cyan-text' },
  { id: 'B1', label: 'B1', chip: 'bg-badge-warning-background text-badge-warning-text', bar: 'bg-badge-warning-text' },
  { id: 'B2', label: 'B2', chip: 'bg-badge-orange-background text-badge-orange-text', bar: 'bg-badge-orange-text' },
  { id: 'C1', label: 'C1', chip: 'bg-badge-rose-background text-badge-rose-text', bar: 'bg-badge-rose-text' },
  { id: 'C2', label: 'C2', chip: 'bg-badge-purple-background text-badge-purple-text', bar: 'bg-badge-purple-text' },
  { id: 'OFF', label: 'Ngoài DS', chip: 'bg-badge-neutral-background text-badge-neutral-text', bar: 'bg-badge-neutral-text' },
]
const BANDS: { id: ZipfBand; label: string; chip: string; bar: string }[] = [
  { id: 'VERY_COMMON', label: 'Rất phổ biến (Zipf ≥ 5)', chip: LEVELS[0].chip, bar: LEVELS[0].bar },
  { id: 'COMMON', label: 'Phổ biến (4–5)', chip: LEVELS[1].chip, bar: LEVELS[1].bar },
  { id: 'MID_FREQUENCY', label: 'Ít gặp hơn (3–4)', chip: LEVELS[2].chip, bar: LEVELS[2].bar },
  { id: 'RARE', label: 'Hiếm (< 3)', chip: LEVELS[4].chip, bar: LEVELS[4].bar },
  { id: 'UNKNOWN', label: 'Không có dữ liệu', chip: LEVELS[6].chip, bar: LEVELS[6].bar },
]
const levelOf = (id: CefrLabel | null) => LEVELS.find((level) => level.id === id) ?? LEVELS[LEVELS.length - 1]
const bandOf = (id: ZipfBand) => BANDS.find((band) => band.id === id) ?? BANDS[BANDS.length - 1]

const fmt = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined || Number.isNaN(value)
    ? '—'
    : value.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const pct = (share: number | null | undefined) =>
  share === null || share === undefined ? '—' : `${Math.round(share * 100)}%`
// ">C2" is spelled out: next to a dash, the UI font draws "->" as an arrow.
const levelLabel = (level: string) => (level === '>C2' ? 'trên C2' : level)
/** "B1" when both bounds agree, "B1 – B2" otherwise, "—" when the text is too short. */
const levelRange = (lower: string | null, upper: string | null) =>
  !upper ? '—' : !lower || lower === upper ? levelLabel(upper) : `${levelLabel(lower)} – ${levelLabel(upper)}`

function Chip({ className, children }: { className: string; children: string }) {
  return (
    <span className={cn('inline-block rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap', className)}>
      {children}
    </span>
  )
}

function Bar({ share, className }: { share: number; className: string }) {
  return (
    <span className="block h-2 overflow-hidden rounded-full bg-background-gray-secondary">
      <span
        className={cn('block h-full rounded-full', className)}
        style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }}
      />
    </span>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs leading-5 text-text-tertiary">{children}</p>
}

const tableClass = 'w-full border-collapse text-sm [&_td]:border-t [&_td]:border-card-border [&_td]:px-2 [&_td]:py-2 [&_th]:px-2 [&_th]:pb-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-text-tertiary'
const numClass = 'text-right whitespace-nowrap tabular-nums text-text-primary'

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card padding="md" className="flex flex-col gap-1">
      <span className="text-xs font-medium text-text-tertiary">{label}</span>
      <strong className="text-2xl font-semibold tracking-tight text-text-primary tabular-nums">{value}</strong>
      <span className="text-xs text-text-tertiary">{detail}</span>
    </Card>
  )
}

function ReadabilityPanel({ profile }: { profile: TextProfile }) {
  const { scores, ...counts } = profile.readability
  const rows: [string, number, string][] = scores
    ? [
        ['Flesch–Kincaid (FKGL)', scores.fleschKincaidGrade, '0,39 × từ/câu + 11,8 × âm tiết/từ − 15,59'],
        ['Gunning Fog', scores.gunningFog, '0,4 × (từ/câu + 100 × từ khó/từ)'],
        [`SMOG${counts.smogLowReliability ? ' *' : ''}`, scores.smog, '1,043 × √(từ ≥3 âm tiết × 30/câu) + 3,1291'],
        ['Coleman–Liau (CLI)', scores.colemanLiau, '0,0588 × L − 0,296 × S − 15,8'],
        ['ARI', scores.automatedReadability, '4,71 × ký tự/từ + 0,5 × từ/câu − 21,43'],
      ]
    : []
  return (
    <Panel title="Độ dễ đọc">
      {!scores ? (
        <p className="text-sm text-text-tertiary">Không đủ câu để tính.</p>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-4 rounded-lg bg-badge-blue-background px-4 py-3">
            <strong className="text-3xl font-semibold text-badge-blue-text tabular-nums">
              {fmt(scores.fleschReadingEase)}
            </strong>
            <div>
              <span className="block text-sm font-semibold text-text-primary">
                Flesch Reading Ease (FRE) · {scores.fleschBand}
              </span>
              <span className="text-xs text-text-tertiary">0–100, càng cao càng dễ đọc</span>
            </div>
          </div>
          <table className={tableClass}>
            <thead>
              <tr>
                <th>Công thức (lớp Mỹ)</th>
                <th className="text-right!">Giá trị</th>
                <th>Cách tính</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([name, value, formula]) => (
                <tr key={name}>
                  <td className="text-text-primary">{name}</td>
                  <td className={numClass}>{fmt(value)}</td>
                  <td className="text-xs text-text-tertiary">{formula}</td>
                </tr>
              ))}
              <tr>
                <td className="font-semibold text-text-primary">Trung vị</td>
                <td className={cn(numClass, 'font-semibold')}>{fmt(scores.gradeMedian)}</td>
                <td className="text-xs text-text-tertiary">
                  Khoảng {fmt(scores.gradeMin)}–{fmt(scores.gradeMax)}
                </td>
              </tr>
            </tbody>
          </table>
          <Note>
            Dựa trên {counts.words} từ, {counts.sentences} câu, {counts.syllables} âm tiết
            {profile.counts.headings ? ` (bỏ qua ${profile.counts.headings} dòng tiêu đề)` : ''}.
            {counts.smogLowReliability && ' * SMOG được thiết kế cho văn bản ≥ 30 câu nên kém tin cậy ở đây.'}
          </Note>
        </>
      )}
    </Panel>
  )
}

function CefrPanel({ profile }: { profile: TextProfile }) {
  return (
    <Panel title="Từ vựng theo CEFR">
      <div className="grid grid-cols-[72px_44px_minmax(40px,1fr)_48px] items-center gap-x-3 gap-y-2 text-sm sm:grid-cols-[72px_44px_minmax(60px,1fr)_52px_76px]">
        <span className="text-xs font-medium text-text-tertiary">Mức</span>
        <span className="text-right text-xs font-medium text-text-tertiary">Lượt từ</span>
        <span />
        <span className="text-right text-xs font-medium text-text-tertiary">Từ gốc</span>
        <span className="hidden text-right text-xs font-medium text-text-tertiary sm:block">Tích luỹ</span>
        {profile.vocabulary.levels.map((row) => {
          const level = levelOf(row.level)
          return [
            <Chip key={`${row.level}-chip`} className={level.chip}>{level.label}</Chip>,
            <span key={`${row.level}-tok`} className={numClass}>{pct(row.tokenShare)}</span>,
            <Bar key={`${row.level}-bar`} share={row.tokenShare} className={level.bar} />,
            <span key={`${row.level}-typ`} className={numClass}>{pct(row.typeShare)}</span>,
            <span key={`${row.level}-cum`} className="hidden text-right text-xs text-text-tertiary tabular-nums sm:block">
              {row.cumulative === null ? '' : `≤${level.label} ${pct(row.cumulative)}`}
            </span>,
          ]
        })}
      </div>
      <Note>
        Mức từ vựng = mức thấp nhất mà người học biết ≥ 95% (đọc có hỗ trợ) hoặc ≥ 98% (tự đọc) số lượt từ.
        Khoảng mức: cận dưới bỏ qua từ ngoài danh sách, cận trên coi chúng là từ chưa biết. Danh từ riêng, số và
        chữ viết tắt không được tính.
      </Note>
    </Panel>
  )
}

function FrequencyPanel({ profile }: { profile: TextProfile }) {
  const { frequency } = profile
  return (
    <Panel
      title="Tần suất"
      action={
        <span className="rounded-full bg-badge-blue-background px-3 py-1 text-xs font-semibold text-badge-blue-text">
          Zipf TB từ nội dung: {fmt(frequency.meanContentZipf, 2)}
        </span>
      }
    >
      <div className="grid grid-cols-[minmax(120px,170px)_minmax(60px,1fr)_44px] items-center gap-x-3 gap-y-2 text-sm">
        {frequency.bands.map((row) => {
          const band = bandOf(row.band)
          return [
            <span key={`${row.band}-l`} className="text-text-primary">{band.label}</span>,
            <Bar key={`${row.band}-b`} share={row.share} className={band.bar} />,
            <span key={`${row.band}-p`} className={numClass}>{pct(row.share)}</span>,
          ]
        })}
      </div>
      <h3 className="mt-5 mb-2 text-sm font-semibold text-text-primary">Từ nội dung lặp lại nhiều nhất</h3>
      <table className={tableClass}>
        <thead>
          <tr>
            <th>Từ gốc</th>
            <th className="text-right!">Số lần</th>
            <th className="text-right!">Tỷ lệ</th>
            <th className="text-right!">CEFR</th>
            <th className="text-right!">Zipf</th>
          </tr>
        </thead>
        <tbody>
          {frequency.topWords.map((word) => (
            <tr key={word.lemma}>
              <td className="text-text-primary">{word.lemma}</td>
              <td className={numClass}>{word.count}</td>
              <td className={numClass}>{fmt(word.share * 100)}%</td>
              <td className="text-right">
                <Chip className={levelOf(word.cefr).chip}>{levelOf(word.cefr).label}</Chip>
              </td>
              <td className={numClass}>{fmt(word.zipf, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-card-border bg-background-gray-secondary p-0.5">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold text-text-tertiary',
            value === key && 'bg-card-background text-text-primary shadow-sm'
          )}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

function DiversityPanel({
  profile,
  unit,
  onUnit,
}: {
  profile: TextProfile
  unit: DiversityUnit
  onUnit: (unit: DiversityUnit) => void
}) {
  const { diversity } = profile
  const rows: [string, number | null, number, string][] = [
    ['TTR', diversity.ttr, 3, 'Số từ khác nhau ÷ tổng số từ. Phụ thuộc mạnh vào độ dài bài.'],
    ['Root TTR', diversity.rootTtr, 2, 'Số từ khác nhau ÷ √tổng số từ.'],
    ['MATTR', diversity.mattr, 3, 'TTR trung bình trên mọi đoạn 50 từ liên tiếp (cần ≥ 50 từ).'],
    ['MTLD', diversity.mtld, 1, 'Độ dài trung bình của đoạn trước khi TTR giảm xuống 0,72.'],
    ['HD-D', diversity.hdd, 3, 'Khả năng gặp từ mới khi rút ngẫu nhiên 42 từ (cần ≥ 42 từ).'],
    [
      'Mật độ từ vựng',
      diversity.lexicalDensity === null ? null : diversity.lexicalDensity * 100,
      1,
      '% từ nội dung — ước lượng.',
    ],
  ]
  return (
    <Panel
      title="Đa dạng từ vựng"
      action={
        <ToggleGroup<DiversityUnit>
          label="Đơn vị tính"
          value={unit}
          options={[
            ['FORM', 'Dạng từ'],
            ['LEMMA', 'Từ gốc'],
          ]}
          onChange={onUnit}
        />
      }
    >
      <table className={tableClass}>
        <tbody>
          {rows.map(([name, value, digits, note]) => (
            <tr key={name}>
              <td className="text-text-primary">{name}</td>
              <td className={numClass}>{fmt(value, digits)}</td>
              <td className="text-xs text-text-tertiary">{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Note>Tính trên {diversity.tokens} lượt từ (không gồm danh từ riêng và số).</Note>
    </Panel>
  )
}

function HighlightedText({ profile }: { profile: TextProfile }) {
  const [mode, setMode] = useState<'cefr' | 'zipf'>('cefr')
  const classFor = (index: number) => {
    const word = profile.words[index]
    if (!word.vocabulary) return 'text-text-tertiary'
    // A1 and very common words stay plain so the harder words stand out.
    if (mode === 'cefr') return word.cefr === 'A1' ? '' : levelOf(word.cefr).chip
    return word.zipfBand === 'VERY_COMMON' ? '' : bandOf(word.zipfBand).chip
  }
  const titleFor = (index: number) => {
    const word = profile.words[index]
    if (!word.vocabulary) return word.properNoun ? 'Danh từ riêng' : undefined
    return `${word.lemma} · ${levelOf(word.cefr).label} · Zipf ${fmt(word.zipf, 2)} · ${word.syllables} âm tiết`
  }
  return (
    <Panel
      title="Văn bản tô màu"
      className="lg:col-span-2"
      action={
        <ToggleGroup<'cefr' | 'zipf'>
          label="Tô màu theo"
          value={mode}
          options={[
            ['cefr', 'CEFR'],
            ['zipf', 'Tần suất'],
          ]}
          onChange={setMode}
        />
      }
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(mode === 'cefr' ? LEVELS : BANDS).map((item) => (
          <Chip key={item.id} className={item.chip}>{item.label}</Chip>
        ))}
      </div>
      <div className="max-h-[460px] overflow-auto rounded-lg border border-card-border px-4 py-1 text-[15px] leading-8 text-text-primary">
        {profile.paragraphs.map((segments, paragraphIndex) => (
          <p key={paragraphIndex} className="my-2">
            {segments.map((segment, index) =>
              segment.word === null || segment.word === undefined ? (
                segment.text
              ) : (
                <span key={index} className={cn('rounded px-0.5', classFor(segment.word))} title={titleFor(segment.word)}>
                  {profile.words[segment.word].text}
                </span>
              )
            )}
          </p>
        ))}
      </div>
    </Panel>
  )
}

export default function TextProfilerScreen({ title }: { title: string }) {
  const [text, setText] = useState('')
  const [profile, setProfile] = useState<TextProfile | null>(null)
  const [unit, setUnit] = useState<DiversityUnit>('FORM')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  // Rough live count for the input only; the server counts words properly and enforces the limit.
  const approxWords = text.trim() ? text.trim().split(/\s+/).length : 0

  const run = async (source: string, diversityUnit: DiversityUnit) => {
    setLoading(true)
    setError('')
    try {
      setProfile(await analyzeText(source, diversityUnit))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không phân tích được văn bản.')
    } finally {
      setLoading(false)
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    run(text, unit)
  }
  const changeUnit = (next: DiversityUnit) => {
    setUnit(next)
    if (profile) run(text, next)
  }
  const scores = profile?.readability.scores

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title={title}
        subtitle="Đo độ khó đọc, mức từ vựng CEFR, tần suất và độ đa dạng từ vựng của bài đọc hoặc bài viết tiếng Anh. Văn bản chỉ được phân tích, không được lưu lại."
        action={
          <Button appearance="outline" size="sm" onClick={() => setGlossaryOpen(true)}>
            <HelpCircle size={16} aria-hidden />
            Giải thích thuật ngữ
          </Button>
        }
      />
      {glossaryOpen && <TextProfileGlossary onClose={() => setGlossaryOpen(false)} />}

      <Card as="section">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <label htmlFor="text-profile-input" className="text-sm font-medium text-text-primary">
            Văn bản tiếng Anh
          </label>
          <textarea
            id="text-profile-input"
            rows={10}
            spellCheck={false}
            value={text}
            placeholder="Dán đoạn văn tiếng Anh vào đây (tối đa 20.000 từ). Để trống một dòng giữa các đoạn."
            onChange={(event) => setText(event.target.value)}
            className={cn(textareaControlClass, 'min-h-52 leading-6')}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-auto text-xs text-text-tertiary">Khoảng {approxWords.toLocaleString('vi-VN')} từ</span>
            <Button
              appearance="outline"
              size="sm"
              disabled={loading}
              onClick={() => {
                setText(SAMPLE_TEXT)
                run(SAMPLE_TEXT, unit)
              }}
            >
              <Sparkles size={16} aria-hidden />
              Văn bản mẫu
            </Button>
            <Button
              appearance="outline"
              size="sm"
              disabled={!text || loading}
              onClick={() => {
                setText('')
                setProfile(null)
                setError('')
              }}
            >
              <RotateCcw size={16} aria-hidden />
              Xoá
            </Button>
            <Button type="submit" size="sm" disabled={!text.trim() || loading}>
              {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
              Phân tích
            </Button>
          </div>
          {error && <Notice tone="danger">{error}</Notice>}
        </form>
      </Card>

      {profile && (
        <>
          {profile.warnings.includes('SHORT_TEXT') && (
            <Notice tone="warning">
              Văn bản ngắn (dưới 50 từ): mức từ vựng, MATTR và HD-D bị ẩn; các chỉ số khác chỉ mang tính tham khảo.
            </Notice>
          )}
          {profile.warnings.includes('LONG_SENTENCE') && (
            <Notice tone="warning">
              Có câu dài hơn 80 từ — có thể văn bản thiếu dấu câu, nên các chỉ số theo câu có thể sai.
            </Notice>
          )}

          <div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Số từ"
                value={profile.counts.words.toLocaleString('vi-VN')}
                detail={`${profile.counts.sentences} câu · ${profile.counts.paragraphs} đoạn · ${fmt(profile.counts.wordsPerSentence)} từ/câu`}
              />
              <SummaryCard
                label="Mức từ vựng (đọc có hỗ trợ, 95%)"
                value={levelRange(profile.vocabulary.lowerLevel95, profile.vocabulary.level95)}
                detail={`Tự đọc (98%): ${levelRange(profile.vocabulary.lowerLevel98, profile.vocabulary.level98)} · ${fmt(profile.vocabulary.offListShare * 100)}% từ ngoài danh sách`}
              />
              <SummaryCard
                label="Độ khó đọc (lớp Mỹ)"
                value={scores ? `${fmt(scores.gradeMin)}–${fmt(scores.gradeMax)}` : '—'}
                detail={`Trung vị ${fmt(scores?.gradeMedian)}`}
              />
              <SummaryCard
                label="Flesch Reading Ease"
                value={fmt(scores?.fleschReadingEase)}
                detail={scores?.fleschBand ?? '—'}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-text-tertiary">
              Mức này chỉ dựa trên từ vựng. Truyện nhiều hội thoại, thành ngữ hoặc văn bản có câu dài, phức tạp có thể
              khó hơn mức hiển thị — hãy xem thêm phần Độ dễ đọc.
            </p>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-2">
            <ReadabilityPanel profile={profile} />
            <CefrPanel profile={profile} />
            <FrequencyPanel profile={profile} />
            <DiversityPanel profile={profile} unit={unit} onUnit={changeUnit} />
            <HighlightedText profile={profile} />
          </div>
        </>
      )}

      <p className="text-xs leading-5 text-text-tertiary">
        Dữ liệu: CEFR-J Wordlist 1.5 (© Tono Laboratory, TUFS — dùng miễn phí, bắt buộc trích dẫn); Octanove Vocabulary
        Profile C1/C2 1.0 (CC BY-SA 4.0); wordfreq 3.1.1 (Robyn Speer, dữ liệu CC BY-SA 4.0); CMU Pronouncing Dictionary
        (© Carnegie Mellon University, giấy phép kiểu BSD).
        {profile ? ` Phiên bản dữ liệu từ vựng: ${profile.lexiconVersion}.` : ''}
      </p>
    </div>
  )
}
