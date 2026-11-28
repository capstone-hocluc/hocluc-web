import MascotState from '../../components/common/MascotState'
import ResourceState from '../../components/student/common/ResourceState'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import StudentPageHeader from '../../components/student/layout/StudentPageHeader'
import RoadmapCourseSelector from '../../components/student/roadmap/RoadmapCourseSelector'
import RoadmapNextStepCard from '../../components/student/roadmap/RoadmapNextStepCard'
import RoadmapPhaseCard from '../../components/student/roadmap/RoadmapPhaseCard'
import RoadmapReviewQueue from '../../components/student/roadmap/RoadmapReviewQueue'
import RoadmapSkeleton from '../../components/student/roadmap/RoadmapSkeleton'
import RoadmapWeakSkillsPanel from '../../components/student/roadmap/RoadmapWeakSkillsPanel'
import Notice from '../../components/ui/Notice'
import { useStudentRoadmap } from '../../hooks/useStudentRoadmap'
import styles from './StudentRoadmapPage.module.css'

interface StudentRoadmapPageProps {
  onOpenLesson: (courseId: string, lessonId: string) => void
  onOpenQuiz: (quizId: string) => void
  onOpenCourses: () => void
  onOpenPlacement: () => void
}

export default function StudentRoadmapPage({
  onOpenLesson,
  onOpenQuiz,
  onOpenCourses,
  onOpenPlacement,
}: StudentRoadmapPageProps) {
  const { roadmap, status, errorMessage, reload, selectedCourseId, selectCourse } =
    useStudentRoadmap()


  return (
    <StudentPageContainer width="fluid" spacing="stack" className="pb-8">
      <StudentPageHeader
        title="Lộ trình học"
        className="mb-0"
        actions={
          roadmap && roadmap.enrolledCourses.length > 1 ? (
            <RoadmapCourseSelector
              courses={roadmap.enrolledCourses}
              selectedCourseId={selectedCourseId}
              onSelect={selectCourse}
            />
          ) : undefined
        }
      />

      <ResourceState
        imageSrc="/mascot/03.png"
        status={status}
        errorMessage={errorMessage}
        onRetry={reload}
        loading={<RoadmapSkeleton />}
        forbidden={{ title: 'Bạn chưa có quyền xem lộ trình học' }}
        error={{ title: 'Không thể tải lộ trình học' }}
      />

      {status === 'ready' && roadmap && (
        <>
          {!roadmap.hasEnrolledCourse ? (
            <div className="space-y-5">
              <RoadmapNextStepCard
                nextAction={roadmap.nextAction}
                onOpenLesson={onOpenLesson}
                onOpenQuiz={onOpenQuiz}
                onOpenCourses={onOpenCourses}
                onOpenPlacement={onOpenPlacement}
              />
              <MascotState
                imageSrc="/mascot/03.png"
                title="Bạn chưa đăng ký khóa học nào"
                message="Đăng ký khóa học để xem lộ trình bài học hoặc làm đề đánh giá năng lực."
                actionLabel="Khám phá khóa học"
                onAction={onOpenCourses}
              />
              {(roadmap.weakSkills.length > 0 || roadmap.reviewQueue.length > 0) && (
                <div className="grid gap-5 min-[900px]:grid-cols-2">
                  <RoadmapWeakSkillsPanel weakSkills={roadmap.weakSkills} />
                  <RoadmapReviewQueue
                    items={roadmap.reviewQueue}
                    onOpenLesson={onOpenLesson}
                    onOpenQuiz={onOpenQuiz}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <RoadmapNextStepCard
                nextAction={roadmap.nextAction}
                onOpenLesson={onOpenLesson}
                onOpenQuiz={onOpenQuiz}
                onOpenCourses={onOpenCourses}
                onOpenPlacement={onOpenPlacement}
              />

              <div className={styles.layout}>
                <div className={styles.main}>
                  {roadmap.phases.length === 0 ? (
                    <Notice tone="info">Khóa học này chưa có bài học nào.</Notice>
                  ) : (
                    roadmap.phases.map((phase, index) => (
                      <RoadmapPhaseCard
                        key={phase.phaseId ?? `${phase.name}-${index}`}
                        phase={phase}
                        onOpenLesson={onOpenLesson}
                        onOpenQuiz={onOpenQuiz}
                      />
                    ))
                  )}
                </div>
                <aside className={styles.aside}>
                  <RoadmapWeakSkillsPanel weakSkills={roadmap.weakSkills} />
                  <RoadmapReviewQueue
                    items={roadmap.reviewQueue}
                    onOpenLesson={onOpenLesson}
                    onOpenQuiz={onOpenQuiz}
                  />
                </aside>
              </div>
            </div>
          )}
        </>
      )}
    </StudentPageContainer>
  )
}
