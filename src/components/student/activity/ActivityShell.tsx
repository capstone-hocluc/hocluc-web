import type { ReactNode } from 'react'
import { ArrowLeft, ChevronRight } from '../../console/icons'
import Button from '../../ui/Button'
import StudentPageContainer from '../layout/StudentPageContainer'

interface ActivityShellProps {
  courseTitle: string
  subjectTitle: string
  chapterTitle: string
  onBack: () => void
  children: ReactNode
}

// Page frame: back link, breadcrumb, then the activity content.
function ActivityShell({
  courseTitle,
  subjectTitle,
  chapterTitle,
  onBack,
  children,
}: ActivityShellProps) {
  return (
    <StudentPageContainer className="flex flex-col gap-5 pb-8 text-text-heading max-[760px]:pb-7">
      <Button
        appearance="ghost"
        className="h-auto w-max gap-2 border-0 p-0 text-sm font-extrabold text-primary-text hover:bg-transparent hover:underline"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Quay lại khóa học
      </Button>
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-text-secondary">
        <span>{courseTitle}</span>
        <ChevronRight size={15} />
        <span>{subjectTitle}</span>
        <ChevronRight size={15} />
        <strong className="font-extrabold text-text-heading">{chapterTitle}</strong>
      </div>
      {children}
    </StudentPageContainer>
  )
}

export default ActivityShell
