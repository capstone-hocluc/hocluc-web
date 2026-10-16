import CourseCatalog from '../components/landing/CourseCatalog'
import { PublicFooter, PublicHeader } from '../components/landing-page/PublicChrome'
import type { Course } from '../services/courseService'

interface CourseCatalogPageProps {
  onOpenCourse: (course: Course) => void
}

function CourseCatalogPage({ onOpenCourse }: CourseCatalogPageProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <PublicHeader />
      <CourseCatalog onOpenCourse={onOpenCourse} />
      <PublicFooter />
    </div>
  )
}

export default CourseCatalogPage
