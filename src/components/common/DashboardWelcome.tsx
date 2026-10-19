import type { ReactNode } from 'react'
import { ArrowRight } from '../console/icons'
import { ROLE_LABELS } from '../../lib/role-home'
import { buildNavSections } from '../../lib/console-nav'
import type { UserRole } from '../../services/userService'

type PersonnelRole = Exclude<UserRole, 'STUDENT'>

interface DashboardWelcomeProps {
  role: UserRole
  title: string
  description: string
  action?: ReactNode
}

export default function DashboardWelcome({ role, title, description, action }: DashboardWelcomeProps) {
  return (
    <header className="dashboard-welcome">
      <div className="min-w-0">
        <p className="dashboard-role">{ROLE_LABELS[role]}</p>
        <h1>{title}</h1>
        <p className="dashboard-description">{description}</p>
      </div>
      {action && <div className="dashboard-welcome-action">{action}</div>}
    </header>
  )
}

const ROLE_COPY: Record<PersonnelRole, { title: string; description: string }> = {
  ADMINISTRATOR: {
    title: 'Tổng quan hệ thống',
    description: 'Theo dõi tài khoản và truy cập các công cụ quản trị Học Lực.',
  },
  MANAGER: {
    title: 'Tổng quan vận hành',
    description: 'Nắm tình hình khóa học, sắp xếp lịch và theo dõi hoạt động đào tạo.',
  },
  STAFF: {
    title: 'Không gian vận hành',
    description: 'Quản lý học viên, đăng ký học và các công việc hằng ngày.',
  },
  TEACHER: {
    title: 'Không gian giảng dạy',
    description: 'Chuẩn bị bài học, theo dõi lịch dạy và đồng hành cùng lớp của bạn.',
  },
  MENTOR: {
    title: 'Đồng hành cùng học viên',
    description: 'Theo dõi nhóm học, hỗ trợ học viên và xử lý các lời giải đang chờ.',
  },
}

export function RoleDashboardWelcome({ role }: { role: PersonnelRole }) {
  return <DashboardWelcome role={role} {...ROLE_COPY[role]} />
}

const ACTIONS: Record<PersonnelRole, string[]> = {
  ADMINISTRATOR: ['users', 'learners', 'courses', 'orders'],
  MANAGER: ['courses', 'schedules', 'attendance', 'enrollments'],
  STAFF: ['learners', 'enrollments', 'orders', 'schedules'],
  TEACHER: ['courses', 'schedule', 'availability', 'mock-exams'],
  MENTOR: ['groups', 'students', 'solution-queue', 'chat'],
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  users: 'Tài khoản và quyền truy cập',
  learners: 'Thông tin và tài khoản học viên',
  courses: 'Nội dung và thông tin khóa học',
  orders: 'Thanh toán và đối soát đơn hàng',
  schedules: 'Sắp xếp các buổi học',
  schedule: 'Các buổi dạy của bạn',
  attendance: 'Theo dõi tham gia buổi học',
  enrollments: 'Đăng ký và quyền học tập',
  availability: 'Cập nhật thời gian có thể dạy',
  'mock-exams': 'Chuẩn bị và quản lý đề thi',
  groups: 'Các nhóm bạn đang đồng hành',
  students: 'Tiến độ và nhu cầu hỗ trợ',
  'solution-queue': 'Xem và duyệt lời giải',
  chat: 'Trao đổi cùng học viên',
}

export function DashboardActions({ role, onNavigate }: {
  role: PersonnelRole
  onNavigate: (page: string) => void
}) {
  // Use the same filtered navigation as the sidebar: permission and feature flags apply here too.
  const available = buildNavSections(role).flatMap((section) => section.items)
  const actions = ACTIONS[role].flatMap((key) => {
    const item = available.find((entry) => entry.key === key)
    return item ? [item] : []
  })
  if (!actions.length) return null

  return (
    <section className="dashboard-actions" aria-label="Truy cập nhanh">
      <h2>Truy cập nhanh</h2>
      <div className="dashboard-action-grid">
        {actions.map(({ key, title, icon: Icon }) => (
          <button key={key} type="button" className="dashboard-action" onClick={() => onNavigate(key)}>
            <span className="dashboard-action-icon"><Icon size={20} /></span>
            <span className="min-w-0 flex-1">
              <strong>{title}</strong>
              <span className="dashboard-action-description">{ACTION_DESCRIPTIONS[key]}</span>
            </span>
            <ArrowRight size={16} className="shrink-0" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}
