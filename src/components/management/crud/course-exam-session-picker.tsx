import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { RequiredMark } from '../../console/form-field'
import Status from '../../console/status'
import type { ExamSession, ExamSessionSummary, ExamYear } from '../../../services/examYearService'
import { examDateRange, examSessionLabel, formatExamDate, registrationRange } from './exam-year-labels'

export const NO_SESSION = 'NONE'
/** A course saved before sittings existed: it keeps its typed exam date until a sitting is picked. */
export const LEGACY_SESSION = 'LEGACY'

interface Props {
  years: ExamYear[] | null
  loading: boolean
  value: string
  onChange: (value: string) => void
  /** Lộ trình of the course; "Nước rút đợt 2" only prepares for second sittings. */
  track: string
  /** The sitting the course is saved with, kept choosable even when it no longer qualifies. */
  current: ExamSessionSummary | null
  legacyDate: string | null
  disabled?: boolean
  invalid?: boolean
  required?: boolean
}

const todayText = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * The sittings a course can still prepare for: years that are not closed and not in the past, and
 * sittings whose last exam day has not gone by. Grouped by year so Đợt 1 and Đợt 2 sit side by side.
 */
function openSessionGroups(years: ExamYear[], track: string, keepId: string) {
  const today = todayText()
  const thisYear = new Date().getFullYear()
  const fitsTrack = (session: ExamSession) =>
    track === 'NONE' || (track === 'SPRINT_ROUND2') === (session.roundNo === 2)
  return [...years]
    .sort((a, b) => a.examYear - b.examYear)
    .map((year) => ({
      year,
      sessions: year.sessions.filter(
        (session) =>
          session.id === keepId ||
          (year.status !== 'CLOSED' &&
            year.examYear >= thisYear &&
            (session.examEndDate ?? session.examStartDate) >= today &&
            fitsTrack(session))
      ),
    }))
    .filter((group) => group.sessions.length > 0)
}

export default function CourseExamSessionPicker({
  years,
  loading,
  value,
  onChange,
  track,
  current,
  legacyDate,
  disabled,
  invalid,
  required,
}: Props) {
  const groups = openSessionGroups(years ?? [], track, value)
  const listed = groups.some((group) => group.sessions.some((session) => session.id === value))
  // The saved sitting while the years load, or when its year has been removed from the list.
  const orphan = current && current.id === value && !listed ? current : null

  const option = (id: string, body: ReactNode) => (
    <label
      key={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-card-border bg-card-background p-3 text-sm font-normal text-text-secondary hover:border-input-primary-focus-border/40',
        'has-checked:border-primary has-checked:bg-primary/5 has-disabled:cursor-not-allowed has-disabled:opacity-60'
      )}
    >
      <input
        type="radio"
        name="examSessionChoice"
        value={id}
        checked={value === id}
        onChange={() => onChange(id)}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 accent-(--color-primary)"
      />
      <span className="flex min-w-0 flex-col gap-1">{body}</span>
    </label>
  )

  return (
    <fieldset
      aria-invalid={invalid || undefined}
      className="flex min-w-0 flex-col gap-3 border-0 p-0"
    >
      <legend className="mb-2 p-0 text-sm font-medium text-text-primary">
        Đợt thi
        {required && <RequiredMark />}
      </legend>
      {groups.map(({ year, sessions }) => (
        <div key={year.id} className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wide text-text-tertiary uppercase">{year.name}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sessions.map((session) =>
              option(
                session.id,
                <>
                  <span className="flex flex-wrap items-center gap-2">
                    <strong className="font-semibold text-text-primary">{session.name}</strong>
                    <span>{examDateRange(session)}</span>
                    {!session.dateConfirmed && <Status tone="warning">Dự kiến</Status>}
                  </span>
                  <span className="text-xs text-text-tertiary">Đăng ký dự thi: {registrationRange(session)}</span>
                </>
              )
            )}
          </div>
        </div>
      ))}
      {orphan && option(orphan.id, <span className="text-text-primary">{examSessionLabel(orphan)}</span>)}
      {loading && !years && <p className="text-sm text-text-tertiary">Đang tải các đợt thi…</p>}
      {!loading && groups.length === 0 && (
        <p className="text-sm text-text-tertiary">
          Chưa có đợt thi nào sắp tới{track === 'SPRINT_ROUND2' ? ' cho lộ trình nước rút đợt 2' : ''}. Thêm ở tab
          “Đợt thi” của trang Khóa học.
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {legacyDate &&
          option(LEGACY_SESSION, <span>Giữ ngày thi cũ {formatExamDate(legacyDate)} (chưa gắn đợt)</span>)}
        {option(NO_SESSION, <span>Chưa chọn đợt thi</span>)}
      </div>
    </fieldset>
  )
}
