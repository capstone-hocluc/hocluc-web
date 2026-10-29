import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { can } from '../../../lib/permissions'
import { getErrorMessage } from '../../../lib/errors'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  BANK_ANSWER_SOURCES,
  bulkApproveBankQuestions,
  type BankBulkApproveResult,
  NO_SUBJECT,
  getBankPatterns,
  getBankQuestions,
  getBankStats,
  getBankScopes,
  type BankQuestionStatus,
  type BankDifficulty,
  type BankAnswerSource,
  type BankQuestionQuery,
  type BankQuestionRow,
} from '../../../services/questionBankService'
import Button from '../../console/button'
import DataTable from '../../console/data-table'
import Notice from '../../console/notice'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from '../../console/filter-toolbar'
import { AlertTriangle, Eye, FileQuestion, ListTree } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import Status from '../../console/status'
import { Checkbox } from '../../tailgrids/core/checkbox'
import { Pagination } from '../../tailgrids/core/pagination'
import { Skeleton } from '../../tailgrids/core/skeleton'
import MathText from '../../ui/MathText'
import {
  ConsoleTabs,
  ConsoleTabsContent,
  ConsoleTabsList,
  ConsoleTabsTrigger,
} from '../../console/tabs'
import StatCard from '../../ui/StatCard'
import BankSourcesPanel from './BankSourcesPanel'
import BankQuestionEditorScreen from './BankQuestionEditorScreen'
import QuestionBankDetail from './QuestionBankDetail'
import {
  BANK_STATUS_LABELS,
  BANK_STATUS_TONES,
  BANK_DIFFICULTY_LABELS,
  ANSWER_SOURCE_LABELS,
  ANSWER_SOURCE_TONES,
  confidenceText,
  examName,
  partLabel,
} from './question-bank-labels'

const number = new Intl.NumberFormat('vi-VN')

