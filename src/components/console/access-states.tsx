import { Clock3, LockKeyhole } from './icons'
import PageHeading from './page-heading'

function StateCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock3
  title: string
  children: string
}) {
  return (
    <div className="rounded-xl border border-card-border bg-card-background px-5 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-badge-blue-background text-badge-blue-text">
        <Icon size={22} aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-medium text-text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-tertiary">{children}</p>
    </div>
  )
}

/** Shown instead of a console screen the active role is not allowed to open. */
export function ForbiddenPage() {
  return (
    <section className="space-y-5">
      <PageHeading title="Không có quyền truy cập" />
      <StateCard icon={LockKeyhole} title="403 · Không có quyền truy cập">
        Vai trò đang dùng không được mở trang này. Chọn một mục trong menu, hoặc chuyển vai trò ở
        góc trên nếu tài khoản có vai trò khác.
      </StateCard>
    </section>
  )
}

/** A menu entry whose screen is not built yet. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <section className="space-y-5">
      <PageHeading title={title} />
      <StateCard icon={Clock3} title="Đang phát triển">
        Màn hình này đã có trong kế hoạch nhưng chưa được xây dựng.
      </StateCard>
    </section>
  )
}
