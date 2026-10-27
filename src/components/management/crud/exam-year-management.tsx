import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import Notice from '../../console/notice'
import ConfirmDialog from '../../console/confirm-dialog'
import PageHeading from '../../console/page-heading'
import SelectField from '../../console/select-field'
import Status from '../../console/status'
import { FilterToolbar } from '../../console/filter-toolbar'
import {
  ConsoleTabs,
  ConsoleTabsContent,
  ConsoleTabsList,
  ConsoleTabsTrigger,
} from '../../console/tabs'
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
  const [managementTab, setManagementTab] = useState<'sessions' | 'years'>('sessions')
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null)
  const years = resource.data ?? []
  const selectedYear =
    years.find((year) => year.id === selectedYearId) ?? years[0] ?? null
  const yearOptions = years.map((year) => ({
    id: year.id,
    label: `${year.name} · ${EXAM_YEAR_STATUS_LABELS[year.status]}`,
  }))
  const yearColumns: ColumnDef<ExamYear>[] = [
    {
      id: 'name',
      header: 'Năm thi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-text-primary">{row.original.name}</span>
          {row.original.note && (
            <span className="line-clamp-1 text-xs text-text-secondary">{row.original.note}</span>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      enableSorting: false,
      cell: ({ row }) =>
        readOnly ? (
          <Status tone={EXAM_YEAR_STATUS_TONES[row.original.status]}>
            {EXAM_YEAR_STATUS_LABELS[row.original.status]}
          </Status>
        ) : (
          <SelectField
            ariaLabel={`Trạng thái ${row.original.name}`}
            value={row.original.status}
            onChange={(value) => void changeStatus(row.original, value as ExamYearStatus)}
            disabled={busy}
            options={STATUS_OPTIONS}
            className="min-w-40"
          />
        ),
    },
    {
      id: 'sessions',
      header: 'Số đợt thi',
      enableSorting: false,
      cell: ({ row }) => <span className="tabular-nums">{row.original.sessions.length}</span>,
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
                  label="Sửa năm thi"
                  icon={Pencil}
                  disabled={busy}
                  onClick={() => setYearEditor({ year: row.original })}
                />
                <IconAction
                  label="Xóa năm thi"
                  icon={Trash2}
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    setError('')
                    setDeleting({ kind: 'year', year: row.original })
                  }}
                />
              </RowActions>
            ),
          } satisfies ColumnDef<ExamYear>,
        ]),
  ]

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
              onClick={() => {
                if (managementTab === 'sessions' && selectedYear) {
                  setSessionEditor({ year: selectedYear, session: null })
                } else {
                  setYearEditor({ year: null })
                }
              }}
              disabled={busy || resource.status !== 'ready'}
            >
              <Plus size={16} />
              {managementTab === 'sessions' && selectedYear ? 'Thêm đợt thi' : 'Tạo năm thi'}
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
        <ConsoleTabs
          value={managementTab}
          onValueChange={(value) => setManagementTab(value as 'sessions' | 'years')}
        >
          <ConsoleTabsList aria-label="Quản lý năm và đợt thi">
            <ConsoleTabsTrigger value="sessions">Đợt thi</ConsoleTabsTrigger>
            <ConsoleTabsTrigger value="years">Năm thi</ConsoleTabsTrigger>
          </ConsoleTabsList>

          <ConsoleTabsContent value="sessions">
            {selectedYear ? (
              <ExamYearPanel
                year={selectedYear}
                yearOptions={yearOptions}
                onSelectYear={setSelectedYearId}
                readOnly={readOnly}
                busy={busy}
                onEditSession={(session) => setSessionEditor({ year: selectedYear, session })}
                onDeleteSession={(session) => {
                  setError('')
                  setDeleting({ kind: 'session', year: selectedYear, session })
                }}
              />
            ) : (
              <Notice tone="warning">
                Chưa có năm thi. Tạo năm thi đầu tiên để thêm các đợt thi.
              </Notice>
            )}
          </ConsoleTabsContent>

          <ConsoleTabsContent value="years">
            <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
              <FilterToolbar>
                <span className="text-sm font-medium text-text-primary">Danh sách năm thi</span>
                <span className="text-sm text-text-tertiary">{years.length} năm thi</span>
              </FilterToolbar>
              <DataTable
                columns={yearColumns}
                data={years}
                getRowKey={(year) => year.id}
                onRowClick={(year) => setSelectedYearId(year.id)}
                emptyMessage="Chưa có năm thi. Tạo năm thi đầu tiên để cấu hình lịch thi."
              />
            </section>
          </ConsoleTabsContent>
        </ConsoleTabs>
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
  yearOptions: { id: string; label: string }[]
  onSelectYear: (yearId: string) => void
  readOnly: boolean
  busy: boolean
  onEditSession: (session: ExamSession) => void
  onDeleteSession: (session: ExamSession) => void
}

function ExamYearPanel({
  year,
  yearOptions,
  onSelectYear,
  readOnly,
  busy,
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
    <div className="flex flex-col gap-4">
      {year.note && <p className="text-sm text-text-secondary">{year.note}</p>}
      <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
        <FilterToolbar>
          <SelectField
            ariaLabel="Chọn năm thi"
            value={year.id}
            onChange={onSelectYear}
            options={yearOptions}
            className="w-full sm:w-64"
          />
          <span className="text-sm text-text-tertiary">{year.sessions.length} đợt thi</span>
        </FilterToolbar>
        <DataTable
          columns={columns}
          data={year.sessions}
          getRowKey={(session) => session.id}
          emptyMessage="Năm thi này chưa có đợt thi."
        />
      </section>
    </div>
  )
}