function StatsSkeleton() {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-label="Đang tải thống kê"
    >
      {[0, 1, 2].map((tile) => (
        <div
          key={tile}
          className="flex items-center gap-3 rounded-2xl border border-card-border bg-card-background p-4"
        >
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SubjectFilter({
  options, value, loading, onChange,
}: {
  options: { id: string; label: string }[]
  value: string
  loading: boolean
  onChange: (value: string) => void
}) {
  if (loading) return (
    <div className="flex flex-wrap gap-2 border-b border-card-border px-4 py-3" role="status" aria-label="Đang tải môn">
      {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-9 w-32 rounded-lg" />)}
    </div>
  )
  return (
    <div role="group" aria-label="Lọc theo môn" className="flex flex-wrap gap-2 border-b border-card-border px-4 py-3">
      {options.map((option) => (
        <Button key={option.id} size="sm" appearance={value === option.id ? 'fill' : 'outline'}
          aria-pressed={value === option.id} onClick={() => onChange(option.id)}>
          {option.label}
        </Button>
      ))}
    </div>
  )
}

export default function QuestionBankScreen({ readOnly = false }: { readOnly?: boolean }) {
  const { profile } = useCurrentUser()
  const legacyReadOnly = readOnly || !profile || !can(profile.role, 'QUIZ_WRITE')
  const [query, setQuery] = useState<BankQuestionQuery>({ page: 0, size: 20 })
  const [search, setSearch] = useState('')
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ id: string | null } | null>(null)
  const scopes = useScheduleResource('bank-scopes', getBankScopes)
  const canReview = Boolean(scopes.data && (scopes.data.administrator || scopes.data.reviewerSubjectIds.length > 0))
  const [reviewQuery, setReviewQuery] = useState<BankQuestionQuery>({ reviewable: true, page: 0, size: 20 })
  const [selected, setSelected] = useState<string[]>([])
  const [bulkResult, setBulkResult] = useState<BankBulkApproveResult | null>(null)
  const [bulkError, setBulkError] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)

  const stats = useScheduleResource('bank-stats', getBankStats)
  const patterns = useScheduleResource('bank-patterns', getBankPatterns)
  const list = useScheduleResource(`bank-questions:${JSON.stringify(query)}`, () =>
    getBankQuestions(query)
  )

  const reviewList = useScheduleResource(
    canReview ? `bank-reviewable:${JSON.stringify(reviewQuery)}` : null,
    () => getBankQuestions(reviewQuery)
  )

  function refreshLists() {
    list.reload()
    reviewList.reload()
    stats.reload()
  }

  async function bulkApprove() {
    if (!selected.length || bulkBusy) return
    setBulkBusy(true)
    setBulkError('')
    setBulkResult(null)
    try {
      const result = await bulkApproveBankQuestions(selected)
      setBulkResult(result)
      setSelected([])
      refreshLists()
    } catch (reason) {
      setBulkError(getErrorMessage(reason))
    } finally {
      setBulkBusy(false)
    }
  }

  const patternList = useMemo(() => patterns.data ?? [], [patterns.data])
  // the patterns of the chosen subject's master data: a question is only ever labelled with its own subject's
  const patternOptions = useMemo(
    () => patternList.filter((p) => query.subject && query.subject !== NO_SUBJECT && p.categoryId === query.subject),
    [patternList, query.subject]
  )
  const subjectOptions = useMemo(() => {
    const subjects = stats.data?.bySubject ?? []
    const known = subjects.filter((subject) => subject.id !== null)
    const unknown = subjects.filter((subject) => subject.id === null)
    return [
      { id: 'ALL', label: `Tất cả môn (${number.format(stats.data?.total ?? 0)})` },
      ...[...known, ...unknown].map((subject) => ({
        id: subject.id ?? NO_SUBJECT,
        label: `${subject.id === null ? 'Chưa xác định môn' : subject.name ?? 'Chưa xác định môn'} (${number.format(subject.count)})`,
      })),
    ]
  }, [stats.data])

  const columns = useMemo<ColumnDef<BankQuestionRow>[]>(
    () => [
      {
        id: 'source',
        header: 'Câu',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-28">
            <strong className="block font-medium text-text-primary">
              {examName(row.original)}
            </strong>
            <span className="mt-1 block truncate text-xs text-text-tertiary">
              {row.original.sourceTitle}
            </span>
          </div>
        ),
      },
      {
        id: 'text',
        header: 'Nội dung',
        enableSorting: false,
        cell: ({ row }) => (
          <p className="m-0 line-clamp-2 max-w-md min-w-56 break-words text-text-primary">
            <MathText>{row.original.text}</MathText>
          </p>
        ),
      },
      {
        id: 'label',
        header: 'Nhãn',
        enableSorting: false,
        cell: ({ row }) => {
          const label = row.original.label
          return label ? (
            <div className="min-w-40">
              <span className="block font-medium text-text-primary">
                {partLabel(label.partCode)}
              </span>
              <span className="mt-1 block max-w-60 truncate text-xs text-text-tertiary">
                {label.patternNameVi ?? label.patternCode}
              </span>
            </div>
          ) : (
            <Status tone="warning">Chưa gán</Status>
          )
        },
      },
      { id: 'status', header: 'Trạng thái', enableSorting: false, cell: ({ row }) => row.original.status ? <Status tone={BANK_STATUS_TONES[row.original.status]}>{BANK_STATUS_LABELS[row.original.status]}</Status> : '—' },
      {
        id: 'answerSource',
        header: 'Đáp án',
        enableSorting: false,
        cell: ({ row }) => (
          <Status tone={ANSWER_SOURCE_TONES[row.original.answerSource]}>
            {ANSWER_SOURCE_LABELS[row.original.answerSource]}
          </Status>
        ),
      },
      {
        id: 'confidence',
        header: 'Tin cậy',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 whitespace-nowrap">
            {row.original.label && <span>{confidenceText(row.original.label)}</span>}
            {row.original.reviewNeeded && <Status tone="warning">Cần duyệt</Status>}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        meta: { className: 'w-20 text-right' },
        cell: ({ row }) => (
          <RowActions>
            <IconAction
              label="Chi tiết"
              icon={Eye}
              onClick={() => setSelectedId(row.original.id)}
            />
          </RowActions>
        ),
      },
    ],
    []
  )

  const reviewColumns = useMemo<ColumnDef<BankQuestionRow>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => {
        const ids = table.getRowModel().rows.map((row) => row.original.id)
        const selectedCount = ids.filter((id) => selected.includes(id)).length
        return (
          <Checkbox
            aria-label="Chọn tất cả"
            isSelected={ids.length > 0 && selectedCount === ids.length}
            isIndeterminate={selectedCount > 0 && selectedCount < ids.length}
            isDisabled={ids.length === 0}
            onChange={(checked) => setSelected((current) =>
              checked ? [...new Set([...current, ...ids])] : current.filter((id) => !ids.includes(id))
            )}
          />
        )
      },
      enableSorting: false,
      cell: ({ row }) => (
        <span onClick={(event) => event.stopPropagation()}>
          <Checkbox
            aria-label={`Chọn ${examName(row.original)}`}
            isSelected={selected.includes(row.original.id)}
            onChange={(checked) => {
              const id = row.original.id
              setSelected((current) =>
                checked ? [...new Set([...current, id])] : current.filter((item) => item !== id)
              )
            }}
          />
        </span>
      ),
    },
    ...columns,
  ], [columns, selected])

  const total = stats.data?.total ?? 0
  const years = Object.keys(stats.data?.byYear ?? {})

  const subjectTotal = query.subject
    ? stats.data?.bySubject.find((subject) => (subject.id ?? NO_SUBJECT) === query.subject)?.count ?? 0
    : total
  const moreFilterCount = Number(query.year !== undefined) + Number(Boolean(query.answerSource)) + Number(Boolean(query.mine))
  const hasFilters = Boolean(search || query.q || query.subject || query.status || query.difficulty || query.patternCode || query.unlabelled || moreFilterCount)

  if (editor) return <BankQuestionEditorScreen id={editor.id} onBack={() => { setEditor(null); refreshLists() }} />

  return (
    <ConsoleTabs defaultValue="questions">
      <ConsoleTabsList aria-label="Ngân hàng câu hỏi">
        <ConsoleTabsTrigger value="questions">Câu hỏi</ConsoleTabsTrigger>
        {canReview && <ConsoleTabsTrigger value="review">Chờ duyệt</ConsoleTabsTrigger>}
        <ConsoleTabsTrigger value="sources">Đề đã nạp</ConsoleTabsTrigger>
      </ConsoleTabsList>

      {canReview && (
        <ConsoleTabsContent value="review">
          <div className="flex justify-end">
            <Button disabled={!selected.length || bulkBusy} onClick={bulkApprove}>Duyệt đã chọn</Button>
          </div>
          {bulkError && <Notice tone="danger">{bulkError}</Notice>}
          {bulkResult && (
            <div className="flex flex-col gap-2">
              <Notice>Đã duyệt {number.format(bulkResult.approved.length)} câu.</Notice>
              {bulkResult.skipped.map((item) => (
                <Notice key={item.id} tone="warning">{item.id}: {item.reason}</Notice>
              ))}
            </div>
          )}
          <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
            <SubjectFilter
              options={subjectOptions}
              value={reviewQuery.subject ?? 'ALL'}
              loading={stats.status === 'loading' || stats.status === 'idle'}
              onChange={(value) => {
                setSelected([])
                setReviewQuery((old) => ({ ...old, subject: value === 'ALL' ? undefined : value, page: 0 }))
              }}
            />
            <ScheduleResourceState skeleton="table" inset status={reviewList.status} errorMessage={reviewList.errorMessage} onRetry={reviewList.reload}>
              <DataTable
                columns={reviewColumns}
                data={reviewList.data?.content ?? []}
                getRowKey={(row) => row.id}
                onRowClick={(row) => setSelectedId(row.id)}
                emptyMessage="Không có câu hỏi chờ duyệt."
              />
              <div className="flex flex-col gap-3 border-t border-card-border px-5 py-4">
                <p className="m-0 text-sm text-text-tertiary">{number.format(reviewList.data?.totalElements ?? 0)} câu</p>
                {(reviewList.data?.totalPages ?? 0) > 1 && (
                  <Pagination
                    currentPage={(reviewQuery.page ?? 0) + 1}
                    totalPages={reviewList.data?.totalPages ?? 1}
                    onPageChange={(page) => {
                      setSelected([])
                      setReviewQuery((old) => ({ ...old, page: page - 1 }))
                    }}
                    sideLayout="icon"
                  />
                )}
              </div>
            </ScheduleResourceState>
          </section>
        </ConsoleTabsContent>
      )}

      <ConsoleTabsContent value="sources">
        <BankSourcesPanel
          readOnly={legacyReadOnly}
          onFinished={() => {
            list.reload()
            stats.reload()
            patterns.reload()
          }}
        />
      </ConsoleTabsContent>

      <ConsoleTabsContent value="questions">
        {!readOnly && scopes.data && (scopes.data.administrator || scopes.data.authorSubjectIds.length > 0) && <div className="flex justify-end"><Button onClick={() => setEditor({ id: null })}>Soạn câu</Button></div>}
        {stats.status === 'loading' || stats.status === 'idle' ? (
          <StatsSkeleton />
        ) : stats.data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Tổng số câu"
              value={number.format(subjectTotal)}
              icon={FileQuestion}
            />
            <StatCard
              label="Cần duyệt (toàn bộ)"
              value={number.format(stats.data.needsReview)}
              icon={AlertTriangle}
              tone="warning"
            />
            <StatCard
              label="Chưa gán nhãn (toàn bộ)"
              value={number.format(stats.data.unlabelled)}
              icon={ListTree}
              tone="danger"
            />
          </div>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
          <SubjectFilter
            options={subjectOptions}
            value={query.subject ?? 'ALL'}
            loading={stats.status === 'loading' || stats.status === 'idle'}
            onChange={(value) => setQuery((old) => ({
              ...old, subject: value === 'ALL' ? undefined : value, patternCode: undefined, unlabelled: undefined, page: 0,
            }))}
          />
          <FilterToolbar className="justify-start">
            <form
              className="w-full sm:w-48 xl:flex-1 xl:min-w-40"
              onSubmit={(event) => {
                event.preventDefault()
                setQuery((old) => ({ ...old, q: search.trim() || undefined, page: 0 }))
              }}
            >
              <SearchInput
                ariaLabel="Tìm trong nội dung câu hỏi"
                placeholder="Tìm trong nội dung... (Enter để tìm)"
                maxLength={100}
                value={search}
                onChange={setSearch}
                className="sm:max-w-none"
              />
            </form>
            <FilterGroup>
              <FilterSelect ariaLabel="Lọc theo trạng thái" className="w-36 sm:w-36" value={query.status ?? 'ALL'} onChange={value => setQuery(old => ({ ...old, status: value === 'ALL' ? undefined : value as BankQuestionStatus, page: 0 }))} options={[{ id: 'ALL', label: 'Mọi trạng thái' }, ...Object.entries(BANK_STATUS_LABELS).map(([id, label]) => ({ id, label }))]} />
              <FilterSelect
                ariaLabel="Lọc theo dạng câu"
                className="w-36 sm:w-40"
                value={query.unlabelled ? 'UNLABELLED' : query.patternCode ?? 'ALL'}
                disabled={!query.subject || patterns.status !== 'ready'}
                onChange={(value) => setQuery((old) => ({
                  ...old,
                  patternCode: value === 'ALL' || value === 'UNLABELLED' ? undefined : value,
                  unlabelled: value === 'UNLABELLED' || undefined,
                  page: 0,
                }))}
                options={[
                  { id: 'ALL', label: 'Tất cả dạng câu' },
                  { id: 'UNLABELLED', label: 'Chưa gán nhãn' },
                  ...patternOptions.map((p) => ({ id: p.code, label: p.nameVi })),
                ]}
              />
              <FilterSelect ariaLabel="Lọc theo độ khó" className="w-36 sm:w-36" value={query.difficulty ?? 'ALL'} onChange={value => setQuery(old => ({ ...old, difficulty: value === 'ALL' ? undefined : value as BankDifficulty, page: 0 }))} options={[{ id: 'ALL', label: 'Mọi độ khó' }, ...Object.entries(BANK_DIFFICULTY_LABELS).map(([id, label]) => ({ id, label }))]} />
              <Button appearance="outline" size="sm" aria-label={moreFilterCount ? `Bộ lọc khác (${moreFilterCount})` : 'Bộ lọc khác'} aria-expanded={moreFiltersOpen} aria-controls="bank-more-filters" onClick={() => setMoreFiltersOpen((open) => !open)}>
                Bộ lọc khác{moreFilterCount > 0 && <span className="rounded-full bg-background-gray-secondary px-1.5 text-xs">{moreFilterCount}</span>}
              </Button>
              {hasFilters && <Button appearance="ghost" size="sm" onClick={() => { setSearch(''); setQuery({ page: 0, size: 20 }) }}>Xóa bộ lọc</Button>}
            </FilterGroup>
          </FilterToolbar>
          {moreFiltersOpen && <div id="bank-more-filters" className="flex flex-wrap gap-2 border-b border-card-border px-4 py-3">
            <FilterSelect
              ariaLabel="Lọc theo năm"
              value={query.year === undefined ? 'ALL' : String(query.year)}
              disabled={stats.status !== 'ready'}
              className="w-36 sm:w-36"
              onChange={(value) => setQuery((old) => ({ ...old, year: value === 'ALL' ? undefined : Number(value), page: 0 }))}
              options={[{ id: 'ALL', label: 'Tất cả năm' }, ...years.map((year) => ({ id: year, label: year }))]}
            />
            <FilterSelect
              ariaLabel="Lọc theo nguồn đáp án"
              value={query.answerSource ?? 'ALL'}
              onChange={(value) => setQuery((old) => ({ ...old, answerSource: value === 'ALL' ? undefined : value as BankAnswerSource, page: 0 }))}
              options={[{ id: 'ALL', label: 'Mọi nguồn đáp án' }, ...BANK_ANSWER_SOURCES.map((id) => ({ id, label: ANSWER_SOURCE_LABELS[id] }))]}
            />
            <FilterSelect ariaLabel="Lọc câu của tôi" value={query.mine ? 'MINE' : 'ALL'} onChange={value => setQuery(old => ({ ...old, mine: value === 'MINE' ? true : undefined, page: 0 }))} options={[{ id: 'ALL', label: 'Mọi tác giả' }, { id: 'MINE', label: 'Câu của tôi' }]} />
          </div>}
          <ScheduleResourceState
            skeleton="table"
            inset
            status={list.status}
            errorMessage={list.errorMessage}
            onRetry={list.reload}
          >
            <DataTable
              columns={columns}
              data={list.data?.content ?? []}
              getRowKey={(row) => row.id}
              onRowClick={(row) => setSelectedId(row.id)}
              emptyMessage={
                total === 0 ? 'Ngân hàng chưa có câu hỏi nào.' : 'Không có câu hỏi phù hợp.'
              }
            />
            <div className="flex flex-col gap-3 border-t border-card-border px-5 py-4">
              <p className="m-0 text-sm text-text-tertiary">
                {number.format(list.data?.totalElements ?? 0)} câu
              </p>
              {(list.data?.totalPages ?? 0) > 1 && (
                <Pagination
                  currentPage={(query.page ?? 0) + 1}
                  totalPages={list.data?.totalPages ?? 1}
                  onPageChange={(page) => setQuery((old) => ({ ...old, page: page - 1 }))}
                  sideLayout="icon"
                />
              )}
            </div>
          </ScheduleResourceState>
        </section>

      </ConsoleTabsContent>
      <QuestionBankDetail
          id={selectedId}
          patterns={patternList}
          readOnly={readOnly}
          legacyReadOnly={legacyReadOnly}
          onClose={() => setSelectedId(null)}
          onEdit={(id) => { setSelectedId(null); setEditor({ id }) }}
          onChanged={() => {
            refreshLists()
          }}
        />
    </ConsoleTabs>
  )
}
