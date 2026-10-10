import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  CheckCircle2,
  Clock3,
  GraduationCap,
  ListChecks,
  MoreHorizontal,
  ShoppingCart,
  Users,
  Wallet,
} from '../console/icons'
import ListCard from '../console/list-card'
import Page from './screen-page'
import type { Stat } from './screen-page'
import { text } from './screen-columns'
import Status, { type StatusTone } from '../console/status'
import StatCard from '../ui/StatCard'
import { Progress } from '../tailgrids/core/progress'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../tailgrids/core/dropdown'
import {
  AUDIT_LOG,
  BLUEPRINTS,
  ENROLLMENTS,
  GROUPS,
  MENTOR_STUDENTS,
  ORDERS,
  SOLUTION_QUEUE,
  TAXONOMY,
  type ReviewStatus,
} from '../../data/console-mock'

// Màn hình theo vai trò đang chạy bằng dữ liệu mẫu (src/data/console-mock.ts).

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' đ'

const REVIEW_LABELS: Record<ReviewStatus, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' }
const REVIEW_TONES: Record<ReviewStatus, StatusTone> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }

function statusTone(status: string): StatusTone {
  if (['Đang dùng', 'Đã thanh toán', 'Còn hạn'].includes(status)) return 'success'
  if (['Chờ thanh toán', 'Sắp hết hạn', 'Nháp'].includes(status)) return 'warning'
  if (['Đã hủy', 'Hết hạn'].includes(status)) return 'danger'
  return 'neutral'
}

const statusColumn = <T extends { status: string }>(): ColumnDef<T> => ({
  id: 'status',
  header: 'Trạng thái',
  accessorKey: 'status',
  cell: ({ row }) => <Status tone={statusTone(row.original.status)}>{row.original.status}</Status>,
})

const progressColumn = <T extends { progress: number }>(header: string): ColumnDef<T> => ({
  id: 'progress',
  header,
  accessorKey: 'progress',
  cell: ({ row }) => <Progress progress={row.original.progress} withLabel className="min-w-40" />,
})

type Blueprint = (typeof BLUEPRINTS)[number]
type Domain = (typeof TAXONOMY)[number]
type AuditEntry = (typeof AUDIT_LOG)[number]
type Order = (typeof ORDERS)[number]
type Enrollment = (typeof ENROLLMENTS)[number]
type Group = (typeof GROUPS)[number]
type MentorStudent = (typeof MENTOR_STUDENTS)[number]
type SolutionItem = (typeof SOLUTION_QUEUE)[number]

/* ---------- Admin ---------- */

export function AdminBlueprints() {
  const columns = useMemo<ColumnDef<Blueprint>[]>(
    () => [
      text<Blueprint>('name', 'Blueprint', 'font-medium text-text-primary'),
      text<Blueprint>('type', 'Loại đề'),
      text<Blueprint>('questions', 'Số câu'),
      text<Blueprint>('minutes', 'Thời gian (phút)'),
      text<Blueprint>('version', 'Phiên bản'),
      statusColumn<Blueprint>(),
    ],
    []
  )
  return (
    <Page title="Blueprint đề thi">
      <ListCard
        data={BLUEPRINTS}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm blueprint..."
        searchText={(row) => `${row.name} ${row.type}`}
        filter={{ ariaLabel: 'Lọc theo trạng thái', allLabel: 'Tất cả trạng thái', options: ['Đang dùng', 'Nháp'], get: (row) => row.status }}
      />
    </Page>
  )
}

export function AdminTaxonomy() {
  const columns = useMemo<ColumnDef<Domain>[]>(
    () => [
      text<Domain>('domain', 'Lĩnh vực', 'font-medium text-text-primary'),
      text<Domain>('questionTypes', 'Dạng câu'),
      text<Domain>('skills', 'Kỹ năng'),
      text<Domain>('questions', 'Câu hỏi'),
      text<Domain>('version', 'Phiên bản'),
    ],
    []
  )
  return (
    <Page title="Phân loại kiến thức">
      <ListCard
        data={TAXONOMY}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm lĩnh vực..."
        searchText={(row) => row.domain}
      />
    </Page>
  )
}

export function AdminAuditLog() {
  const columns = useMemo<ColumnDef<AuditEntry>[]>(
    () => [
      text<AuditEntry>('time', 'Thời gian'),
      text<AuditEntry>('actor', 'Người thực hiện', 'font-medium text-text-primary'),
      text<AuditEntry>('role', 'Vai trò'),
      text<AuditEntry>('action', 'Hành động'),
      text<AuditEntry>('target', 'Đối tượng'),
    ],
    []
  )
  return (
    <Page title="Nhật ký hoạt động">
      <ListCard
        data={AUDIT_LOG}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm hành động, người dùng..."
        searchText={(row) => `${row.actor} ${row.action} ${row.target}`}
        filter={{ ariaLabel: 'Lọc theo vai trò', allLabel: 'Tất cả vai trò', options: ['Quản trị viên', 'Nhân viên', 'Giáo viên'], get: (row) => row.role }}
      />
    </Page>
  )
}

