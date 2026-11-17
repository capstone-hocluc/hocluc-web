import { useState } from 'react'
import ResourceState from '../common/ResourceState'
import MascotState from '../../common/MascotState'
import Skeleton from '../../ui/Skeleton'
import Button from '../../ui/Button'
import { Tabs, TabsList, TabsTrigger } from '../../ui/Tabs'
import { ChevronLeft, ChevronRight, RefreshCw } from '../../console/icons'
import { usePageResource } from '../../../hooks/usePageResource'
import { getCourseLiveClasses } from '../../../services/courseService'
import CourseLiveClassCard from './CourseLiveClassCard'
import styles from './CourseStudyAppearance.module.css'
import cardStyles from './CourseExams.module.css'

type LiveView = 'all' | 'upcoming' | 'past'
const PAGE_SIZE = 6

function CourseLiveClassesTab({ courseId }: { courseId: string }) {
  const [view, setView] = useState<LiveView>(() => {
    const value = new URLSearchParams(window.location.search).get('liveView')
    return value === 'upcoming' || value === 'past' ? value : 'all'
  })
  const [page, setPage] = useState(() => {
    const value = Number(new URLSearchParams(window.location.search).get('livePage'))
    return Number.isSafeInteger(value) && value > 0 ? value : 1
  })
  const { data, status, errorMessage, reload } = usePageResource(() => getCourseLiveClasses(courseId), [courseId])

  const upcoming = [...new Map((data?.upcoming ?? []).map(item => [item.id, item])).values()]
  const knownIds = new Set([...upcoming, ...(data?.past ?? [])].map(item => item.id))
  if (data?.next && !knownIds.has(data.next.id)) upcoming.unshift(data.next)
  const upcomingIds = new Set(upcoming.map(item => item.id))
  const past = [...new Map((data?.past ?? []).filter(item => !upcomingIds.has(item.id)).map(item => [item.id, item])).values()]
  const all = [...upcoming.map(item => ({ item, past: false })), ...past.map(item => ({ item, past: true }))]
  const filtered = all.filter(entry => view === 'all' || (view === 'past' ? entry.past : !entry.past))
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const updateView = (nextView: LiveView, nextPage: number) => {
    setView(nextView)
    setPage(nextPage)
    const search = new URLSearchParams(window.location.search)
    if (nextView === 'all') search.delete('liveView')
    else search.set('liveView', nextView)
    if (nextPage === 1) search.delete('livePage')
    else search.set('livePage', String(nextPage))
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search.size ? `?${search}` : ''}${window.location.hash}`)
  }

  if (status !== 'ready' || !data) {
    return <ResourceState imageSrc="/mascot/03.png" status={status} errorMessage={errorMessage} onRetry={reload}
      loading={<div className={cardStyles.grid} aria-label="Đang tải lịch học trực tuyến">{[0, 1, 2].map(index => <Skeleton key={index} className="h-64 rounded-2xl" />)}</div>}
      forbidden={{ title: 'Bạn chưa có quyền tham gia lớp học của khóa này', message: 'Quyền xem nội dung khóa học có thể khác với quyền tham gia lớp trực tuyến.' }}
      notFound={{ title: 'Không tìm thấy lịch học của khóa này' }}
      error={{ title: 'Không thể tải lịch học trực tuyến' }} />
  }

  return (
    <section aria-label="Lịch học trực tuyến của khóa học">
      <div className={cardStyles.toolbar}>
        <Tabs value={view} onValueChange={value => updateView(value as LiveView, 1)}>
          <TabsList aria-label="Lọc lớp học trực tuyến" className={cardStyles.filters}>
            <TabsTrigger value="all">Tất cả <span>{all.length}</span></TabsTrigger>
            <TabsTrigger value="upcoming">Sắp tới <span>{upcoming.length}</span></TabsTrigger>
            <TabsTrigger value="past">Đã qua <span>{past.length}</span></TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary" aria-live="polite">{filtered.length} buổi học</span>
          <Button appearance="outline" size="icon" aria-label="Tải lại lịch học trực tuyến" onClick={reload}><RefreshCw size={16} /></Button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <MascotState imageSrc="/mascot/03.png" className={styles.emptyState}
          title={all.length === 0 ? 'Chưa có lịch học trực tuyến' : view === 'past' ? 'Chưa có buổi học đã qua' : 'Chưa có buổi học sắp tới'}
          message={all.length === 0 ? 'Khóa học này hiện chưa có buổi học trực tuyến nào.' : 'Bạn có thể chọn tab khác để xem các buổi học còn lại.'} />
      ) : (
        <div role="list" aria-label="Danh sách lớp học trực tuyến" className={cardStyles.grid}>
          {visible.map(({ item, past: isPast }) => <CourseLiveClassCard key={item.id} item={item} past={isPast} next={data.next?.id === item.id} />)}
        </div>
      )}
      {pages > 1 && <nav className={cardStyles.pagination} aria-label="Phân trang lớp học trực tuyến">
        <span aria-live="polite">Trang {currentPage}/{pages}</span>
        <Button appearance="outline" size="icon" aria-label="Trang lớp học trước" disabled={currentPage === 1} onClick={() => updateView(view, currentPage - 1)}><ChevronLeft size={18} /></Button>
        <Button appearance="outline" size="icon" aria-label="Trang lớp học sau" disabled={currentPage === pages} onClick={() => updateView(view, currentPage + 1)}><ChevronRight size={18} /></Button>
      </nav>}
    </section>
  )
}

export default CourseLiveClassesTab