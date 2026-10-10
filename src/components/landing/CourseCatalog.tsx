import { useEffect, useMemo, useState } from 'react'
import { Search } from '../console/icons'
import { getMainCourses, type Course } from '../../services/courseService'
import { getErrorMessage } from '../../lib/errors'
import CourseCard from './CourseCard'
import DropdownField from '../ui/DropdownField'

function prettifyEnum(value?: string) {
  if (!value) return ''
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function uniqueSorted(values: (string | undefined)[]) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort()
}

type CatalogTab = 'main' | 'support'

interface CourseCatalogProps {
  onOpenCourse: (course: Course) => void
}

function CourseCatalog({ onOpenCourse }: CourseCatalogProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<CatalogTab>('main')
  const [examFilter, setExamFilter] = useState('all')
  const [trackFilter, setTrackFilter] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getMainCourses()
      .then((response) => {
        if (cancelled) return
        setCourses(response.data || [])
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setErrorMessage(getErrorMessage(error))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const retry = () => {
    setStatus('loading')
    setReloadKey((current) => current + 1)
  }

  const examOptions = useMemo(() => uniqueSorted(courses.map((c) => c.targetExam)), [courses])
  const trackOptions = useMemo(() => uniqueSorted(courses.map((c) => c.track)), [courses])

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return courses.filter((course) => {
      const matchesQuery =
        !normalizedQuery ||
        course.title.toLowerCase().includes(normalizedQuery) ||
        (course.description || '').toLowerCase().includes(normalizedQuery)
      const matchesExam = examFilter === 'all' || course.targetExam === examFilter
      const matchesTrack = trackFilter === 'all' || course.track === trackFilter
      return matchesQuery && matchesExam && matchesTrack
    })
  }, [courses, query, examFilter, trackFilter])

  const isMain = tab === 'main'

  return (
    <section className="hl-catalog-section">
      <div className="hl-catalog-container">
        <header className="hl-catalog-header">
          <h1>Khám phá khóa học</h1>
          <p>Chọn khóa học theo kỳ thi mục tiêu và bắt đầu lộ trình ôn luyện ngay hôm nay.</p>
        </header>

        <div className="hl-catalog-topbar">
          <div className="hl-catalog-tabs" role="tablist" aria-label="Loại khóa học">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'main'}
              className={tab === 'main' ? 'is-active' : ''}
              onClick={() => setTab('main')}
            >
              Khóa học chính
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'support'}
              className={tab === 'support' ? 'is-active' : ''}
              onClick={() => setTab('support')}
            >
              Khóa học bổ trợ
            </button>
          </div>

          <div className="hl-catalog-filters">
            {examOptions.length > 0 && (
              <DropdownField
                ariaLabel="Kỳ thi"
                className="hl-catalog-dropdown w-auto"
                options={[
                  { id: 'all', label: 'Tất cả kỳ thi' },
                  ...examOptions.map((option) => ({ id: option, label: prettifyEnum(option) })),
                ]}
                value={examFilter}
                onChange={(value) => {
                  if (value !== null) setExamFilter(value)
                }}
              />
            )}

            {trackOptions.length > 0 && (
              <DropdownField
                ariaLabel="Lộ trình"
                className="hl-catalog-dropdown w-auto"
                options={[
                  { id: 'all', label: 'Tất cả lộ trình' },
                  ...trackOptions.map((option) => ({ id: option, label: prettifyEnum(option) })),
                ]}
                value={trackFilter}
                onChange={(value) => {
                  if (value !== null) setTrackFilter(value)
                }}
              />
            )}
          </div>

          <label className="hl-catalog-search">
            <Search size={17} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm khóa học"
            />
          </label>
        </div>

        <article className="hl-catalog-panel">
          <div className="hl-catalog-group-head">
            <h2>{isMain ? 'Khóa học chính' : 'Khóa học bổ trợ'}</h2>
            {isMain && status === 'ready' && <span>{filteredCourses.length} khóa học</span>}
          </div>

          {!isMain && (
            <div className="hl-catalog-state">
              <img src="/owl-mascot4.png" alt="" aria-hidden="true" />
              <strong>Khóa học bổ trợ sắp ra mắt</strong>
              <p>Các khóa học bổ trợ sẽ sớm có mặt tại đây.</p>
            </div>
          )}

          {isMain && status === 'loading' && (
            <div className="hl-catalog-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="hl-catalog-skeleton" key={index} aria-hidden="true" />
              ))}
            </div>
          )}

          {isMain && status === 'error' && (
            <div className="hl-catalog-state">
              <img src="/owl-mascot4.png" alt="" aria-hidden="true" />
              <strong>Không thể tải danh sách khóa học</strong>
              <p>{errorMessage}</p>
              <button type="button" onClick={retry}>
                Thử lại
              </button>
            </div>
          )}

          {isMain && status === 'ready' && filteredCourses.length === 0 && (
            <div className="hl-catalog-state">
              <img src="/owl-mascot4.png" alt="" aria-hidden="true" />
              <strong>Không tìm thấy khóa học</strong>
              <p>Thử thay đổi từ khóa hoặc bộ lọc của bạn.</p>
            </div>
          )}

          {isMain && status === 'ready' && filteredCourses.length > 0 && (
            <div className="hl-catalog-grid">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} onOpen={onOpenCourse} />
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

export default CourseCatalog
