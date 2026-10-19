import ResourceState from '../common/ResourceState'
import MascotState from '../../common/MascotState'
import Card, { CardTitle } from '../../ui/Card'
import Skeleton from '../../ui/Skeleton'
import NextLiveClassCard from './NextLiveClassCard'
import LiveClassRow from './LiveClassRow'
import { usePageResource } from '../../../hooks/usePageResource'
import { getCourseLiveClasses, type CourseLiveClasses } from '../../../services/courseService'

interface CourseLiveClassesTabProps {
  courseId: string
}

function LiveClassSection({
  title,
  items,
  emptyText,
}: {
  title: string
  items: CourseLiveClasses['upcoming']
  emptyText: string
}) {
  return (
    <Card as="section" padding="lg" radius="xl">
      <CardTitle className="text-xl">{title}</CardTitle>
      {items.length > 0 ? (
        <div className="flex flex-col">
          {items.map((item) => (
            <LiveClassRow key={item.id} liveClass={item} />
          ))}
        </div>
      ) : (
        <p className="text-[15px] font-semibold text-text-secondary">{emptyText}</p>
      )}
    </Card>
  )
}

function CourseLiveClassesTab({ courseId }: CourseLiveClassesTabProps) {
  const { data, status, errorMessage, reload } = usePageResource(
    () => getCourseLiveClasses(courseId),
    [courseId],
    { forbidden: false, notFound: false }
  )

  if (status !== 'ready' || !data) {
    return (
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <div className="flex flex-col gap-5">
            <Skeleton className="h-40" />
            <Skeleton className="h-[220px]" />
          </div>
        }
        error={{ title: 'Không thể tải lịch học trực tuyến' }}
      />
    )
  }

  const hasAny = Boolean(data.next) || data.upcoming.length > 0 || data.past.length > 0

  if (!hasAny) {
    return (
      <MascotState
        title="Chưa có lịch học trực tuyến"
        message="Khóa học này hiện chưa có buổi học trực tuyến nào."
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {data.next && <NextLiveClassCard liveClass={data.next} />}
      <LiveClassSection
        title="Lịch sắp tới"
        items={data.upcoming}
        emptyText="Chưa có buổi học nào sắp diễn ra."
      />
      <LiveClassSection
        title="Buổi học đã qua"
        items={data.past}
        emptyText="Chưa có buổi học nào đã diễn ra."
      />
    </div>
  )
}

export default CourseLiveClassesTab
