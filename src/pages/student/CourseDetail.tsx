import { useState } from 'react'
import { getActivityRouteType, getStudentCourseDetail } from '../../data/courseLookup'
import { useTransientMessage } from '../../hooks/useTransientMessage'
import StudentToast from '../../components/student/common/StudentToast'
import MascotState from '../../components/common/MascotState'
import ActivityRow from '../../components/student/course-detail/ActivityRow'
import { getActivityMessage } from '../../components/student/course-detail/activityUtils'
import CourseHero from '../../components/student/course-detail/CourseHero'
import {
  ActivityList,
  BlockList,
  CurriculumBlock,
  CurriculumCard,
  CurriculumHead,
  CurriculumIndex,
  CurriculumProgress,
} from '../../components/student/course-detail/CurriculumBlocks'
import type { CourseActivity } from '../../components/student/course-detail/types'
import StudentPageContainer from '../../components/student/layout/StudentPageContainer'
import Card from '../../components/ui/Card'

interface ActivityHandlers {
  onAction: (message: string) => void
  onOpenActivity: (activity: CourseActivity) => void
}

function ChapterAccordion({ chapter, index, open, onToggle, bare, onAction, onOpenActivity }) {
  return (
    <CurriculumBlock tone="chapter" bare={bare}>
      <CurriculumHead
        level="chapter"
        expanded={open}
        onToggle={onToggle}
        label={`${String(index + 1).padStart(2, '0')} · ${chapter.title.replace(/^Chương \d+ - /, '')}`}
        value={`${chapter.completed}/${chapter.total}`}
      />
      {open && (
        <ActivityList>
          {chapter.activities.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              onAction={onAction}
              onOpenActivity={onOpenActivity}
            />
          ))}
        </ActivityList>
      )}
    </CurriculumBlock>
  )
}

function CurriculumSection({
  section,
  index,
  openState,
  toggle,
  onAction,
  onOpenActivity,
}: ActivityHandlers & { section; index: number; openState; toggle }) {
  const sectionOpen = openState.sections.includes(section.id)

  return (
    <CurriculumCard>
      <CurriculumHead
        level="section"
        expanded={sectionOpen}
        onToggle={() => toggle('sections', section.id)}
        label={
          <>
            <CurriculumIndex>{String(index + 1).padStart(2, '0')}</CurriculumIndex>
            {section.title.replace(/^Phần \d+ - /, 'PHẦN ' + (index + 1) + ' · ').toUpperCase()}
          </>
        }
        caption={section.summary}
        value={`${section.progress}%`}
      />
      <CurriculumProgress value={section.progress} />

      {sectionOpen && (
        <BlockList>
          {section.groups.map((group) => {
            const groupOpen = openState.groups.includes(group.id)
            return (
              <CurriculumBlock key={group.id}>
                <CurriculumHead
                  level="group"
                  expanded={groupOpen}
                  onToggle={() => toggle('groups', group.id)}
                  label={group.title}
                  caption={`${group.questionCount} câu`}
                  value={`${group.progress}%`}
                />
                <CurriculumProgress value={group.progress} />

                {groupOpen && (
                  <BlockList>
                    {group.chapters.map((chapter, chapterIndex) => (
                      <ChapterAccordion
                        key={chapter.id}
                        chapter={chapter}
                        index={chapterIndex}
                        open={openState.chapters.includes(chapter.id)}
                        onToggle={() => toggle('chapters', chapter.id)}
                        bare={false}
                        onAction={onAction}
                        onOpenActivity={onOpenActivity}
                      />
                    ))}
                  </BlockList>
                )}
              </CurriculumBlock>
            )
          })}
        </BlockList>
      )}
    </CurriculumCard>
  )
}

function FullMockTests({
  course,
  open,
  onToggle,
  onAction,
  onOpenActivity,
}: ActivityHandlers & { course; open: boolean; onToggle: () => void }) {
  return (
    <CurriculumCard className="mt-0.5 bg-linear-to-b from-surface to-surface-tint">
      <CurriculumHead
        level="section"
        expanded={open}
        onToggle={onToggle}
        label={
          <>
            <CurriculumIndex>04</CurriculumIndex>
            LUYỆN ĐỀ TỔNG HỢP
          </>
        }
        caption="Full ĐGNL Mock Tests"
        value={`${course.fullMockTests.filter((item) => item.status === 'completed').length}/${course.fullMockTests.length}`}
      />
      {open && (
        <ActivityList>
          {course.fullMockTests.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              onAction={onAction}
              onOpenActivity={onOpenActivity}
            />
          ))}
        </ActivityList>
      )}
    </CurriculumCard>
  )
}

