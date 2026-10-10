import { Eye } from '../../components/console/icons'
import PlacementResultSummary from '../../components/assessment/PlacementResultSummary'
import CourseCard from '../../components/landing/CourseCard'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Button from '../../components/ui/Button'
import Card, { CardTitle } from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { usePageResource } from '../../hooks/usePageResource'
import { getPlacementAttemptHistory, getPlacementResult } from '../../services/assessmentService'
import { getSuggestedCourses, type Course } from '../../services/courseService'

interface PlacementResultPageProps {
  onOpenReview: (attemptId: string) => void
  onOpenCourse: (course: Course) => void
}

function PlacementResultPage({ onOpenReview, onOpenCourse }: PlacementResultPageProps) {
  const { data, status, errorMessage, reload } = usePageResource(
    async () => {
      const [result, history, suggestedResponse] = await Promise.all([
        getPlacementResult(),
        // The result contract has no attemptId of its own - the most recently
        // submitted placement attempt (from the confirmed history endpoint) is
        // used to link to Review instead of guessing that result.id means
        // something it isn't confirmed to mean.
        getPlacementAttemptHistory(),
        getSuggestedCourses().catch(() => ({ data: [] as Course[] })),
      ])
      const submitted = history
        .filter((attempt) => attempt.status !== 'IN_PROGRESS')
        .sort((a, b) => {
          const aTime = new Date(a.submittedAt || a.startedAt).getTime()
          const bTime = new Date(b.submittedAt || b.startedAt).getTime()
          return bTime - aTime
        })
      return {
        result,
        latestAttemptId: submitted[0]?.attemptId || null,
        suggestedCourses: suggestedResponse.data || [],
      }
    },
    [],
    { forbidden: false, notFound: false }
  )

  return (
    <StudentPageContainer width="reading" spacing="stack">
      <ResourceState
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={
          <>
            <Skeleton className="h-[220px] rounded-2xl" />
            <Skeleton className="h-[220px] rounded-2xl" />
          </>
        }
        error={{ title: 'Không thể tải kết quả bài kiểm tra đầu vào.' }}
      />

      {status === 'ready' && data && (
        <>
          <PlacementResultSummary result={data.result} />

          {data.latestAttemptId && (
            <Button
              shape="pill"
              className="h-[46px] self-start px-[26px] text-sm font-extrabold"
              onClick={() => onOpenReview(data.latestAttemptId as string)}
            >
              <Eye size={16} />
              Xem lại đáp án
            </Button>
          )}

          {data.suggestedCourses.length > 0 && (
            <Card as="section" padding="none" radius="lg" className="border-border-subtle p-[22px]">
              <CardTitle className="mb-3.5 text-base">Khóa học đề xuất cho bạn</CardTitle>
              <div className="hl-catalog-grid mt-1">
                {data.suggestedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} onOpen={onOpenCourse} />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </StudentPageContainer>
  )
}

export default PlacementResultPage