/* ---------- Staff ---------- */

export function StaffOrders() {
  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      text<Order>('id', 'Mã đơn', 'font-medium text-text-primary'),
      text<Order>('student', 'Học viên'),
      text<Order>('course', 'Khóa học'),
      { id: 'amount', header: 'Số tiền', accessorKey: 'amount', cell: ({ row }) => <span className="whitespace-nowrap">{money(row.original.amount)}</span> },
      statusColumn<Order>(),
      text<Order>('createdAt', 'Ngày tạo'),
    ],
    []
  )
  const paid = ORDERS.filter((order) => order.status === 'Đã thanh toán')
  return (
    <Page
      title="Đơn hàng"
      stats={[
        { label: 'Tổng đơn', value: ORDERS.length, icon: ShoppingCart },
        { label: 'Đã thanh toán', value: paid.length, icon: CheckCircle2, tone: 'success' },
        { label: 'Chờ thanh toán', value: ORDERS.filter((order) => order.status === 'Chờ thanh toán').length, icon: Clock3, tone: 'warning' },
        { label: 'Doanh thu', value: money(paid.reduce((sum, order) => sum + order.amount, 0)), icon: Wallet, tone: 'success' },
      ]}
    >
      <ListCard
        data={ORDERS}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm mã đơn, học viên..."
        searchText={(row) => `${row.id} ${row.student} ${row.course}`}
        filter={{ ariaLabel: 'Lọc theo trạng thái', allLabel: 'Tất cả trạng thái', options: ['Đã thanh toán', 'Chờ thanh toán', 'Đã hủy'], get: (row) => row.status }}
      />
    </Page>
  )
}

export function StaffEnrollments() {
  const columns = useMemo<ColumnDef<Enrollment>[]>(
    () => [
      text<Enrollment>('student', 'Học viên', 'font-medium text-text-primary'),
      text<Enrollment>('course', 'Khóa học'),
      text<Enrollment>('source', 'Nguồn'),
      text<Enrollment>('expiresAt', 'Hạn dùng'),
      statusColumn<Enrollment>(),
    ],
    []
  )
  return (
    <Page title="Ghi danh">
      <ListCard
        data={ENROLLMENTS}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm học viên, khóa học..."
        searchText={(row) => `${row.student} ${row.course}`}
        filter={{ ariaLabel: 'Lọc theo nguồn', allLabel: 'Tất cả nguồn', options: ['Mua online', 'Thủ công'], get: (row) => row.source }}
      />
    </Page>
  )
}

export function StaffGroups() {
  const columns = useMemo<ColumnDef<Group>[]>(
    () => [
      text<Group>('name', 'Nhóm', 'font-medium text-text-primary'),
      text<Group>('course', 'Khóa học'),
      text<Group>('mentor', 'Mentor'),
      text<Group>('students', 'Học viên'),
      progressColumn<Group>('Tiến độ'),
    ],
    []
  )
  return (
    <Page title="Nhóm học">
      <ListCard
        data={GROUPS}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm nhóm, mentor..."
        searchText={(row) => `${row.name} ${row.course} ${row.mentor}`}
      />
    </Page>
  )
}

/* ---------- Duyệt: câu hỏi (staff, teacher) và lời giải AI (mentor) ---------- */

function ReviewMenu({ label, onChange }: { label: string; onChange: (status: ReviewStatus) => void }) {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={label}
          className="grid size-8 place-items-center rounded-md text-icon-tertiary outline-none hover:bg-background-gray-secondary"
        >
          <MoreHorizontal size={18} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onAction={() => onChange('APPROVED')}>Duyệt</DropdownMenuItem>
          <DropdownMenuItem className="text-badge-danger-text" onAction={() => onChange('REJECTED')}>
            Từ chối
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function useReviewState<T extends { id: string; status: ReviewStatus }>(initial: T[]) {
  const [rows, setRows] = useState(initial)
  const setStatus = (id: string, status: ReviewStatus) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)))
  return [rows, setStatus] as const
}

const reviewStatusColumn = <T extends { status: ReviewStatus }>(): ColumnDef<T> => ({
  id: 'status',
  header: 'Trạng thái',
  accessorFn: (row) => REVIEW_LABELS[row.status],
  cell: ({ row }) => <Status tone={REVIEW_TONES[row.original.status]}>{REVIEW_LABELS[row.original.status]}</Status>,
})