function SupplementaryCurriculum({
  course,
  openState,
  toggle,
  onAction,
  onOpenActivity,
}: ActivityHandlers & { course; openState; toggle }) {
  return (
    <>
      {course.chapters.map((chapter, index) => (
        <CurriculumCard key={chapter.id}>
          <ChapterAccordion
            chapter={chapter}
            index={index}
            open={openState.chapters.includes(chapter.id)}
            onToggle={() => toggle('chapters', chapter.id)}
            bare
            onAction={onAction}
            onOpenActivity={onOpenActivity}
          />
          <CurriculumProgress value={chapter.progress} className="mt-2.5" />
        </CurriculumCard>
      ))}
      <CurriculumCard className="mt-0.5 bg-linear-to-b from-surface to-surface-tint">
        <CurriculumHead
          level="section"
          expanded={openState.finalTest}
          onToggle={() => toggle('finalTest')}
          label={
            <>
              <CurriculumIndex>
                {String(course.chapters.length + 1).padStart(2, '0')}
              </CurriculumIndex>
              MOCK TEST
            </>
          }
          caption={`${course.finalTest.questionCount} câu · ${course.finalTest.duration}`}
          value={course.finalTest.status === 'completed' ? '1/1' : '0/1'}
        />
        {openState.finalTest && (
          <ActivityList>
            <ActivityRow
              activity={course.finalTest}
              onAction={onAction}
              onOpenActivity={onOpenActivity}
            />
          </ActivityList>
        )}
      </CurriculumCard>
    </>
  )
}

function CourseDetail({ courseId, onBack, onOpenActivity }) {
  const courseEntry = getStudentCourseDetail(courseId)
  const currentChapterId =
    courseEntry?.kind === 'supplementary' ? courseEntry.data.currentChapterId : 'reading-vietnamese'
  const [openState, setOpenState] = useState(() => ({
    sections: ['part-language'],
    groups: ['vietnamese'],
    chapters: [currentChapterId],
    fullMock: false,
    finalTest: false,
  }))
  const { message, show: showMessage } = useTransientMessage(2400)
  const course = courseEntry?.data || null
  const isSupplementary = courseEntry?.kind === 'supplementary'

  const openActivity = (activity: CourseActivity) => {
    const routeType = getActivityRouteType(activity)
    if (!routeType) {
      showMessage(getActivityMessage(activity))
      return
    }

    onOpenActivity?.(course.id, routeType, activity.id)
  }

  const toggle = (level, id?) => {
    if (level === 'finalTest') {
      setOpenState((current) => ({ ...current, finalTest: !current.finalTest }))
      return
    }

    setOpenState((current) => ({
      ...current,
      [level]: current[level].includes(id)
        ? current[level].filter((item) => item !== id)
        : [...current[level], id],
    }))
  }

  if (!course) {
    return (
      <StudentPageContainer>
        <Card padding="lg" radius="xl">
          <MascotState
            title="Không tìm thấy khóa học"
            message="Khóa học này không tồn tại hoặc chưa được thêm vào."
            actionLabel="Quay lại Khóa học của tôi"
            onAction={onBack}
          />
        </Card>
      </StudentPageContainer>
    )
  }

  return (
    <StudentPageContainer className="flex flex-col gap-6 pb-8 text-text-heading max-[760px]:pb-7">
      <CourseHero
        subject={course.subject || 'ĐGNL'}
        title={course.title}
        description={course.description}
        instructor={course.instructor}
        contentCount={course.totalContent || course.totalLessons}
        completedCount={course.completedContent || course.completedLessons}
        progress={course.progress}
        onBack={onBack}
        onContinue={() => showMessage('Trình phát video đang được phát triển.')}
      />

      <main className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4 max-[760px]:flex-col max-[760px]:items-start">
          <h2 className="text-2xl leading-normal font-bold tracking-[-0.3px] text-text-heading">
            Nội dung khóa học
          </h2>
          <p className="max-w-[560px] text-right text-sm leading-[1.45] font-semibold text-text-secondary max-[760px]:max-w-none max-[760px]:text-left">
            Học tuần tự từ phần đang mở, hoàn thành từng hoạt động để mở khóa các bài tiếp theo.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {isSupplementary ? (
            <SupplementaryCurriculum
              course={course}
              openState={openState}
              toggle={toggle}
              onAction={showMessage}
              onOpenActivity={openActivity}
            />
          ) : (
            <>
              {course.sections.map((section, index) => (
                <CurriculumSection
                  key={section.id}
                  section={section}
                  index={index}
                  openState={openState}
                  toggle={toggle}
                  onAction={showMessage}
                  onOpenActivity={openActivity}
                />
              ))}
              <FullMockTests
                course={course}
                open={openState.fullMock}
                onToggle={() =>
                  setOpenState((current) => ({ ...current, fullMock: !current.fullMock }))
                }
                onAction={showMessage}
                onOpenActivity={openActivity}
              />
            </>
          )}
        </div>
      </main>

      <StudentToast message={message} />
    </StudentPageContainer>
  )
}

export default CourseDetail
