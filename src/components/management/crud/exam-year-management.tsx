import { useMemo, useState, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import PageHeading from '../../console/page-heading'
import SelectField from '../../console/select-field'
import Status from '../../console/status'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { ChevronDown, Pencil, Plus, Trash2 } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import { cn } from '../../../lib/cn'
import {
  changeExamYearStatus,
  deleteExamSession,
  deleteExamYear,
  getAdminExamYears,
  type ExamSession,
  type ExamYear,
  type ExamYearStatus,
} from '../../../services/examYearService'
import { crudError } from './crud-errors'
import {
  EXAM_YEAR_STATUS_LABELS,
  EXAM_YEAR_STATUS_TONES,
  examDateRange,
  registrationRange,
} from './exam-year-labels'
import ExamYearEditorDialog from './exam-year-editor-dialog'
import ExamSessionEditorDialog from './exam-session-editor-dialog'

const STATUS_OPTIONS = (Object.keys(EXAM_YEAR_STATUS_LABELS) as ExamYearStatus[]).map((id) => ({
  id,
  label: EXAM_YEAR_STATUS_LABELS[id],
}))

type Deleting =
  { kind: 'year'; year: ExamYear } | { kind: 'session'; year: ExamYear; session: ExamSession }

/**
 * Exam years (Năm thi 2026-2027, ...) with their sittings. Each year is one card listing its rounds, so a
 * year and its Đợt 1 / Đợt 2 are read together. MAIN courses pick a sitting from here.
 */
export default function ExamYearManagement({
  readOnly = false,
  title,
  navigation,
}: {
  readOnly?: boolean
  title: string
  /** Tab row of the page group, shown under the heading. */
  navigation?: ReactNode
}) {
  const resource = useScheduleResource('exam-years', getAdminExamYears)
  const [yearEditor, setYearEditor] = useState<{ year: ExamYear | null } | null>(null)
  const [sessionEditor, setSessionEditor] = useState<{
    year: ExamYear
    session: ExamSession | null
  } | null>(null)
  const [deleting, setDeleting] = useState<Deleting | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // Newest year first: the one being prepared for is what staff open the page for.
  const years = useMemo(
    () => [...(resource.data ?? [])].sort((a, b) => b.examYear - a.examYear),
    [resource.data]
  )

  async function changeStatus(year: ExamYear, status: ExamYearStatus) {
    if (busy || status === year.status) return
    setBusy(true)
    setError('')
    try {
      await changeExamYearStatus(year.id, status)
      setNotice(
        status === 'ACTIVE'
          ? `${year.name} là năm hiện tại. Năm hiện tại trước đó đã được đóng.`
          : `Đã chuyển ${year.name} sang “${EXAM_YEAR_STATUS_LABELS[status]}”.`
      )
      resource.reload()
    } catch (err) {
      setError(crudError(err))
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleting || busy) return
    setBusy(true)
    setError('')
    try {
      if (deleting.kind === 'year') await deleteExamYear(deleting.year.id)
      else await deleteExamSession(deleting.session.id)
      setNotice(deleting.kind === 'year' ? 'Đã xóa năm thi.' : 'Đã xóa đợt thi.')
      setDeleting(null)
      resource.reload()
    } catch (err) {
      setError(crudError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <PageHeading
        title={title}
        readOnly={readOnly}
        action={
          !readOnly && (
            <Button onClick={() => setYearEditor({ year: null })} disabled={busy || resource.status !== 'ready'}>
              <Plus size={16} />
              Thêm năm thi
            </Button>
          )
        }
      />
      {navigation}
      {notice && (
        <Notice tone="info">
          <span role="status">{notice}</span>
        </Notice>
      )}
      {error && !deleting && (
        <Notice tone="danger">
          <span role="alert">{error}</span>
        </Notice>
      )}
      <ScheduleResourceState
        skeleton="table"
        status={resource.status}
        errorMessage={resource.errorMessage}
        onRetry={resource.reload}
      >
        {years.length === 0 ? (
          <Notice tone="warning">Chưa có năm thi. Tạo năm thi đầu tiên để thêm các đợt thi.</Notice>
        ) : (
          <div className="flex flex-col gap-4">
            {years.map((year) => (
              <ExamYearCard
                key={year.id}
                year={year}
                readOnly={readOnly}
                busy={busy}
                onChangeStatus={(status) => void changeStatus(year, status)}
                onEditYear={() => setYearEditor({ year })}
                onDeleteYear={() => {
                  setError('')
                  setDeleting({ kind: 'year', year })
                }}
                onAddSession={() => setSessionEditor({ year, session: null })}
                onEditSession={(session) => setSessionEditor({ year, session })}
                onDeleteSession={(session) => {
                  setError('')
                  setDeleting({ kind: 'session', year, session })
                }}
              />
            ))}
          </div>
        )}
      </ScheduleResourceState>

      {yearEditor && (
        <ExamYearEditorDialog
          key={yearEditor.year?.id ?? 'new'}
          year={yearEditor.year}
          onClose={() => setYearEditor(null)}
          onSaved={() => {
            setYearEditor(null)
            setNotice('Đã lưu năm thi.')
            resource.reload()
          }}
        />
      )}
      {sessionEditor && (
        <ExamSessionEditorDialog
          key={sessionEditor.session?.id ?? `new-${sessionEditor.year.id}`}
          year={sessionEditor.year}
          session={sessionEditor.session}
          onClose={() => setSessionEditor(null)}
          onSaved={() => {
            setSessionEditor(null)
            setNotice('Đã lưu đợt thi.')
            resource.reload()
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={deleting.kind === 'year' ? 'Xóa năm thi?' : 'Xóa đợt thi?'}
          description={
            <>
              <strong>
                {deleting.kind === 'year'
                  ? deleting.year.name
                  : `${deleting.year.name} · ${deleting.session.name}`}
              </strong>
              . Chỉ xóa được khi chưa có khóa học nào gắn vào.
              {error && (
                <span role="alert" className="mt-2 block text-danger">
                  {error}
                </span>
              )}
            </>
          }
          cancelLabel="Hủy"
          confirmLabel={deleting.kind === 'year' ? 'Xóa năm thi' : 'Xóa đợt thi'}
          variant="danger"
          busy={busy}
          busyLabel="Đang xóa..."
          onCancel={() => {
            if (!busy) setDeleting(null)
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </section>
  )
}

interface ExamYearCardProps {
  year: ExamYear
  readOnly: boolean
  busy: boolean
  onChangeStatus: (status: ExamYearStatus) => void
  onEditYear: () => void
  onDeleteYear: () => void
  onAddSession: () => void
  onEditSession: (session: ExamSession) => void
  onDeleteSession: (session: ExamSession) => void
}

function ExamYearCard({
  year,
  readOnly,
  busy,
  onChangeStatus,
  onEditYear,
  onDeleteYear,
  onAddSession,
  onEditSession,
  onDeleteSession,
}: ExamYearCardProps) {
  // A closed year is history: it starts folded so the open years stay on screen.
  const [open, setOpen] = useState(year.status !== 'CLOSED')
  const courseCount = year.sessions.reduce((total, session) => total + session.courseCount, 0)
  const columns = useMemo<ColumnDef<ExamSession>[]>(
    () => [
      {
        id: 'name',
        header: 'Đợt',
        enableSorting: false,
        meta: { className: 'w-28' },
        cell: ({ row }) => <span className="font-medium text-text-primary">{row.original.name}</span>,
      },
      {
        id: 'date',
        header: 'Ngày thi',
        enableSorting: false,
        meta: { className: 'w-72' },
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-2 whitespace-nowrap">
            {examDateRange(row.original)}
            <Status tone={row.original.dateConfirmed ? 'success' : 'warning'}>
              {row.original.dateConfirmed ? 'Đã công bố' : 'Dự kiến'}
            </Status>
          </span>
        ),
      },
      {
        id: 'registration',
        header: 'Đăng ký dự thi',
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap">{registrationRange(row.original)}</span>,
      },
      {
        id: 'courses',
        header: 'Khóa học',
        enableSorting: false,
        meta: { className: 'w-24' },
        cell: ({ row }) => <span className="tabular-nums">{row.original.courseCount}</span>,
      },
      ...(readOnly
        ? []
        : [
            {
              id: 'actions',
              header: 'Thao tác',
              enableSorting: false,
              meta: { className: 'w-28 text-right' },
              cell: ({ row }) => (
                <RowActions>
                  <IconAction label="Sửa đợt thi" icon={Pencil} disabled={busy} onClick={() => onEditSession(row.original)} />
                  <IconAction
                    label="Xóa đợt thi"
                    icon={Trash2}
                    variant="danger"
                    disabled={busy || row.original.courseCount > 0}
                    onClick={() => onDeleteSession(row.original)}
                  />
                </RowActions>
              ),
            } satisfies ColumnDef<ExamSession>,
          ]),
    ],
    [busy, readOnly, onEditSession, onDeleteSession]
  )

  return (
    <article className="overflow-hidden rounded-xl border border-card-border bg-card-background">
      <header className="flex flex-wrap items-center gap-3 px-5 py-4">
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? `Thu gọn ${year.name}` : `Mở ${year.name}`}
          onClick={() => setOpen((current) => !current)}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-icon-primary hover:bg-background-gray-secondary"
        >
          <ChevronDown size={18} aria-hidden="true" className={cn('transition-transform', !open && '-rotate-90')} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-base font-semibold text-text-primary">{year.name}</h2>
          <p className="text-sm text-text-tertiary">
            {year.sessions.length} đợt thi · {courseCount} khóa học
            {year.note ? ` · ${year.note}` : ''}
          </p>
        </div>
        {readOnly ? (
          <Status tone={EXAM_YEAR_STATUS_TONES[year.status]}>{EXAM_YEAR_STATUS_LABELS[year.status]}</Status>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <SelectField
              ariaLabel={`Trạng thái ${year.name}`}
              value={year.status}
              onChange={(value) => onChangeStatus(value as ExamYearStatus)}
              disabled={busy}
              options={STATUS_OPTIONS}
              className="w-40"
              triggerClassName="h-9"
            />
            <Button size="sm" appearance="outline" disabled={busy} onClick={onAddSession}>
              <Plus size={14} />
              Thêm đợt
            </Button>
            <RowActions>
              <IconAction label="Sửa năm thi" icon={Pencil} disabled={busy} onClick={onEditYear} />
              <IconAction label="Xóa năm thi" icon={Trash2} variant="danger" disabled={busy} onClick={onDeleteYear} />
            </RowActions>
          </div>
        )}
      </header>
      {open && (
        <div className="border-t border-card-border">
          {year.sessions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-text-tertiary">Năm thi này chưa có đợt thi.</p>
          ) : (
            // Fixed column widths so the rounds of every year line up from card to card.
            <div className="overflow-x-auto [&_table]:w-full [&_table]:min-w-[44rem] [&_table]:table-fixed">
              <DataTable columns={columns} data={year.sessions} getRowKey={(session) => session.id} />
            </div>
          )}
        </div>
      )}
    </article>
  )
}
