import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useScheduleResource } from '../../../hooks/useScheduleResource'
import {
  BANK_ANSWER_SOURCES,
  NO_SUBJECT,
  getBankPatterns,
  getBankQuestions,
  getBankStats,
  type BankAnswerSource,
  type BankQuestionQuery,
  type BankQuestionRow,
} from '../../../services/questionBankService'
import DataTable from '../../console/data-table'
import { FilterGroup, FilterSelect, FilterToolbar, SearchInput } from '../../console/filter-toolbar'
import { AlertTriangle, BadgeCheck, Eye, FileQuestion, ListTree } from '../../console/icons'
import { IconAction, RowActions } from '../../console/icon-action'
import ScheduleResourceState from '../../console/schedule/schedule-resource-state'
import Status from '../../console/status'
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
import QuestionBankDetail from './QuestionBankDetail'
import {
  ANSWER_SOURCE_LABELS,
  ANSWER_SOURCE_TONES,
  confidenceText,
  examName,
  partLabel,
} from './question-bank-labels'

type View = 'ALL' | 'REVIEW' | 'UNLABELLED'

const VIEW_OPTIONS: { id: View; label: string }[] = [
  { id: 'ALL', label: 'Tất cả câu' },
  { id: 'REVIEW', label: 'Cần duyệt' },
  { id: 'UNLABELLED', label: 'Chưa gán nhãn' },
]

const number = new Intl.NumberFormat('vi-VN')

function StatsSkeleton() {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      role="status"
      aria-label="Đang tải thống kê"
    >
      {[0, 1, 2, 3].map((tile) => (
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

export default function QuestionBankScreen({ readOnly = false }: { readOnly?: boolean }) {
  const [query, setQuery] = useState<BankQuestionQuery>({ page: 0, size: 20 })
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const stats = useScheduleResource('bank-stats', getBankStats)
  const patterns = useScheduleResource('bank-patterns', getBankPatterns)
  const list = useScheduleResource(`bank-questions:${JSON.stringify(query)}`, () =>
    getBankQuestions(query)
  )

  const patternList = useMemo(() => patterns.data ?? [], [patterns.data])
  // the patterns of the chosen subject's master data: a question is only ever labelled with its own subject's
  const patternOptions = useMemo(
    () => patternList.filter((p) => !query.subject || query.subject === NO_SUBJECT || p.categoryId === query.subject),
    [patternList, query.subject]
  )
  const subjectOptions = useMemo(
    () =>
      (stats.data?.bySubject ?? []).map((s) => ({
        id: s.id ?? NO_SUBJECT,
        label: `${s.name ?? 'Chưa xác định môn'} (${number.format(s.count)})`,
      })),
    [stats.data]
  )

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
            <span>{confidenceText(row.original.label)}</span>
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

  const total = stats.data?.total ?? 0
  const years = Object.keys(stats.data?.byYear ?? {})

  function changeView(next: View) {
    setView(next)
    setQuery((old) => ({
      ...old,
      needsReview: next === 'REVIEW' || undefined,
      unlabelled: next === 'UNLABELLED' || undefined,
      page: 0,
    }))
  }

  return (
    <ConsoleTabs defaultValue="questions">
      <ConsoleTabsList aria-label="Ngân hàng câu hỏi">
        <ConsoleTabsTrigger value="questions">Câu hỏi</ConsoleTabsTrigger>
        <ConsoleTabsTrigger value="sources">Đề đã nạp</ConsoleTabsTrigger>
      </ConsoleTabsList>

      <ConsoleTabsContent value="sources">
        <BankSourcesPanel
          readOnly={readOnly}
          onFinished={() => {
            list.reload()
            stats.reload()
            patterns.reload()
          }}
        />
      </ConsoleTabsContent>

      <ConsoleTabsContent value="questions">
        {stats.status === 'loading' || stats.status === 'idle' ? (
          <StatsSkeleton />
        ) : stats.data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tổng số câu"
              value={number.format(stats.data.total)}
              icon={FileQuestion}
            />
            <StatCard
              label="Cần duyệt"
              value={number.format(stats.data.needsReview)}
              icon={AlertTriangle}
              tone="warning"
            />
            <StatCard
              label="Chưa gán nhãn"
              value={number.format(stats.data.unlabelled)}
              icon={ListTree}
              tone="danger"
            />
            <StatCard
              label="Đáp án chính thức"
              value={number.format(stats.data.byAnswerSource.PUBLISHED_KEY ?? 0)}
              icon={BadgeCheck}
              tone="success"
            />
          </div>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-card-border bg-card-background">
          <FilterToolbar>
            <form
              className="w-full sm:max-w-md"
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
              <FilterSelect
                ariaLabel="Lọc theo môn"
                value={query.subject ?? 'ALL'}
                disabled={stats.status !== 'ready'}
                onChange={(value) =>
                  setQuery((old) => ({
                    ...old,
                    subject: value === 'ALL' ? undefined : value,
                    patternCode: undefined,
                    page: 0,
                  }))
                }
                options={[{ id: 'ALL', label: 'Tất cả môn' }, ...subjectOptions]}
              />
              <FilterSelect
                ariaLabel="Lọc theo dạng câu"
                value={query.patternCode ?? 'ALL'}
                disabled={patterns.status !== 'ready'}
                onChange={(value) =>
                  setQuery((old) => ({
                    ...old,
                    patternCode: value === 'ALL' ? undefined : value,
                    page: 0,
                  }))
                }
                options={[
                  { id: 'ALL', label: 'Tất cả dạng câu' },
                  ...patternOptions.map((p) => ({ id: p.code, label: p.nameVi })),
                ]}
              />
              <FilterSelect
                ariaLabel="Lọc theo năm"
                value={query.year === undefined ? 'ALL' : String(query.year)}
                disabled={stats.status !== 'ready'}
                className="sm:w-36"
                onChange={(value) =>
                  setQuery((old) => ({
                    ...old,
                    year: value === 'ALL' ? undefined : Number(value),
                    page: 0,
                  }))
                }
                options={[
                  { id: 'ALL', label: 'Tất cả năm' },
                  ...years.map((year) => ({ id: year, label: year })),
                ]}
              />
              <FilterSelect
                ariaLabel="Lọc theo nguồn đáp án"
                value={query.answerSource ?? 'ALL'}
                onChange={(value) =>
                  setQuery((old) => ({
                    ...old,
                    answerSource: value === 'ALL' ? undefined : (value as BankAnswerSource),
                    page: 0,
                  }))
                }
                options={[
                  { id: 'ALL', label: 'Mọi nguồn đáp án' },
                  ...BANK_ANSWER_SOURCES.map((id) => ({ id, label: ANSWER_SOURCE_LABELS[id] })),
                ]}
              />
              <FilterSelect
                ariaLabel="Lọc theo tình trạng"
                value={view}
                onChange={(value) => changeView(value as View)}
                options={VIEW_OPTIONS}
              />
            </FilterGroup>
          </FilterToolbar>
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

        <QuestionBankDetail
          id={selectedId}
          patterns={patternList}
          readOnly={readOnly}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            list.reload()
            stats.reload()
          }}
        />
      </ConsoleTabsContent>
    </ConsoleTabs>
  )
}
