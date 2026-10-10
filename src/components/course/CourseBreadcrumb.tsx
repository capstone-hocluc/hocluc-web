import { ChevronRight } from '../console/icons'

interface CourseBreadcrumbProps {
  courseTitle: string
  onGoHome: () => void
  onGoCatalog: () => void
}

function CourseBreadcrumb({ courseTitle, onGoHome, onGoCatalog }: CourseBreadcrumbProps) {
  return (
    <nav className="hl-cd-breadcrumb" aria-label="Breadcrumb">
      <button type="button" onClick={onGoHome}>
        Trang chủ
      </button>
      <ChevronRight size={14} />
      <button type="button" onClick={onGoCatalog}>
        Khóa học
      </button>
      <ChevronRight size={14} />
      <span className="is-current">{courseTitle}</span>
    </nav>
  )
}

export default CourseBreadcrumb
