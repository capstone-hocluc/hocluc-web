import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import PageHeading from '../../console/page-heading'
import Panel from '../../console/panel'
import SelectField from '../../console/select-field'
import Status from '../../console/status'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import { Pencil, Plus, Trash2 } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
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

/** Exam years (Năm thi 2026-2027, ...) and their sittings. MAIN courses pick a sitting from here. */
export default function ExamYearManagement({
  readOnly = false,
  title,
}: {
  readOnly?: boolean
  title: string
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
        subtitle="Mỗi năm thi gồm các đợt thi (Đợt 1, Đợt 2). Khóa trọn bộ chọn đợt thi để lấy ngày thi."
        readOnly={readOnly}
        action={
          !readOnly && (
            <Button
              onClick={() => setYearEditor({ year: null })}
              disabled={busy || resource.status !== 'ready'}
            >
              <Plus size={16} />
              Tạo năm thi
            </Button>
          )
        }
      />
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
        {(resource.data ?? []).length === 0 ? (
          <Notice tone="warning">
            Chưa có năm thi. Tạo năm thi đầu tiên để gắn ngày thi cho khóa học.
          </Notice>
        ) : (
          <div className="flex flex-col gap-5">
            {(resource.data ?? []).map((year) => (
              <ExamYearPanel
                key={year.id}
                year={year}
                readOnly={readOnly}
                busy={busy}
                onStatus={(status) => void changeStatus(year, status)}
                onEdit={() => setYearEditor({ year })}
                onDelete={() => {
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

interface PanelProps {
  year: ExamYear
  readOnly: boolean
  busy: boolean
  onStatus: (status: ExamYearStatus) => void
  onEdit: () => void
  onDelete: () => void
  onAddSession: () => void
  onEditSession: (session: ExamSession) => void
  onDeleteSession: (session: ExamSession) => void
}

function ExamYearPanel({
  year,
  readOnly,
  busy,
  onStatus,
  onEdit,
  onDelete,
  onAddSession,
  onEditSession,
  onDeleteSession,
}: PanelProps) {
  const columns = useMemo<ColumnDef<ExamSession>[]>(
    () => [
      {
        id: 'name',
        header: 'Đợt',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium text-text-primary">{row.original.name}</span>
        ),
      },
      {
        id: 'date',
        header: 'Ngày thi',
        enableSorting: false,
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
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{registrationRange(row.original)}</span>
        ),
      },
      {
        id: 'courses',
        header: 'Khóa học',
        enableSorting: false,
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
                  <IconAction
                    label="Sửa"
                    icon={Pencil}
                    disabled={busy}
                    onClick={() => onEditSession(row.original)}
                  />
                  <IconAction
                    label="Xóa"
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
    <Panel
      title={
        <span className="flex flex-wrap items-center gap-3">
          {year.name}
          <Status tone={EXAM_YEAR_STATUS_TONES[year.status]}>
            {EXAM_YEAR_STATUS_LABELS[year.status]}
          </Status>
        </span>
      }
      action={
        readOnly ? undefined : (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
            <SelectField
              ariaLabel={`Trạng thái ${year.name}`}
              value={year.status}
              onChange={(value) => onStatus(value as ExamYearStatus)}
              disabled={busy}
              options={STATUS_OPTIONS}
              className="min-w-40"
            />
            <IconAction label="Sửa năm thi" icon={Pencil} disabled={busy} onClick={onEdit} />
            <IconAction
              label="Xóa năm thi"
              icon={Trash2}
              variant="danger"
              disabled={busy}
              onClick={onDelete}
            />
          </div>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {year.note && <p className="text-sm text-text-secondary">{year.note}</p>}
        <DataTable
          columns={columns}
          data={year.sessions}
          getRowKey={(session) => session.id}
          emptyMessage="Năm thi này chưa có đợt thi."
        />
        {!readOnly && (
          <div>
            <Button appearance="outline" onClick={onAddSession} disabled={busy}>
              <Plus size={16} />
              Thêm đợt thi
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}