const pendingStat = (rows: { status: ReviewStatus }[]): Stat[] => [
  { label: 'Chờ duyệt', value: rows.filter((row) => row.status === 'PENDING').length, icon: Clock3, tone: 'warning' },
  { label: 'Đã duyệt', value: rows.filter((row) => row.status === 'APPROVED').length, icon: CheckCircle2, tone: 'success' },
  { label: 'Từ chối', value: rows.filter((row) => row.status === 'REJECTED').length, icon: ListChecks, tone: 'danger' },
]

/* ---------- Mentor ---------- */

export function MentorOverview({ onNavigate }: { onNavigate: (page: string) => void }) {
  const pending = SOLUTION_QUEUE.filter((item) => item.status === 'PENDING').length
  const cards = [
    { page: 'groups', label: 'Nhóm của tôi', value: GROUPS.length, icon: Users, tone: 'info' as const },
    { page: 'students', label: 'Học viên', value: MENTOR_STUDENTS.length, icon: GraduationCap, tone: 'success' as const },
    { page: 'solution-queue', label: 'Lời giải chờ duyệt', value: pending, icon: Clock3, tone: 'warning' as const },
  ]
  return (
    <Page title="Tổng quan">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ page, ...card }) => (
          <button key={page} type="button" className="text-left" onClick={() => onNavigate(page)}>
            <StatCard className="transition-colors hover:bg-background-gray-secondary" {...card} />
          </button>
        ))}
      </div>
    </Page>
  )
}

export function MentorGroups() {
  const columns = useMemo<ColumnDef<Group>[]>(
    () => [
      text<Group>('name', 'Nhóm', 'font-medium text-text-primary'),
      text<Group>('course', 'Khóa học'),
      text<Group>('students', 'Học viên'),
      progressColumn<Group>('Tiến độ trung bình'),
    ],
    []
  )
  return (
    <Page title="Nhóm của tôi">
      <ListCard
        data={GROUPS}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm nhóm..."
        searchText={(row) => `${row.name} ${row.course}`}
      />
    </Page>
  )
}

export function MentorStudents() {
  const columns = useMemo<ColumnDef<MentorStudent>[]>(
    () => [
      text<MentorStudent>('name', 'Học viên', 'font-medium text-text-primary'),
      text<MentorStudent>('group', 'Nhóm'),
      progressColumn<MentorStudent>('Tiến độ'),
      text<MentorStudent>('lastScore', 'Điểm gần nhất'),
      text<MentorStudent>('weakness', 'Điểm yếu'),
      text<MentorStudent>('lastActive', 'Hoạt động'),
    ],
    []
  )
  return (
    <Page title="Học viên">
      <ListCard
        data={MENTOR_STUDENTS}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm học viên..."
        searchText={(row) => `${row.name} ${row.weakness}`}
        filter={{ ariaLabel: 'Lọc theo nhóm', allLabel: 'Tất cả nhóm', options: ['Nhóm A1', 'Nhóm A2', 'Nhóm B1', 'Nhóm C1'], get: (row) => row.group }}
      />
    </Page>
  )
}

export function MentorSolutionQueue() {
  const [rows, setStatus] = useReviewState(SOLUTION_QUEUE)
  const columns = useMemo<ColumnDef<SolutionItem>[]>(
    () => [
      { id: 'question', header: 'Câu hỏi', accessorKey: 'question', cell: ({ row }) => <span className="block max-w-96 truncate font-medium text-text-primary">{row.original.question}</span> },
      text<SolutionItem>('domain', 'Lĩnh vực'),
      text<SolutionItem>('student', 'Học viên hỏi'),
      text<SolutionItem>('confidence', 'Độ tin cậy AI'),
      text<SolutionItem>('submittedAt', 'Gửi lúc'),
      reviewStatusColumn<SolutionItem>(),
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => <ReviewMenu label={`Duyệt lời giải ${row.original.id}`} onChange={(status) => setStatus(row.original.id, status)} />,
      },
    ],
    [setStatus]
  )
  return (
    <Page title="Duyệt lời giải AI" stats={pendingStat(rows)}>
      <ListCard
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        searchPlaceholder="Tìm câu hỏi, học viên..."
        searchText={(row) => `${row.question} ${row.student}`}
        filter={{ ariaLabel: 'Lọc theo trạng thái', allLabel: 'Tất cả trạng thái', options: Object.values(REVIEW_LABELS), get: (row) => REVIEW_LABELS[row.status] }}
      />
    </Page>
  )
}
